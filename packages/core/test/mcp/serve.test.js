import { copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { memoryFiles } from "../../src/agent/index.js";
import { nodeFiles } from "../../src/cli/node-files.js";
import { serveMcp } from "../../src/mcp/serve.js";
import { readExample } from "../helpers.js";

const PAYMENTS = readExample("payments.sttw");
const GET_PAID = readExample("get-paid-as-built.sttw");

/** Serve these messages, one per line, and collect the answers by id. */
async function serve(messages, { files = memoryFiles({}), file, editor, guide } = {}) {
  const written = [];
  const logged = [];
  async function* lines() {
    for (const message of messages) yield typeof message === "string" ? message : JSON.stringify(message);
  }
  await serveMcp({
    files,
    file,
    version: "0.1.0",
    lines: lines(),
    write: line => written.push(JSON.parse(line)),
    log: line => logged.push(line),
    editor,
    guide
  });
  const byId = Object.fromEntries(written.map(response => [response.id, response]));
  return { written, logged, byId, files };
}

const HELLO = { jsonrpc: "2.0", id: 0, method: "initialize", params: { clientInfo: { name: "test-client" } } };
const call = (id, name, args = {}) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });

describe("the MCP server at work (AI interface spec §5)", () => {
  it("runs a call with file on that file, and signs what it writes with the client's name", async () => {
    const files = memoryFiles({ "payments.json": PAYMENTS });
    const commands = [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }];
    const { byId } = await serve(
      [HELLO, call(1, "batch_apply", { file: "payments.json", label: "Rename", commands })],
      {
        files
      }
    );
    expect(byId[1].result.structuredContent).toEqual({ created: [], problems: { added: [], removed: [] } });
    const written = JSON.parse(files.text("payments.json"));
    expect(written.canvases.cnv_expiryClock.nodes.nod_paused.name).toBe("on hold");
    expect(written.generator).toMatchObject({ channel: "api", agent: "test-client" });
  });

  it("runs the calls without file on --file, then on the document opened last", async () => {
    const files = memoryFiles({ "payments.json": PAYMENTS, "get-paid.json": GET_PAID });
    const { byId, logged } = await serve(
      [
        HELLO,
        call(1, "document_summary"),
        call(2, "projects_open", { path: "get-paid.json" }),
        call(3, "document_summary")
      ],
      { files, file: "payments.json" }
    );
    expect(logged[0]).toBe("ready: 42 tools, on payments.json by default");
    expect(byId[1].result.structuredContent.project.id).toBe("prj_payments");
    expect(byId[3].result.structuredContent.project.id).toBe(JSON.parse(GET_PAID).project.id);
  });

  it("reads the guide without a document, a section at a time (AI interface plan A5)", async () => {
    const { byId } = await serve([
      HELLO,
      call(1, "guide_read"),
      call(2, "guide_read", { section: "Rules for AI agents" }),
      call(3, "guide_read", { section: "billing" }),
      call(4, "guide_read", { section: 7 })
    ]);
    expect(byId[1].result.structuredContent).toMatchObject({
      id: "ai-agents-start-here",
      title: "AI agents: start here"
    });
    expect(byId[1].result.structuredContent.sections.length).toBeGreaterThan(10);
    expect(byId[2].result.structuredContent.text).toMatch(/^## Rules for AI agents\n/);
    expect(byId[3].result).toMatchObject({ isError: true, structuredContent: { error: { code: "NOT_FOUND" } } });
    expect(byId[4].result.structuredContent.error).toEqual({
      code: "BAD_ARGUMENTS",
      message: "Invalid arguments for guide_read: section must be a section's ID or title",
      details: { path: "section" }
    });
  });

  it("says when the guide cannot be read, and goes on serving", async () => {
    const { byId } = await serve([HELLO, call(1, "guide_read"), call(2, "projects_list")], {
      guide: () => Promise.reject(new Error("ENOENT: no such file"))
    });
    expect(byId[1].result.structuredContent.error).toEqual({
      code: "FILE",
      message: "Cannot read the guide: ENOENT: no such file"
    });
    expect(byId[2].result.structuredContent.error.code).toBe("NOT_PAIRED");
  });

  it("answers NOT_PAIRED when there is no document to work on; creating one needs none", async () => {
    const { byId } = await serve([
      HELLO,
      call(1, "document_summary"),
      call(2, "view_open", { canvas: "cnv_a" }),
      call(3, "projects_create", { name: "Refund", kind: "flow", path: "refund.sttw" }),
      call(4, "level_get", { canvas: "cnv_refund" })
    ]);
    expect(byId[1].result).toMatchObject({ isError: true, structuredContent: { error: { code: "NOT_PAIRED" } } });
    expect(byId[1].result.structuredContent.error.message).toBe(
      "document.summary has no document to work on: pass file (the path of a .sttw), start the server " +
        "with --file, or ask the person to open the Statewright Editor (https://statewright.cpss.com.br) and its " +
        "Connect an AI… (on the Projects screen, or a project's menu or ⌘K) and call editor_pair with the code it shows"
    );
    expect(byId[2].result.structuredContent.error.code).toBe("NOT_PAIRED");
    expect(byId[3].result.structuredContent.written).toBe("refund.sttw");
    expect(byId[4].result.structuredContent.kind).toBe("flow");
  });

  it("answers what needs the Editor with how to pair, and on a file named with NEEDS_EDITOR", async () => {
    const { byId } = await serve(
      [
        HELLO,
        call(1, "view_open", { canvas: "cnv_lifecycle" }),
        call(2, "view_open", { canvas: "cnv_lifecycle", file: "payments.json" })
      ],
      { files: memoryFiles({ "payments.json": PAYMENTS }), file: "payments.json" }
    );
    expect(byId[1].result.structuredContent.error).toEqual({
      code: "NOT_PAIRED",
      message:
        "view.open needs the person's Editor: ask the person to open the Statewright Editor " +
        "(https://statewright.cpss.com.br) and its Connect an AI… (on the Projects screen, or a project's menu or ⌘K) and call editor_pair " +
        "with the code it shows"
    });
    expect(byId[2].result.structuredContent.error.code).toBe("NEEDS_EDITOR");
  });

  it("refuses a file or acceptChanges that is not one, naming it", async () => {
    const { byId } = await serve([
      call(1, "document_summary", { file: 3 }),
      call(2, "batch_apply", { file: "a.json", acceptChanges: "yes", label: "x", commands: [] })
    ]);
    expect(byId[1].result.structuredContent.error).toMatchObject({ code: "BAD_ARGUMENTS", details: { path: "file" } });
    expect(byId[2].result.structuredContent.error).toMatchObject({
      code: "BAD_ARGUMENTS",
      details: { path: "acceptChanges" }
    });
  });

  it("answers a ping while a call is still running", async () => {
    const files = memoryFiles({ "payments.json": PAYMENTS });
    let release;
    const held = new Promise(resolve => (release = resolve));
    const slow = { ...files, read: async path => (await held, files.read(path)) };
    const order = [];
    async function* lines() {
      yield JSON.stringify(call(1, "document_summary", { file: "payments.json" }));
      yield JSON.stringify({ jsonrpc: "2.0", id: 2, method: "ping" });
    }
    await serveMcp({
      files: slow,
      version: "0.1.0",
      lines: lines(),
      write: line => {
        order.push(JSON.parse(line).id);
        if (order.length === 1) release();
      }
    });
    expect(order).toEqual([2, 1]);
  });

  it("reads lines that end with a carriage return, as Windows clients send them", async () => {
    const { written } = await serve([`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" })}\r`]);
    expect(written).toEqual([{ jsonrpc: "2.0", id: 1, result: {} }]);
  });

  it("writes for a client that gave no name, signed by Statewright's API alone", async () => {
    const files = memoryFiles({ "payments.json": PAYMENTS });
    const commands = [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }];
    const { byId } = await serve(
      [
        { jsonrpc: "2.0", id: 0, method: "initialize", params: {} },
        call(1, "batch_apply", { file: "payments.json", label: "Rename", commands })
      ],
      { files }
    );
    expect(byId[1].result.isError).toBeUndefined();
    const { generator } = JSON.parse(files.text("payments.json"));
    expect(generator.channel).toBe("api");
    expect(generator).not.toHaveProperty("agent");
  });

  it("knows one file by any of its paths: its undo, its run and its hold are the same", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-mcp-"));
    await copyFile(new URL("../../../../examples/payments.sttw", import.meta.url), join(dir, "p.json"));
    const absolute = join(dir, "p.json");
    const rename = {
      label: "Rename",
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }]
    };
    const { byId } = await serve(
      [
        HELLO,
        call(1, "projects_open", { path: "p.json" }),
        call(2, "batch_apply", rename),
        call(3, "history_undo", { file: absolute }),
        call(4, "run_start", { file: "./p.json", canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" }),
        call(5, "batch_apply", { ...rename, file: absolute }),
        call(6, "run_state")
      ],
      { files: nodeFiles({ cwd: dir }) }
    );
    expect(byId[3].result.structuredContent).toEqual({ label: "Rename" });
    expect(byId[5].result.structuredContent.error.code).toBe("SIMULATING");
    expect(byId[6].result.structuredContent.points).toHaveLength(1);
  });

  it("signs with the client's name only when it is a name", async () => {
    for (const name of [{ x: 1 }, "   ", 42]) {
      const files = memoryFiles({ "payments.json": PAYMENTS });
      const commands = [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }];
      await serve(
        [
          { jsonrpc: "2.0", id: 0, method: "initialize", params: { clientInfo: { name } } },
          call(1, "batch_apply", { file: "payments.json", label: "Rename", commands })
        ],
        { files }
      );
      expect(JSON.parse(files.text("payments.json")).generator, JSON.stringify(name)).not.toHaveProperty("agent");
    }
  });

  it("answers every request it read before its input ended, a bad line included", async () => {
    const { written } = await serve(
      [
        "{nope",
        { jsonrpc: "2.0", id: 1, method: "ping" },
        call(2, "document_summary"),
        { jsonrpc: "2.0", method: "notifications/initialized" }
      ],
      { files: memoryFiles({ "payments.json": PAYMENTS }), file: "payments.json" }
    );
    expect(written.map(response => response.id).sort()).toEqual([1, 2, null].sort());
    expect(written.find(response => response.id === 2).result.structuredContent.project.name).toBe("Payments");
  });
});

