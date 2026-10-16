import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listCommands } from "../../src/commands/index.js";
import { toJSONSchema } from "../../src/schema/json-schema.js";
import { paymentsDoc } from "../helpers.js";
import { EXAMPLE, cli, workspace } from "./helpers.js";

/** Write a JSON value into a fresh workspace and return its path. */
async function saved(value, name = "doc.json") {
  const path = join(await workspace(), name);
  await writeFile(path, typeof value === "string" ? value : JSON.stringify(value));
  return path;
}

describe("validate", () => {
  it.each(["payments.sttw", "payments.statewright.json", "payments.json"])("reads a document named %s", async name => {
    const run = await cli(["validate", await saved(await readFile(EXAMPLE, "utf8"), name), "--json"]);
    expect(run.code).toBe(0);
    expect(run.json()).toMatchObject({ ok: true, errors: [] });
  });

  it("prints the Problems of a valid document and exits 0 without errors", async () => {
    const run = await cli(["validate", EXAMPLE]);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain("machine.stuck");
    expect(run.stdout.endsWith("0 errors · 0 warnings · 14 incomplete\n")).toBe(true);
    const json = (await cli(["validate", EXAMPLE, "--json"])).json();
    expect(json).toMatchObject({
      ok: true,
      migrations: [],
      errors: [],
      summary: { error: 0, warning: 0, incomplete: 14 }
    });
    expect(json.problems).toHaveLength(14);
  });

  it("exits 1 when the document has errors", async () => {
    const doc = paymentsDoc();
    doc.canvases.cnv_expiryClock.edges.edg_runningPaused.on = ["evt_missing"];
    const run = await cli(["validate", await saved(doc)]);
    expect(run.code).toBe(1);
    expect(run.stdout).toMatch(/error\s+ref\.dangling\s+edg_runningPaused/);
  });

  it("exits 1 with the schema errors of an invalid document", async () => {
    const doc = paymentsDoc();
    doc.canvases.cnv_runtime.colour = "red";
    const run = await cli(["validate", await saved(doc), "--json"]);
    expect(run.code).toBe(1);
    expect(run.json()).toMatchObject({
      ok: false,
      errors: [{ path: "/canvases/cnv_runtime", message: "Unrecognized key(s): colour" }],
      problems: []
    });
    expect((await cli(["validate", await saved("{ not json")])).code).toBe(1);
  });
});

describe("verify", () => {
  it("reports each scope and exits 1 only with --strict when something changed", async () => {
    expect((await cli(["verify", EXAMPLE])).stdout).toBe("content     ok\nannotations ok\nlayout      ok\n");
    const doc = paymentsDoc();
    doc.project.name = "Edited by hand";
    const path = await saved(doc);
    const run = await cli(["verify", path, "--json"]);
    expect(run.code).toBe(0);
    expect(run.json().signature).toEqual({ content: "changed", annotations: "ok", layout: "ok" });
    expect((await cli(["verify", path, "--strict"])).code).toBe(1);
  });

  it("reads files that start with a byte order mark", async () => {
    const path = await saved(`\uFEFF${await readFile(EXAMPLE, "utf8")}`);
    expect((await cli(["verify", path, "--strict"])).code).toBe(0);
    expect((await cli(["validate", path])).code).toBe(0);
  });

  it("reports unsigned documents as missing and refuses what is not JSON", async () => {
    const doc = paymentsDoc();
    delete doc.signature;
    const run = await cli(["verify", await saved(doc), "--strict"]);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain("content     missing");
    expect((await cli(["verify", await saved("[")])).code).toBe(2);
  });
});

describe("inspect", () => {
  it("prints the levels of a document", async () => {
    const run = await cli(["inspect", EXAMPLE]);
    expect(run.code).toBe(0);
    expect(run.stdout).toContain("  nod_lifecycleEngine → cnv_lifecycle  Lifecycle engine  [machine]\n");
    expect((await cli(["inspect", EXAMPLE, "--json"])).json().hierarchy.root.canvas).toBe("cnv_runtime");
  });

  it("prints one element with its level and usages", async () => {
    const json = (await cli(["inspect", EXAMPLE, "nod_paused", "--json"])).json();
    expect(json.element).toMatchObject({ id: "nod_paused", type: "node", canvas: "cnv_expiryClock" });
    expect(json.path.at(-1)).toEqual({
      canvas: "cnv_expiryClock",
      via: "nod_expiryClock",
      definition: "def_expiryClock"
    });
    expect(json.usages.map(usage => usage.source)).toEqual([
      "edg_pausedRunning",
      "edg_pausedStopped",
      "edg_runningPaused"
    ]);
    expect((await cli(["inspect", EXAMPLE, "nod_nothing"])).code).toBe(2);
  });
});

describe("schema, commands and guide", () => {
  it("prints the JSON Schema", async () => {
    expect(JSON.parse((await cli(["schema"])).stdout)).toEqual(toJSONSchema());
    const withId = JSON.parse((await cli(["schema", "--base-url", "https://example.com"])).stdout);
    expect(withId.$id).toBe("https://example.com/schema/1.4.json");
  });

  it("lists the document commands", async () => {
    const run = await cli(["commands"]);
    expect(run.stdout).toContain("node.add  canvas, node, id?, at?\n");
    expect((await cli(["commands", "--json"])).json().commands).toEqual(listCommands());
    expect((await cli(["commands", "edge.add", "--json"])).json().command.type).toBe("edge.add");
    expect((await cli(["commands", "edge.paint"])).code).toBe(2);
  });

  it("prints the guide shipped with the package", async () => {
    const readme = await readFile(new URL("../../README.md", import.meta.url), "utf8");
    expect((await cli(["guide"])).stdout).toBe(readme);
  });

  it("prints one section of the guide, by its ID or title (AI interface plan A5)", async () => {
    const run = await cli(["guide", "ai-agents-start-here"]);
    expect(run.code).toBe(0);
    expect(run.stdout).toMatch(/^## AI agents: start here\n/);
    expect(run.stdout).not.toContain("\n## What Statewright is for\n");
    expect((await cli(["guide", "Rules for AI agents"])).stdout).toMatch(/^## Rules for AI agents\n[\s\S]*\n$/);
    expect((await cli(["guide", "start here", "--json"])).json()).toMatchObject({
      ok: true,
      id: "ai-agents-start-here",
      title: "AI agents: start here"
    });
    const missing = await cli(["guide", "billing"]);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toMatch(
      /^statewright: The guide has no section "billing"\. Its sections: ai-agents-start-here, /
    );
  });
});
