import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "../../src/serialize/parse.js";
import { sign, verify } from "../../src/signature.js";
import { paymentsDoc } from "../helpers.js";
import { EXAMPLE, cli, workspace } from "./helpers.js";

/** A copy of the payments example in a fresh workspace. */
async function copy() {
  const dir = await workspace();
  const path = join(dir, "payments.json");
  await writeFile(path, await readFile(EXAMPLE, "utf8"));
  return { dir, path };
}

const ADD_EVENT = [
  { type: "catalog.add", args: { collection: "events", item: { name: "leg.started", payload: null } } }
];

describe("new", () => {
  it("creates an empty signed document, a .sttw", async () => {
    const dir = await workspace();
    const run = await cli(["new", "shop.sttw", "--name", "Shop", "--agent", "claude-code", "--json"], { cwd: dir });
    expect(run.json()).toEqual({ ok: true, written: "shop.sttw", project: "prj_shop", root: "cnv_shop" });
    const doc = parse(await readFile(join(dir, "shop.sttw"), "utf8")).doc;
    expect(doc.generator).toMatchObject({ name: "statewright", channel: "cli", agent: "claude-code" });
    expect(await verify(doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("refuses to overwrite without --force and needs --name", async () => {
    const dir = await workspace();
    await cli(["new", "shop.json", "--name", "Shop"], { cwd: dir });
    expect((await cli(["new", "shop.json", "--name", "Other"], { cwd: dir })).code).toBe(2);
    expect((await cli(["new", "shop.json", "--name", "Other", "--force"], { cwd: dir })).code).toBe(0);
    expect((await cli(["new", "x.json"], { cwd: dir })).stderr).toBe("statewright: --name <project> is required\n");
  });
});

describe("apply", () => {
  it("applies a batch from a file, re-signs and writes the document", async () => {
    const { dir, path } = await copy();
    await writeFile(join(dir, "batch.json"), JSON.stringify(ADD_EVENT));
    const run = await cli(["apply", "payments.json", "batch.json", "--agent", "claude-code", "--json"], { cwd: dir });
    expect(run.json()).toMatchObject({ ok: true, written: "payments.json", applied: 1, created: ["evt_legStarted"] });
    const doc = parse(await readFile(path, "utf8")).doc;
    expect(doc.catalog.events.evt_legStarted).toEqual({ name: "leg.started", payload: null });
    expect(doc.generator).toMatchObject({ channel: "cli", agent: "claude-code" });
    expect(await verify(doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("reads the batch from stdin, and writes elsewhere or nowhere on request", async () => {
    const { dir, path } = await copy();
    const before = await readFile(path, "utf8");
    const stdin = JSON.stringify(ADD_EVENT[0]);
    expect((await cli(["apply", "payments.json", "-", "--dry-run"], { cwd: dir, stdin })).code).toBe(0);
    expect(await readFile(path, "utf8")).toBe(before);
    await cli(["apply", "payments.json", "-", "--out", "next.json"], { cwd: dir, stdin });
    expect(await readFile(path, "utf8")).toBe(before);
    expect(parse(await readFile(join(dir, "next.json"), "utf8")).doc.catalog.events.evt_legStarted).toBeDefined();
  });

  it("fails without writing when a command fails, naming it", async () => {
    const { dir, path } = await copy();
    const before = await readFile(path, "utf8");
    const batch = [...ADD_EVENT, { type: "node.remove", args: { id: "nod_nothing" } }];
    const run = await cli(["apply", "payments.json", "-", "--json"], { cwd: dir, stdin: JSON.stringify(batch) });
    expect(run.code).toBe(2);
    expect(run.json().error).toMatchObject({ code: "NOT_FOUND", index: 1 });
    expect(run.stderr).toMatch(/^statewright: Command 1 \(node\.remove\) failed — NOT_FOUND: /);
    expect(await readFile(path, "utf8")).toBe(before);
  });

  it("refuses content changed outside Statewright unless --accept-changes", async () => {
    const dir = await workspace();
    const doc = paymentsDoc();
    doc.project.name = "Edited by hand";
    await writeFile(join(dir, "edited.json"), JSON.stringify(doc));
    const stdin = JSON.stringify(ADD_EVENT);
    const refused = await cli(["apply", "edited.json", "-"], { cwd: dir, stdin });
    expect(refused.code).toBe(2);
    expect(refused.stderr).toContain("pass --accept-changes");
    expect((await cli(["apply", "edited.json", "-", "--accept-changes"], { cwd: dir, stdin })).code).toBe(0);
  });

  it("accepts unsigned documents and signs them", async () => {
    const dir = await workspace();
    const doc = paymentsDoc();
    delete doc.signature;
    await writeFile(join(dir, "unsigned.json"), JSON.stringify(doc));
    const run = await cli(["apply", "unsigned.json", "-"], { cwd: dir, stdin: JSON.stringify(ADD_EVENT) });
    expect(run.code).toBe(0);
    const written = parse(await readFile(join(dir, "unsigned.json"), "utf8")).doc;
    expect(await verify(written)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("never writes a file named - when the document comes from stdin", async () => {
    const dir = await workspace();
    await writeFile(join(dir, "batch.json"), JSON.stringify(ADD_EVENT));
    const stdin = await readFile(EXAMPLE, "utf8");
    const refused = await cli(["apply", "-", "batch.json"], { cwd: dir, stdin });
    expect(refused.code).toBe(2);
    expect(refused.stderr).toBe(
      'statewright: Cannot write to "-": give a file path (with apply and migrate, --out <file>)\n'
    );
    await expect(readFile(join(dir, "-"), "utf8")).rejects.toThrow(/ENOENT/);
    expect((await cli(["apply", "-", "batch.json", "--out", "next.json"], { cwd: dir, stdin })).code).toBe(0);
    expect(parse(await readFile(join(dir, "next.json"), "utf8")).doc.catalog.events.evt_legStarted).toBeDefined();
  });
});

describe("migrate", () => {
  it("has nothing to do for current documents", async () => {
    const { dir, path } = await copy();
    const before = await readFile(path, "utf8");
    const run = await cli(["migrate", "payments.json"], { cwd: dir });
    expect(run.stdout).toBe("payments.json already uses format 1.1; nothing to do\n");
    expect(await readFile(path, "utf8")).toBe(before);
  });

  it("migrates older documents, re-signs and writes them", async () => {
    const dir = await workspace();
    const doc = paymentsDoc();
    doc.statewright = "1.0";
    delete doc.signature;
    await writeFile(join(dir, "old.json"), JSON.stringify(doc));
    const run = await cli(["migrate", "old.json", "--json"], { cwd: dir });
    expect(run.json()).toEqual({ ok: true, file: "old.json", migrations: ["1.0 → 1.1"], written: "old.json" });
    const migrated = parse(await readFile(join(dir, "old.json"), "utf8")).doc;
    expect(migrated.statewright).toBe("1.1");
    expect(await verify(migrated)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("takes a file signed in format 1.0 as written by Statewright, not as changed outside it", async () => {
    const dir = await workspace();
    const old = await sign({ ...paymentsDoc(), statewright: "1.0" }, { channel: "cli" });
    await writeFile(join(dir, "old.json"), JSON.stringify(old));
    const stdin = JSON.stringify([{ type: "project.update", args: { set: { name: "Payments v2" } } }]);
    const run = await cli(["apply", "old.json", "-"], { cwd: dir, stdin });
    expect(run.stderr).toBe("");
    expect(run.code).toBe(0);
    expect(parse(await readFile(join(dir, "old.json"), "utf8")).doc.statewright).toBe("1.1");
  });
});
