// The person writing to the agent through the MCP server (collaboration spec §3): the Channel's notifications, the
// waiting beside the queue, the notice in every answer, Stop — a server over a real bridge and a fake Editor tab.
import { afterEach, describe, expect, it } from "vitest";
import { memoryFiles } from "../../src/agent/index.js";
import { createBridge } from "../../src/mcp/bridge.js";
import { serveMcp } from "../../src/mcp/serve.js";
import { fakeTab } from "./tab.js";

const open = [];

afterEach(async () => {
  for (const close of open.splice(0)) await close();
});

/** Lines given to the server one at a time, as a client writes them. */
function feed() {
  const queue = [];
  let wake = null;
  let ended = false;
  return {
    push(message) {
      queue.push(JSON.stringify(message));
      wake?.();
    },
    end() {
      ended = true;
      wake?.();
    },
    async *lines() {
      for (;;) {
        while (queue.length) yield queue.shift();
        if (ended) return;
        await new Promise(resolve => (wake = resolve));
        wake = null;
      }
    }
  };
}

/** A server whose bridge has a tab paired, answering every call with `answer`. */
async function served({ answer } = {}) {
  const bridge = createBridge();
  const { port } = await bridge.listen(0);
  const address = `127.0.0.1:${port}`;
  const tab = fakeTab(address, { answer });
  const input = feed();
  const written = [];
  const waiters = new Map();
  const serving = serveMcp({
    files: memoryFiles({}),
    version: "0.1.0",
    lines: input.lines(),
    write: line => {
      const message = JSON.parse(line);
      written.push(message);
      waiters.get(message.id)?.(message);
    },
    editor: bridge
  });
  open.push(async () => {
    tab.close();
    input.end();
    await bridge.close();
    await serving;
  });
  /** Send a request and wait for its answer. */
  const request = (id, method, params = {}) => {
    const answered = new Promise(resolve => waiters.set(id, resolve));
    input.push({ jsonrpc: "2.0", id, method, params });
    return answered;
  };
  const call = (id, name, args = {}) => request(id, "tools/call", { name, arguments: args });
  await request(0, "initialize", { clientInfo: { name: "claude-code" } });
  const listening = tab.register("K7Q2MX").then(() => tab.listen());
  for (;;) {
    const answer = await call(`pair-${written.length}`, "editor_pair", { code: "K7Q-2MX" });
    if (!answer.result.isError) break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  await listening;
  return { tab, call, written, bridge };
}

const notifications = written => written.filter(message => message.method === "notifications/claude/channel");
const settle = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));

describe("the person writes to the agent (collaboration spec §3)", () => {
  it("sends each message to the Channel, with what goes with it", async () => {
    const { tab, written } = await served();
    await tab.send({
      text: "these need a timeout",
      context: {
        project: { id: "prj_payments", name: "Payments" },
        level: { id: "cnv_lifecycle", name: "Lifecycle engine" },
        selection: [{ id: "nod_running", name: "running", kind: "state", level: "cnv_lifecycle" }]
      }
    });
    await settle();
    expect(notifications(written)).toEqual([
      {
        jsonrpc: "2.0",
        method: "notifications/claude/channel",
        params: {
          content: "these need a timeout\n\nLevel: Lifecycle engine (cnv_lifecycle)\nSelected: running (nod_running)",
          meta: { message: "msg_1", level: "cnv_lifecycle" }
        }
      }
    ]);
  });

  it("waits for a message beside the queue: the agent's other calls answer meanwhile", async () => {
    const { tab, call } = await served({ answer: () => ({ ok: true, result: { project: "Payments" } }) });
    const waiting = call(1, "editor_wait", { seconds: 30 });
    const summary = await call(2, "document_summary");
    expect(summary.result.structuredContent).toEqual({ project: "Payments" });
    await tab.send({ text: "hello" });
    const waited = await waiting;
    expect(waited.result.structuredContent.messages).toMatchObject([{ id: "msg_1", text: "hello" }]);
  });

  it("tells the agent in every answer that the person wrote, until it reads them", async () => {
    const { tab, call } = await served({ answer: () => ({ ok: true, result: { project: "Payments" } }) });
    await tab.send({ text: "look at this" });
    const summary = await call(1, "document_summary");
    expect(summary.result.structuredContent).toEqual({
      project: "Payments",
      inbox: { unread: 1, note: "The person wrote to you: read editor_inbox" }
    });
    expect(JSON.parse(summary.result.content[0].text).inbox.unread).toBe(1);
    const read = await call(2, "editor_inbox");
    expect(read.result.structuredContent.messages.map(message => message.text)).toEqual(["look at this"]);
    expect((await call(3, "document_summary")).result.structuredContent).toEqual({ project: "Payments" });
  });

  it("stops the agent's work when the person says so, until it reads why", async () => {
    const { tab, call } = await served({ answer: () => ({ ok: true, result: { created: [] } }) });
    await tab.send({ stop: true });
    const stopped = await call(1, "batch_apply", { label: "x", commands: [] });
    expect(stopped.result.isError).toBe(true);
    expect(stopped.result.structuredContent.error).toMatchObject({ code: "STOPPED" });
    expect(
      (await call(2, "guide_read", { section: "nothing like this" })).result.structuredContent.error?.code
    ).not.toBe("STOPPED");
    expect((await call(3, "editor_inbox")).result.structuredContent.messages).toMatchObject([{ stop: true }]);
    expect((await call(4, "batch_apply", { label: "x", commands: [] })).result.isError).toBeUndefined();
  });

  it("shows the agent's reply in the tab", async () => {
    const { tab, call } = await served();
    await tab.send({ text: "?" });
    const replied = await call(1, "editor_reply", { text: "Done", to: "msg_1", point: ["nod_a"] });
    expect(replied.result.structuredContent).toEqual({ replied: "rpl_1" });
    await settle();
    expect(tab.events("reply")).toEqual([{ id: "rpl_1", text: "Done", to: "msg_1", point: ["nod_a"] }]);
  });
});
