// The MCP server as an MCP client meets it (AI interface spec §10: "the JSON-RPC handshake, tools/list …, tools/call
// results and errors over a real stdio child process"; §14, A2: "An MCP client lists the tools and edits, simulates,
// audits and exports a file through them").
import { spawn, spawnSync } from "node:child_process";
import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXAMPLE, workspace } from "../cli/helpers.js";
import { fakeTab } from "./tab.js";

const BIN = fileURLToPath(new URL("../../src/cli/bin.js", import.meta.url));

/** `statewright mcp` in a child process, with a client that sends requests and waits for their answers. */
function start(args, cwd) {
  const child = spawn(process.execPath, [BIN, "mcp", "--port", "0", ...args], { cwd, stdio: ["pipe", "pipe", "pipe"] });
  const lines = [];
  const waiting = new Map();
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    stdout += chunk;
    let end;
    while ((end = stdout.indexOf("\n")) >= 0) {
      const line = stdout.slice(0, end);
      stdout = stdout.slice(end + 1);
      lines.push(line);
      const message = JSON.parse(line);
      waiting.get(message.id)?.(message);
    }
  });
  child.stderr.on("data", chunk => (stderr += chunk));
  // A server that ends answers nothing more: every request still waiting gets its exit code instead.
  child.on("close", code => {
    for (const resolve of waiting.values()) resolve({ closed: code, stderr });
  });
  let next = 0;
  const send = text => child.stdin.write(`${text}\n`);
  const request = (method, params) => {
    const id = (next += 1);
    const answered = new Promise(resolve => waiting.set(id, resolve));
    send(JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }));
    return answered;
  };
  const tool = async (name, args) => (await request("tools/call", { name, arguments: args })).result;
  const end = () => {
    child.stdin.end();
    return new Promise(resolve => child.on("close", code => resolve({ code, stderr, lines })));
  };
  /** Where the bridge listens, once it says so on stderr. */
  const address = async () => {
    for (;;) {
      const found = /bridge on http:\/\/(127\.0\.0\.1:\d+)/.exec(stderr);
      if (found) return found[1];
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };
  return { child, send, request, tool, end, waiting, address };
}

