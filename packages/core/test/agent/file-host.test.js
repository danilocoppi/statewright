import { chmod, mkdir, mkdtemp, readdir, readFile, readlink, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toAuditReport } from "../../src/audit/index.js";
import { stringifyContract, toContract } from "../../src/contract/index.js";
import { toAIPack } from "../../src/docs/index.js";
import { parse } from "../../src/serialize/parse.js";
import { toSVG } from "../../src/render/index.js";
import { createFileHost, memoryFiles } from "../../src/agent/index.js";
import { nodeFiles } from "../../src/cli/node-files.js";
import { createDocument } from "../../src/create.js";
import { stringify } from "../../src/serialize/stringify.js";
import { sign, verify } from "../../src/signature.js";
import { readExample } from "../helpers.js";
import { describeContract } from "./suite.js";

const FILE = "payments.sttw";

/** A file host on a fresh copy of the payments example, in memory. */
function payments() {
  const files = memoryFiles({ [FILE]: readExample(FILE) });
  const host = createFileHost({ files, agent: "test-agent" });
  return {
    files,
    host,
    call: (name, args) => host.call(name, args, { file: FILE }),
    document: async () => JSON.parse(files.text(FILE))
  };
}

describeContract("the file host", async () => payments());

describe("the file host (AI interface spec §4.3)", () => {
  it("refuses a proposal: proposals need the Editor (collaboration spec §7)", async () => {
    const { call, files } = payments();
    const before = files.text(FILE);
    const answer = await call("batch.apply", {
      label: "Rename",
      propose: true,
      title: "A clearer name",
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }]
    });
    expect(answer).toMatchObject({
      ok: false,
      error: { code: "NOT_ALLOWED", message: expect.stringMatching(/proposals need the Editor/) }
    });
    expect(files.text(FILE)).toBe(before);
  });

  it("writes every change at once, signed by the agent", async () => {
    const { call, files } = payments();
    await call("batch.apply", {
      label: "Rename",
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }]
    });
    const written = JSON.parse(files.text(FILE));
    expect(written.generator).toMatchObject({ name: "statewright", channel: "api", agent: "test-agent" });
    expect(await verify(written)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("reads a file again when someone else changed it, and starts its undo afresh", async () => {
    const { call, files } = payments();
    await call("batch.apply", {
      label: "Rename",
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }]
    });
    const other = JSON.parse(files.text(FILE));
    other.project.name = "Payments, by someone else";
    await files.write(FILE, stringify(await sign(other, { channel: "cli" })));
    expect((await call("document.summary")).result.project.name).toBe("Payments, by someone else");
    expect(await call("history.undo")).toMatchObject({ ok: false, error: { code: "NOT_AI_CHANGE" } });
  });

  it("refuses to write a file changed outside Statewright, unless the agent accepts the changes", async () => {
    const files = memoryFiles({ [FILE]: readExample(FILE).replace('"name": "paused"', '"name": "frozen"') });
    const host = createFileHost({ files, agent: "test-agent" });
    const batch = {
      label: "Rename",
      commands: [{ type: "node.update", args: { id: "nod_running", set: { name: "counting" } } }]
    };
    expect((await host.call("level.get", { canvas: "cnv_expiryClock" }, { file: FILE })).ok).toBe(true);
    expect(await host.call("batch.apply", batch, { file: FILE })).toMatchObject({
      ok: false,
      error: { code: "FILE", details: { file: FILE, review: true } }
    });
    expect(await host.call("batch.apply", batch, { file: FILE, acceptChanges: true })).toMatchObject({ ok: true });
    expect(await host.call("batch.apply", batch, { file: FILE })).toMatchObject({ ok: true });
  });

  it("says what is wrong with a file it cannot use, or a call without one", async () => {
    const files = memoryFiles({ "broken.json": "{}" });
    const host = createFileHost({ files });
    expect(await host.call("document.summary", {}, { file: "nope.json" })).toEqual({
      ok: false,
      error: { code: "FILE", message: "Cannot read nope.json: no such file", details: { file: "nope.json" } }
    });
    expect(await host.call("document.summary", {}, { file: "broken.json" })).toMatchObject({
      ok: false,
      error: { code: "FILE", message: expect.stringMatching(/^broken\.json is not a valid Statewright document: /) }
    });
    expect(await host.call("document.summary")).toMatchObject({ ok: false, error: { code: "FILE" } });
  });

  it("runs calls made at once one after the other, so none is lost", async () => {
    const { host, files } = payments();
    const add = name => ({
      label: `Add ${name}`,
      commands: [{ type: "node.add", args: { canvas: "cnv_expiryClock", node: { kind: "state", name } } }]
    });
    const results = await Promise.all(
      ["one", "two", "three"].map(name => host.call("batch.apply", add(name), { file: FILE }))
    );
    expect(results.map(result => result.result.created)).toEqual([["nod_one"], ["nod_two"], ["nod_three"]]);
    const nodes = JSON.parse(files.text(FILE)).canvases.cnv_expiryClock.nodes;
    expect([nodes.nod_one, nodes.nod_two, nodes.nod_three].every(Boolean)).toBe(true);
    expect((await host.call("history.undo", {}, { file: FILE })).result.label).toBe("Add three");
  });

  it("keeps nothing of a change it could not write, and says why", async () => {
    const files = memoryFiles({ [FILE]: readExample(FILE) });
    const full = {
      ...files,
      write: async () => {
        throw new Error("no space left on device");
      }
    };
    const host = createFileHost({ files: full });
    const result = await host.call(
      "batch.apply",
      { label: "Rename", commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }] },
      { file: FILE }
    );
    expect(result).toEqual({
      ok: false,
      error: { code: "FILE", message: `Cannot write ${FILE}: no space left on device`, details: { file: FILE } }
    });
    const level = (await host.call("level.get", { canvas: "cnv_expiryClock" }, { file: FILE })).result;
    expect(level.nodes.find(node => node.id === "nod_paused").name).toBe("paused");
    expect(await host.call("history.undo", {}, { file: FILE })).toMatchObject({ error: { code: "NOT_AI_CHANGE" } });
  });

  it("keeps a run's steps unsaved when saving them as a scenario could not be written", async () => {
    const files = memoryFiles({ [FILE]: readExample(FILE) });
    let refuse = false;
    const host = createFileHost({
      files: {
        ...files,
        write: async (path, text) => {
          if (refuse) throw new Error("no space left on device");
          return files.write(path, text);
        }
      }
    });
    const call = (name, args) => host.call(name, args, { file: FILE });
    await call("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
    await call("run.step", { do: { event: "evt_verifyStarted" } });
    refuse = true;
    expect(await call("scenario.save", { name: "Verification starts" })).toMatchObject({
      ok: false,
      error: { code: "FILE" }
    });
    expect(await call("run.stop")).toMatchObject({
      ok: false,
      error: { code: "NOT_ALLOWED", details: { unsaved: 1 } }
    });
    refuse = false;
    expect(await call("scenario.save", { name: "Verification starts" })).toEqual({
      ok: true,
      result: { id: "scn_verificationStarts" }
    });
  });

  it("says what is wrong when the file it exports cannot be read", async () => {
    const files = memoryFiles({ [FILE]: readExample(FILE) });
    let reads = 0;
    const host = createFileHost({
      files: {
        ...files,
        read: async path => {
          reads += 1;
          if (reads > 1) throw new Error("input/output error");
          return files.read(path);
        }
      }
    });
    expect((await host.call("document.summary", {}, { file: FILE })).ok).toBe(true);
    expect(await host.call("export.document", {}, { file: FILE })).toEqual({
      ok: false,
      error: { code: "FILE", message: `Cannot read ${FILE}: input/output error`, details: { file: FILE } }
    });
  });

  it("answers a call whose target is not an object, and goes on answering the next ones", async () => {
    const { host } = payments();
    expect(await host.call("document.summary", {}, null)).toMatchObject({ ok: false, error: { code: "FILE" } });
    expect((await host.call("document.summary", {}, { file: FILE })).ok).toBe(true);
  });

  it("opens a file of an older format, with a byte order mark, as written: its signature still holds", async () => {
    const old = createDocument({ name: "Old" });
    old.statewright = "1.0";
    const files = memoryFiles({ "old.json": `\uFEFF${stringify(await sign(old, { channel: "cli" }))}` });
    const host = createFileHost({ files });
    const result = await host.call(
      "batch.apply",
      { label: "Rename", commands: [{ type: "canvas.update", args: { id: "cnv_old", set: { name: "Older" } } }] },
      { file: "old.json" }
    );
    expect(result.ok).toBe(true);
    expect(JSON.parse(files.text("old.json")).statewright).toBe("1.3");
  });

  it("answers what needs the Editor with NEEDS_EDITOR", async () => {
    const { call } = payments();
    expect(await call("view.open", { canvas: "cnv_lifecycle" })).toEqual({
      ok: false,
      error: {
        code: "NEEDS_EDITOR",
        message: "view.open needs the Editor: pair one (Connect an AI… in the Editor) and call it without a file"
      }
    });
  });

  it("keeps a run in memory, one per file: running writes nothing, saving the run writes it", async () => {
    const { call, files } = payments();
    const before = files.text(FILE);
    await call("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
    await call("run.step", { do: { event: "evt_verifyStarted" } });
    expect(files.text(FILE)).toBe(before);
    await call("scenario.save", { name: "Verification starts" });
    expect(JSON.parse(files.text(FILE)).annotations.scenarios.scn_verificationStarts.steps).toHaveLength(1);
    expect(await call("run.stop")).toEqual({ ok: true, result: { stopped: true } });
    expect((await call("history.undo")).result.label).toBe('Save scenario "Verification starts"');
  });

  it("places a level's boxes that have none, as one change", async () => {
    const { call, document } = payments();
    const { result } = await call("layout.arrange", { canvas: "cnv_runtime" });
    expect(result.placed).toHaveLength(8);
    const doc = await document();
    expect(Object.keys(doc.layout.canvases.cnv_runtime.nodes).sort()).toEqual(result.placed.sort());
    expect((await call("history.undo")).result.label).toBe("Arrange Runtime");
  });
});

