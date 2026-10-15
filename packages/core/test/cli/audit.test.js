import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { stringify } from "../../src/serialize/stringify.js";
import { EXAMPLE, cli, workspace } from "./helpers.js";

describe("statewright audit (AI interface spec §8)", () => {
  it("prints the audit as Markdown: Problems, scenarios and coverage", async () => {
    const { code, stdout } = await cli(["audit", EXAMPLE]);
    expect(code).toBe(0);
    expect(stdout.startsWith("# Audit of Payments\n")).toBe(true);
    expect(stdout).toContain("## Coverage");
  });

  it("prints it as JSON with --format json or --json, and audits one level with --canvas", async () => {
    const { stdout } = await cli(["audit", EXAMPLE, "--format", "json", "--canvas", "cnv_expiryClock"]);
    const audit = JSON.parse(stdout);
    expect(audit).toMatchObject({ ok: true, summary: { scenarios: 0, coverage: 70 } });
    expect((await cli(["audit", EXAMPLE, "--json"])).json().summary.coverage).toBe(48);
  });

  it("writes the report to a file with -o", async () => {
    const dir = await workspace();
    const out = join(dir, "audit.md");
    const { code, stdout } = await cli(["audit", EXAMPLE, "-o", out]);
    expect(code).toBe(0);
    expect(stdout).toBe(`Wrote the audit of ${EXAMPLE} to ${out}\n`);
    expect(await readFile(out, "utf8")).toContain("# Audit of Payments");
  });

  it("exits 1 when the document has errors, and 2 for an unknown format or level", async () => {
    const dir = await workspace();
    const file = join(dir, "broken.statewright.json");
    const doc = JSON.parse(await readFile(EXAMPLE, "utf8"));
    // A second initial node in the expiry clock: an error (machine.multipleInitial).
    const broken = applyBatch(doc, [
      { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_again", node: { kind: "initial" } } },
      { type: "edge.add", args: { canvas: "cnv_expiryClock", edge: { from: "nod_again", to: "nod_paused" } } }
    ]).doc;
    await writeFile(file, stringify(broken));
    expect((await cli(["audit", file])).code).toBe(1);
    expect((await cli(["audit", EXAMPLE, "--format", "html"])).code).toBe(2);
    expect((await cli(["audit", EXAMPLE, "--canvas", "cnv_nope"])).stderr).toBe(
      `statewright: ${EXAMPLE} has no canvas "cnv_nope"\n`
    );
  });
});