/**
 * A bridge with a tab paired that answers with `answer(name, args)`: `gone()` closes the tab, as the person may.
 * @param {(name: string, args: object) => object} [answer]
 */
function pairedEditor(answer = name => ({ ok: true, result: { name } })) {
  let status = "paired";
  const calls = [];
  const paired = [];
  return {
    calls,
    paired,
    gone: () => (status = "gone"),
    state: () =>
      status === "gone" ?
        { status, reason: "closed", outcome: { ok: false, error: { code: "EDITOR_GONE", message: "The tab closed" } } }
      : { status },
    async pair(code, agent) {
      paired.push({ code, agent });
      status = "paired";
      return { ok: true, result: { paired: true, agent, address: "127.0.0.1:47615" } };
    },
    disconnect() {
      status = "none";
      return { ok: true, result: { disconnected: true } };
    },
    async call(name, args) {
      calls.push({ name, args });
      return answer(name, args);
    }
  };
}

describe("the MCP server with an Editor tab paired (AI interface spec §5: routing)", () => {
  it("runs the calls without file in the paired tab, and those with file on the file", async () => {
    const editor = pairedEditor();
    const files = memoryFiles({ "payments.json": PAYMENTS });
    const { byId } = await serve(
      [
        HELLO,
        call(1, "document_summary"),
        call(2, "view_open", { canvas: "cnv_lifecycle", acceptChanges: true }),
        call(3, "document_summary", { file: "payments.json" })
      ],
      { files, file: "payments.json", editor }
    );
    expect(byId[1].result.structuredContent).toEqual({ name: "document.summary" });
    expect(editor.calls).toEqual([
      { name: "document.summary", args: {} },
      { name: "view.open", args: { canvas: "cnv_lifecycle" } }
    ]);
    expect(byId[3].result.structuredContent.project.id).toBe("prj_payments");
  });

  it("pairs with the code the person reads, named as the agent asks, or as its client is called", async () => {
    const editor = pairedEditor();
    const { byId } = await serve(
      [HELLO, call(1, "editor_pair", { code: "K7Q-2MX" }), call(2, "editor_pair", { code: "K7Q-2MX", agent: " Ada " })],
      { editor }
    );
    expect(byId[1].result.structuredContent).toEqual({
      paired: true,
      agent: "test-client",
      address: "127.0.0.1:47615"
    });
    expect(editor.paired).toEqual([
      { code: "K7Q-2MX", agent: "test-client" },
      { code: "K7Q-2MX", agent: "Ada" }
    ]);
  });

  it("writes an export's out from what the tab returns, and reads projects_import's path for it", async () => {
    const editor = pairedEditor((name, args) =>
      name === "export.png" ?
        { ok: true, result: { name: "payments.png", base64: Buffer.from("PNG").toString("base64") } }
      : name === "export.markdown" ? { ok: true, result: { name: "payments.md", text: "# Payments" } }
      : { ok: true, result: { project: { id: "prj_payments", name: "Payments" }, got: args } }
    );
    const files = memoryFiles({ "payments.json": PAYMENTS });
    const { byId } = await serve(
      [
        HELLO,
        call(1, "export_markdown", { out: "docs/payments.md" }),
        call(2, "export_png", { canvas: "cnv_lifecycle", out: "payments.png" }),
        call(3, "projects_import", { path: "payments.json" }),
        call(4, "projects_import", { path: "missing.json" }),
        call(5, "export_markdown", {})
      ],
      { files, editor }
    );
    expect(byId[1].result.structuredContent).toEqual({ name: "payments.md", written: "docs/payments.md" });
    expect(files.text("docs/payments.md")).toBe("# Payments");
    expect(byId[2].result.structuredContent).toEqual({ name: "payments.png", written: "payments.png" });
    expect(Buffer.from(files.text("payments.png")).toString()).toBe("PNG");
    expect(editor.calls[1]).toEqual({ name: "export.png", args: { canvas: "cnv_lifecycle" } });
    expect(editor.calls[2]).toEqual({ name: "projects.import", args: { text: PAYMENTS } });
    expect(byId[4].result.structuredContent.error).toMatchObject({ code: "FILE", details: { file: "missing.json" } });
    expect(byId[5].result.structuredContent).toEqual({ name: "payments.md", text: "# Payments" });
  });

  it("opens and creates the files a path names on the file host, paired or not", async () => {
    const editor = pairedEditor();
    const files = memoryFiles({ "payments.json": PAYMENTS });
    const { byId } = await serve(
      [HELLO, call(1, "projects_open", { path: "payments.json" }), call(2, "document_summary")],
      { files, editor }
    );
    expect(byId[1].result.structuredContent.project.id).toBe("prj_payments");
    expect(editor.calls).toEqual([{ name: "document.summary", args: {} }]);
  });

  it("says where this server's bridge listens when it asks for pairing", async () => {
    const editor = { ...pairedEditor(), state: () => ({ status: "none" }), address: () => "127.0.0.1:47616" };
    const { byId } = await serve(
      [HELLO, call(1, "view_open", { canvas: "cnv_lifecycle" }), call(2, "document_summary")],
      {
        editor
      }
    );
    for (const id of [1, 2]) {
      expect(byId[id].result.structuredContent.error.message).toContain(
        "and its Connect an AI… (on the Projects screen, or a project's menu or ⌘K), at the address 127.0.0.1:47616,"
      );
    }
  });

  it("answers EDITOR_GONE once the tab has gone, even with --file, until the agent disconnects", async () => {
    const editor = pairedEditor();
    editor.gone();
    const { byId } = await serve(
      [HELLO, call(1, "document_summary"), call(2, "editor_disconnect"), call(3, "document_summary")],
      { files: memoryFiles({ "payments.json": PAYMENTS }), file: "payments.json", editor }
    );
    expect(byId[1].result.structuredContent.error.code).toBe("EDITOR_GONE");
    expect(byId[2].result.structuredContent).toEqual({ disconnected: true });
    expect(byId[3].result.structuredContent.project.id).toBe("prj_payments");
  });
});