describe("the file host's exports, projects and audit", () => {
  it("exports Core's own output, as text or written to out", async () => {
    const { call, files, document } = payments();
    const doc = await document();
    expect((await call("export.svg", { canvas: "cnv_expiryClock" })).result.text).toBe(
      await toSVG(doc, "cnv_expiryClock")
    );
    expect((await call("export.aiPack")).result.text).toBe(toAIPack(doc));
    expect((await call("export.contract")).result.text).toBe(stringifyContract((await toContract(doc)).contract));
    expect((await call("audit.report", { format: "md" })).result.markdown).toBe(toAuditReport(doc));
    expect(await call("export.markdown", { out: "docs/payments.md" })).toEqual({
      ok: true,
      result: { name: "payments.md", written: "docs/payments.md" }
    });
    expect(files.text("docs/payments.md")).toMatch(/^# Payments/);
    expect(await call("export.document", { to: "download" })).toMatchObject({
      ok: false,
      error: { code: "NEEDS_EDITOR" }
    });
  });

  it("creates a project at a path, signed, and runs the calls without a file on it", async () => {
    const files = memoryFiles({});
    const host = createFileHost({ files, agent: "test-agent" });
    expect(await host.call("projects.create", { name: "Refund", kind: "flow" })).toMatchObject({
      ok: false,
      error: { code: "FILE" }
    });
    expect(await host.call("projects.create", { name: "Refund", kind: "flow", path: "refund.sttw" })).toEqual({
      ok: true,
      result: { project: { id: "prj_refund", name: "Refund" }, written: "refund.sttw" }
    });
    const written = parse(files.text("refund.sttw"));
    expect(written.ok).toBe(true);
    expect(written.doc.generator).toMatchObject({ channel: "api", agent: "test-agent" });
    expect(await verify(written.doc)).toMatchObject({ content: "ok" });
    expect((await host.call("level.get", { canvas: "cnv_refund" })).result.nodes.map(node => node.kind)).toEqual([
      "end",
      "start"
    ]);
    expect(await host.call("projects.create", { name: "Again", path: "refund.sttw" })).toMatchObject({
      ok: false,
      error: { code: "FILE", message: "refund.sttw already exists" }
    });
  });

  it("opens a document file by its path, for the calls without a file", async () => {
    const files = memoryFiles({ [FILE]: readExample(FILE), "broken.json": "{}" });
    const host = createFileHost({ files });
    expect(await host.call("projects.open", { path: FILE })).toEqual({
      ok: true,
      result: { project: { id: "prj_payments", name: "Payments" }, file: FILE }
    });
    expect(host.current()).toBe(FILE);
    expect((await host.call("document.summary")).result.project.id).toBe("prj_payments");
    expect(await host.call("projects.open", { path: "broken.json" })).toMatchObject({
      ok: false,
      error: { code: "FILE" }
    });
    expect(host.current()).toBe(FILE);
    expect(await host.call("projects.open", { id: "prj_payments" })).toMatchObject({
      ok: false,
      error: { code: "NEEDS_EDITOR" }
    });
  });

  it.each(["payments.statewright.json", "payments.json"])("works on a document named %s, as on a .sttw", async name => {
    const host = createFileHost({ files: memoryFiles({ [name]: readExample(FILE) }) });
    expect((await host.call("document.summary", {}, { file: name })).result.project.id).toBe("prj_payments");
    expect((await host.call("projects.open", { path: name })).result.file).toBe(name);
  });

  it("asks for the path of a .sttw when there is none", async () => {
    const host = createFileHost({ files: memoryFiles({}) });
    expect(await host.call("projects.create", { name: "Refund" })).toMatchObject({
      ok: false,
      error: { code: "FILE", message: "Give the path to write the new .sttw at (path)" }
    });
    expect(await host.call("document.summary")).toMatchObject({
      ok: false,
      error: { code: "FILE", message: "Give the path of a .sttw (file), or open one (projects.open)" }
    });
  });
});

describe("documents on disk (Node)", () => {
  it("writes a whole document at once, through a temporary file, and leaves nothing beside it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-agent-"));
    await writeFile(join(dir, FILE), readExample(FILE));
    const files = nodeFiles({ cwd: dir });
    const host = createFileHost({ files, agent: "test-agent" });
    const result = await host.call(
      "batch.apply",
      { label: "Rename", commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }] },
      { file: FILE }
    );
    expect(result.ok).toBe(true);
    expect(JSON.parse(await readFile(join(dir, FILE), "utf8")).canvases.cnv_expiryClock.nodes.nod_paused.name).toBe(
      "on hold"
    );
    expect(await readdir(dir)).toEqual([FILE]);
    expect(await files.read("missing.json")).toBeNull();
    expect(await files.stat("missing.json")).toBeNull();
  });

  it("writes an export into folders that do not exist yet", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-agent-"));
    await writeFile(join(dir, FILE), readExample(FILE));
    const host = createFileHost({ files: nodeFiles({ cwd: dir }) });
    expect(await host.call("export.markdown", { out: "docs/design/payments.md" }, { file: FILE })).toEqual({
      ok: true,
      result: { name: "payments.md", written: "docs/design/payments.md" }
    });
    expect(await readFile(join(dir, "docs/design/payments.md"), "utf8")).toMatch(/^# Payments/);
    expect(await readdir(join(dir, "docs/design"))).toEqual(["payments.md"]);
    await writeFile(join(dir, "taken"), "");
    expect(await host.call("export.markdown", { out: "taken/payments.md" }, { file: FILE })).toMatchObject({
      ok: false,
      error: { code: "FILE", message: expect.stringMatching(/^Cannot write taken\/payments\.md: /) }
    });
  });

  it("says why it cannot create a project where a file stands in the way", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-agent-"));
    await writeFile(join(dir, "plain"), "");
    const host = createFileHost({ files: nodeFiles({ cwd: dir }) });
    expect(await host.call("projects.create", { name: "New", path: "plain/new.sttw" })).toMatchObject({
      ok: false,
      error: { code: "FILE", details: { file: "plain/new.sttw" } }
    });
  });

  it("keeps a document's permissions, and a link to it a link, when it writes it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-agent-"));
    await mkdir(join(dir, "real"));
    await writeFile(join(dir, "real", FILE), readExample(FILE));
    await chmod(join(dir, "real", FILE), 0o600);
    await symlink(join("real", FILE), join(dir, "link.sttw"));
    const host = createFileHost({ files: nodeFiles({ cwd: dir }) });
    const result = await host.call(
      "batch.apply",
      { label: "Rename", commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }] },
      { file: "link.sttw" }
    );
    expect(result.ok).toBe(true);
    expect(await readlink(join(dir, "link.sttw"))).toBe(join("real", FILE));
    const real = JSON.parse(await readFile(join(dir, "real", FILE), "utf8"));
    expect(real.canvases.cnv_expiryClock.nodes.nod_paused.name).toBe("on hold");
    expect((await stat(join(dir, "real", FILE))).mode & 0o777).toBe(0o600);
    expect((await readdir(join(dir, "real"))).sort()).toEqual([FILE]);
  });

  it("says a folder is not a document file it can read", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-agent-"));
    await mkdir(join(dir, "folder.sttw"));
    const host = createFileHost({ files: nodeFiles({ cwd: dir }) });
    expect(await host.call("document.summary", {}, { file: "folder.sttw" })).toMatchObject({
      ok: false,
      error: {
        code: "FILE",
        message: expect.stringMatching(/^Cannot read folder\.sttw: /),
        details: { file: "folder.sttw" }
      }
    });
  });
});