describe("statewright mcp (AI interface spec §5)", () => {
  it("lists its tools, and edits, simulates, audits and exports a file through them", async () => {
    const dir = await workspace();
    await copyFile(EXAMPLE, join(dir, "payments.sttw"));
    const mcp = start(["--file", "payments.sttw"], dir);

    const hello = await mcp.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0" }
    });
    expect(hello.result).toMatchObject({ protocolVersion: "2025-06-18", serverInfo: { name: "statewright" } });
    mcp.send(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }));
    const { tools } = (await mcp.request("tools/list")).result;
    expect(tools).toHaveLength(46);
    expect(tools.map(item => item.name)).toEqual(expect.arrayContaining(["batch_apply", "run_step", "audit_report"]));

    const applied = await mcp.tool("batch_apply", {
      label: "A state for late payers",
      commands: [
        { type: "catalog.add", args: { collection: "events", item: { name: "late.notice" } } },
        { type: "node.add", args: { canvas: "cnv_expiryClock", node: { kind: "state", name: "late" } } },
        {
          type: "edge.add",
          args: { canvas: "cnv_expiryClock", edge: { from: "nod_running", to: "nod_late", on: ["evt_lateNotice"] } }
        },
        {
          type: "edge.add",
          args: { canvas: "cnv_expiryClock", edge: { from: "nod_late", to: "nod_stopped", on: ["evt_payinDetected"] } }
        }
      ]
    });
    expect(applied.structuredContent.created).toEqual([
      "evt_lateNotice",
      "nod_late",
      "edg_runningLate",
      "edg_lateStopped"
    ]);

    await mcp.tool("run_start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
    const stepped = await mcp.tool("run_step", { do: { event: "evt_verifyStarted" } });
    expect(stepped.structuredContent.point.active).toContain("nod_expiryClock/nod_paused");
    expect((await mcp.tool("scenario_save", { name: "Verification starts" })).structuredContent).toEqual({
      id: "scn_verificationStarts"
    });
    expect((await mcp.tool("run_stop", {})).structuredContent).toEqual({ stopped: true });

    const audit = await mcp.tool("audit_report", {});
    expect(audit.structuredContent.summary).toMatchObject({ error: 0, scenarios: 3, diverged: 0 });

    const exported = await mcp.tool("export_document", { out: "copy/payments.sttw" });
    expect(exported.structuredContent).toEqual({
      name: "payments.sttw",
      written: "copy/payments.sttw"
    });
    const verified = spawnSync(process.execPath, [BIN, "verify", join(dir, "copy/payments.sttw"), "--json"], {
      encoding: "utf8"
    });
    expect(verified.status).toBe(0);
    const copy = JSON.parse(await readFile(join(dir, "copy/payments.sttw"), "utf8"));
    expect(copy.generator).toMatchObject({ channel: "api", agent: "test-client" });
    expect(copy.annotations.scenarios.scn_verificationStarts.steps).toHaveLength(1);

    const { code, stderr, lines } = await mcp.end();
    expect(code).toBe(0);
    for (const line of lines) expect(JSON.parse(line).jsonrpc).toBe("2.0");
    expect(stderr).toContain("statewright mcp: ready: 46 tools, on payments.sttw by default\n");
    expect(stderr).toContain("statewright mcp: connected to test-client\n");
  });

  it("goes on after a line that is not JSON and a file it cannot read; finds files from where it runs, or by their full path", async () => {
    const dir = await workspace();
    const mcp = start([], dir);
    const answered = new Promise(resolve => mcp.waiting.set(null, resolve));
    mcp.send("{nope");
    expect((await answered).error).toEqual({ code: -32700, message: "Not JSON" });
    const missing = await mcp.tool("document_summary", { file: "missing.sttw" });
    expect(missing).toMatchObject({
      isError: true,
      structuredContent: { error: { code: "FILE", message: "Cannot read missing.sttw: no such file" } }
    });
    expect((await mcp.tool("document_summary", {})).structuredContent.error.code).toBe("NOT_PAIRED");
    await copyFile(EXAMPLE, join(dir, "payments.sttw"));
    const relative = await mcp.tool("document_summary", { file: "payments.sttw" });
    const absolute = await mcp.tool("document_summary", { file: join(dir, "payments.sttw") });
    expect(relative.structuredContent.project.id).toBe("prj_payments");
    expect(absolute.structuredContent).toEqual(relative.structuredContent);
    expect((await mcp.request("ping")).result).toEqual({});
    expect((await mcp.end()).code).toBe(0);
  });

  it("pairs with an Editor tab through its bridge, runs the calls without file there, and writes their out (§6)", async () => {
    const dir = await workspace();
    await copyFile(EXAMPLE, join(dir, "payments.sttw"));
    const mcp = start(["--file", "payments.sttw"], dir);
    await mcp.request("initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "test-client" } });
    const tab = fakeTab(await mcp.address(), {
      answer: ({ name, args }) =>
        name === "export.markdown" ?
          { ok: true, result: { name: "payments.md", text: "# Payments" } }
        : { ok: true, result: { project: { id: "prj_inTheTab", name: "In the tab" }, args } }
    });
    const registered = tab.register("K7Q-2MX");
    const listening = registered.then(() => tab.listen());
    // The person reads the code once the tab shows it: until it reaches the bridge, the agent is told no tab shows it.
    let pairing;
    do pairing = await mcp.tool("editor_pair", { code: "k7q 2mx" });
    while (pairing.structuredContent.error?.code === "NOT_FOUND");
    expect(await registered).toMatchObject({ status: 200, body: { agent: "test-client" } });
    await listening;
    expect(pairing.structuredContent).toEqual({
      paired: true,
      agent: "test-client",
      address: await mcp.address()
    });
    expect((await mcp.tool("document_summary", {})).structuredContent.project.id).toBe("prj_inTheTab");
    expect((await mcp.tool("export_markdown", { out: "out/payments.md" })).structuredContent).toEqual({
      name: "payments.md",
      written: "out/payments.md"
    });
    expect(await readFile(join(dir, "out/payments.md"), "utf8")).toBe("# Payments");
    tab.close();
    await tab.closed();
    const gone = await mcp.tool("document_summary", {});
    expect(gone.structuredContent.error.code).toBe("EDITOR_GONE");
    expect((await mcp.tool("editor_disconnect", {})).structuredContent).toEqual({ disconnected: false });
    expect((await mcp.tool("document_summary", {})).structuredContent.project.id).toBe("prj_payments");
    const { code, stderr } = await mcp.end();
    expect(code).toBe(0);
    expect(stderr).toContain("statewright mcp: paired with an Editor tab for test-client\n");
  });

  it("answers a call the Editor is running when its client stops sending, with what the Editor answered", async () => {
    const dir = await workspace();
    const mcp = start([], dir);
    await mcp.request("initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "test-client" } });
    const tab = fakeTab(await mcp.address(), {
      answer: () =>
        new Promise(resolve => setTimeout(() => resolve({ ok: true, result: { project: { id: "prj_late" } } }), 300))
    });
    const listening = tab.register("K7Q-2MX").then(() => tab.listen());
    let paired;
    do paired = await mcp.tool("editor_pair", { code: "K7Q-2MX" });
    while (paired.structuredContent.error?.code === "NOT_FOUND");
    await listening;
    const answered = mcp.tool("document_summary", {});
    await new Promise(resolve => setTimeout(resolve, 50));
    const ended = mcp.end();
    expect((await answered).structuredContent).toEqual({ project: { id: "prj_late" } });
    expect((await ended).code).toBe(0);
    tab.close();
  });

  it("stops at once when its client goes while a tab it paired has not listened yet", async () => {
    const dir = await workspace();
    const mcp = start([], dir);
    await mcp.request("initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "test-client" } });
    const tab = fakeTab(await mcp.address());
    const registered = tab.register("K7Q-2MX");
    await new Promise(resolve => setTimeout(resolve, 50));
    mcp.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 99,
        method: "tools/call",
        params: { name: "editor_pair", arguments: { code: "K7Q-2MX" } }
      })
    );
    expect((await registered).status).toBe(200);
    const started = performance.now();
    expect((await mcp.end()).code).toBe(0);
    expect(performance.now() - started).toBeLessThan(2000);
    tab.close();
  });

  it("stops at once when its client goes, even while it asks a tab whether to hand over", async () => {
    const dir = await workspace();
    const mcp = start([], dir);
    await mcp.request("initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "test-client" } });
    const address = await mcp.address();
    const first = fakeTab(address);
    const listening = first.register("K7Q-2MX").then(() => first.listen());
    let paired;
    do paired = await mcp.tool("editor_pair", { code: "K7Q-2MX" });
    while (paired.structuredContent.error?.code === "NOT_FOUND");
    await listening;
    const second = fakeTab(address);
    second.register("222-333").catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 50));
    mcp.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 99,
        method: "tools/call",
        params: { name: "editor_pair", arguments: { code: "222-333" } }
      })
    );
    await expect.poll(() => first.seen.some(message => message.event === "confirm")).toBe(true);
    const started = performance.now();
    const { code } = await mcp.end();
    expect(code).toBe(0);
    expect(performance.now() - started).toBeLessThan(2000);
    second.close();
  });
});
