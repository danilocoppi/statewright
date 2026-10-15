// The bridge between the MCP server and an Editor tab (AI interface spec §6; §10: "pairing (right code, wrong code,
// expired code), origin and token checks, a call answered, a call timed out, a tab gone; against a fake tab").
import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { CODE_ALPHABET, EDITOR_ORIGIN, createBridge, normalCode } from "../../src/mcp/bridge.js";
import { fakeTab } from "./tab.js";

const bridges = [];
const tabs = [];

/** A bridge on a free port, closed after the test. */
async function bridgeOn(options = {}) {
  const logged = [];
  const bridge = createBridge({ log: line => logged.push(line), ...options });
  bridges.push(bridge);
  const { port } = await bridge.listen(0);
  return { bridge, port, logged, address: `127.0.0.1:${port}` };
}

/** A fake tab of the Editor, closed after the test. */
function tabAt(address, options) {
  const tab = fakeTab(address, options);
  tabs.push(tab);
  return tab;
}

/** The agent brings the code: tried again while the tab's code has not reached the bridge yet. */
async function bring(bridge, code, agent) {
  for (;;) {
    const outcome = await bridge.pair(code, agent);
    if (outcome.error?.code !== "NOT_FOUND") return outcome;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

/** Pair a tab showing `code`: the agent brings the code, the tab gets its token and listens. */
async function paired(bridge, address, { code = "K7Q2MX", agent = "claude-code", ...options } = {}) {
  const tab = tabAt(address, options);
  const listening = tab.register(code).then(registered => {
    expect(registered.status).toBe(200);
    return tab.listen();
  });
  const pairing = await bring(bridge, code, agent);
  expect(await listening).toBe(200);
  return { tab, pairing };
}

afterEach(async () => {
  for (const tab of tabs.splice(0)) tab.close();
  await Promise.all(bridges.splice(0).map(bridge => bridge.close()));
});

describe("the bridge's codes (AI interface spec §6)", () => {
  it("reads a code as the person types it, and only six characters that cannot be misheard", () => {
    expect(normalCode("K7Q-2MX")).toBe("K7Q2MX");
    expect(normalCode(" k7q 2mx ")).toBe("K7Q2MX");
    expect(normalCode("K7Q-2M")).toBe(null);
    expect(normalCode("K7Q-2M0")).toBe(null);
    expect(normalCode(42)).toBe(null);
    for (const char of "01ILO") expect(CODE_ALPHABET).not.toContain(char);
  });
});

describe("pairing an Editor tab (AI interface spec §6)", () => {
  it("pairs the tab that shows the code the agent brings, and names the agent to it", async () => {
    const { bridge, address, logged } = await bridgeOn();
    expect(bridge.state()).toEqual({ status: "none" });
    const tab = tabAt(address);
    const registered = tab.register("K7Q-2MX");
    const listening = registered.then(() => tab.listen());
    const pairing = bring(bridge, "k7q2mx", "claude-code");
    expect(await registered).toEqual({ status: 200, body: { token: expect.any(String), agent: "claude-code" } });
    await listening;
    expect(await pairing).toEqual({ ok: true, result: { paired: true, agent: "claude-code", address } });
    expect(bridge.state()).toEqual({ status: "paired", agent: "claude-code" });
    expect(logged).toContain("paired with an Editor tab for claude-code");
  });

  it("says a code no tab shows is wrong, and a code that waited too long has expired", async () => {
    const { bridge, address } = await bridgeOn({ codeMs: 50 });
    expect(await bridge.pair("ABC-DEF", "claude-code")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", message: expect.stringMatching(/^No Editor tab shows the code ABC-DEF: ask/) }
    });
    expect(await bridge.pair("ABC", "claude-code")).toMatchObject({
      error: { code: "BAD_ARGUMENTS", details: { path: "code" } }
    });
    const tab = tabAt(address);
    expect(await tab.register("K7Q-2MX")).toEqual({ status: 410, body: { error: "expired" } });
    expect(await bridge.pair("K7Q-2MX", "claude-code")).toMatchObject({
      error: { code: "NOT_FOUND", details: { expired: true } }
    });
  });

  it("says where this server's bridge listens when no tab shows the code, so the person can look there", async () => {
    const { bridge, address } = await bridgeOn({ codeMs: 50 });
    const unknown = await bridge.pair("ABC-DEF", "claude-code");
    expect(unknown.error.message).toContain(`this server's bridge is at ${address}`);
    expect(unknown.error.details).toEqual({ address });
    await tabAt(address).register("K7Q-2MX");
    expect((await bridge.pair("K7Q-2MX", "claude-code")).error.details).toEqual({ expired: true, address });
  });

  it("forgets the code of a tab that stops waiting", async () => {
    const { bridge, address } = await bridgeOn();
    const tab = tabAt(address);
    const registered = tab.register("K7Q-2MX").catch(() => "stopped");
    await new Promise(resolve => setTimeout(resolve, 20));
    tab.close();
    expect(await registered).toBe("stopped");
    await new Promise(resolve => setTimeout(resolve, 20));
    expect((await bridge.pair("K7Q-2MX")).error.code).toBe("NOT_FOUND");
  });

  it("answers only the Editor's origins, and only the session's token", async () => {
    const { bridge, address } = await bridgeOn({ origins: ["https://editor.example.com"] });
    const elsewhere = await fetch(`http://${address}/pair`, {
      method: "POST",
      headers: { origin: "https://evil.example.com", "content-type": "application/json" },
      body: JSON.stringify({ code: "K7Q2MX" })
    });
    expect(elsewhere.status).toBe(403);
    expect(elsewhere.headers.get("access-control-allow-origin")).toBe(null);
    const nowhere = await fetch(`http://${address}/calls`);
    expect(nowhere.status).toBe(403);
    // The published Editor asks first, as a page asks before it reaches the local network.
    const asked = await fetch(`http://${address}/pair`, {
      method: "OPTIONS",
      headers: {
        origin: "https://editor.example.com",
        "access-control-request-method": "POST",
        "access-control-request-private-network": "true"
      }
    });
    expect(asked.status).toBe(204);
    expect(asked.headers.get("access-control-allow-origin")).toBe("https://editor.example.com");
    expect(asked.headers.get("access-control-allow-private-network")).toBe("true");

    const { tab } = await paired(bridge, address, { origin: "https://editor.example.com" });
    const stranger = tabAt(address);
    expect(await stranger.listen()).toBe(401);
    const forged = await fetch(`http://${address}/results`, {
      method: "POST",
      headers: { origin: "http://localhost:5173", authorization: "Bearer nope", "content-type": "application/json" },
      body: JSON.stringify({ id: 1, outcome: { ok: true, result: {} } })
    });
    expect(forged.status).toBe(401);
    expect(tab.token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("answers the published Editor without being told where it is", async () => {
    const { bridge, address } = await bridgeOn();
    const asked = await fetch(`http://${address}/pair`, {
      method: "OPTIONS",
      headers: { origin: EDITOR_ORIGIN, "access-control-request-method": "POST" }
    });
    expect(EDITOR_ORIGIN).toBe("https://statewright.cpss.com.br");
    expect(asked.status).toBe(204);
    expect(asked.headers.get("access-control-allow-origin")).toBe(EDITOR_ORIGIN);
    const { tab } = await paired(bridge, address, { origin: EDITOR_ORIGIN });
    expect(tab.token).toBeTruthy();
    const lookalike = await fetch(`http://${address}/pair`, {
      method: "OPTIONS",
      headers: { origin: "https://statewright.cpss.com.br.evil.example", "access-control-request-method": "POST" }
    });
    expect(lookalike.status).toBe(403);
  });

  it("listens on 127.0.0.1 alone, at the port asked or the next free one", async () => {
    const taken = createServer();
    await new Promise(resolve => taken.listen({ host: "127.0.0.1", port: 0 }, resolve));
    const busy = taken.address().port;
    const logged = [];
    const bridge = createBridge({ log: line => logged.push(line) });
    bridges.push(bridge);
    const { port } = await bridge.listen(busy);
    taken.close();
    expect(port).toBeGreaterThan(busy);
    expect(bridge.address()).toBe(`127.0.0.1:${port}`);
    expect(logged).toEqual([`bridge on http://127.0.0.1:${port} (${busy} was taken)`]);
  });
});

describe("calls through the bridge (AI interface spec §6)", () => {
  it("runs a call in the paired tab and answers what the tab answered", async () => {
    const { bridge, address } = await bridgeOn();
    await paired(bridge, address, {
      answer: ({ name, args }) => ({ ok: true, result: { name, canvas: args.canvas } })
    });
    expect(await bridge.call("level.get", { canvas: "cnv_a" })).toEqual({
      ok: true,
      result: { name: "level.get", canvas: "cnv_a" }
    });
  });

  it("answers TIMEOUT when the tab does not answer within the time a call may wait", async () => {
    const { bridge, address } = await bridgeOn({ callMs: 80 });
    await paired(bridge, address, { answer: () => new Promise(() => {}) });
    expect(await bridge.call("document.summary", {})).toMatchObject({
      ok: false,
      error: { code: "TIMEOUT", message: expect.stringMatching(/did not answer document\.summary within 0\.08 s/) }
    });
  });

  it("answers INTERNAL when the tab answers something that is not a result", async () => {
    const { bridge, address } = await bridgeOn();
    await paired(bridge, address, { answer: () => ({ fine: true }) });
    expect((await bridge.call("document.summary", {})).error.code).toBe("INTERNAL");
  });

  it("answers EDITOR_GONE once the tab has gone, the call it was running included, until a tab pairs again", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address, { answer: () => new Promise(() => {}) });
    const running = bridge.call("document.summary", {});
    await new Promise(resolve => setTimeout(resolve, 20));
    tab.close();
    expect(await running).toMatchObject({ ok: false, error: { code: "EDITOR_GONE" } });
    expect(bridge.state()).toMatchObject({ status: "gone", reason: "closed" });
    expect(await bridge.call("document.summary", {})).toMatchObject({ error: { code: "EDITOR_GONE" } });
    await paired(bridge, address, { code: "222-333" });
    expect(bridge.state().status).toBe("paired");
  });

  it("ends the session when the person disconnects, or the agent does", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    expect((await tab.disconnect()).status).toBe(204);
    expect(bridge.state()).toMatchObject({ status: "gone", reason: "person" });
    expect((await bridge.call("document.summary", {})).error.message).toMatch(/^The person disconnected the Editor/);
    const second = await paired(bridge, address, { code: "222-333" });
    expect(bridge.disconnect()).toEqual({ ok: true, result: { disconnected: true } });
    await second.tab.closed();
    expect(second.tab.seen.at(-1)).toEqual({ event: "bye", data: { reason: "agent" } });
    expect(bridge.state()).toEqual({ status: "none" });
    expect(bridge.disconnect()).toEqual({ ok: true, result: { disconnected: false } });
  });

  it("pairs another tab only once the person lets the first hand over", async () => {
    const { bridge, address } = await bridgeOn();
    const first = await paired(bridge, address);
    const second = tabAt(address);
    const waiting = second.register("222-333");
    const kept = bring(bridge, "222-333", "claude-code");
    await expect.poll(() => first.tab.seen.find(message => message.event === "confirm")).toBeTruthy();
    const asked = first.tab.seen.find(message => message.event === "confirm").data;
    expect(asked).toEqual({ id: expect.any(String), agent: "claude-code" });
    await first.tab.confirm(asked.id, false);
    expect(await kept).toMatchObject({ ok: false, error: { code: "NOT_ALLOWED" } });
    expect(bridge.state().status).toBe("paired");

    const handed = bridge.pair("222-333", "claude-code");
    await expect.poll(() => first.tab.seen.filter(message => message.event === "confirm").length).toBe(2);
    await first.tab.confirm(first.tab.seen.filter(message => message.event === "confirm")[1].data.id, true);
    expect((await waiting).status).toBe(200);
    await second.listen();
    expect((await handed).ok).toBe(true);
    await first.tab.closed();
    expect(first.tab.seen.at(-1)).toEqual({ event: "bye", data: { reason: "replaced" } });
  });

  it("takes the question back from the paired tab when nobody answers it in time", async () => {
    const { bridge, address } = await bridgeOn({ callMs: 80 });
    const first = await paired(bridge, address);
    // The second tab waits until the test ends, which aborts its request.
    tabAt(address)
      .register("222-333")
      .catch(() => {});
    const asked = await bring(bridge, "222-333", "claude-code");
    expect(asked.error).toMatchObject({
      code: "TIMEOUT",
      message: expect.stringMatching(/answer in the tab already paired/)
    });
    const id = first.tab.seen.find(message => message.event === "confirm").data.id;
    await expect.poll(() => first.tab.seen.at(-1)).toEqual({ event: "withdrawn", data: { id } });
    expect(bridge.state().status).toBe("paired");
  });

  it("pairs the tab waiting when the paired one goes away while it is asked", async () => {
    const { bridge, address } = await bridgeOn();
    const first = await paired(bridge, address);
    const second = tabAt(address);
    const listening = second.register("222-333").then(() => second.listen());
    const pairing = bring(bridge, "222-333", "codex");
    await expect.poll(() => first.tab.seen.some(message => message.event === "confirm")).toBe(true);
    first.tab.close();
    expect(await pairing).toMatchObject({ ok: true, result: { agent: "codex" } });
    expect(await listening).toBe(200);
    expect(bridge.state()).toEqual({ status: "paired", agent: "codex" });
  });

  it("keeps the paired tab when the tab it would hand over to has stopped waiting", async () => {
    const { bridge, address } = await bridgeOn({ callMs: 2000 });
    const first = await paired(bridge, address);
    const second = tabAt(address);
    const waiting = second.register("222-333").catch(() => "stopped");
    // Once the code has reached the bridge: from then on, NOT_FOUND is the answer this test is about.
    await new Promise(resolve => setTimeout(resolve, 50));
    const handing = bridge.pair("222-333", "codex");
    await expect.poll(() => first.tab.seen.find(message => message.event === "confirm")).toBeTruthy();
    second.close();
    expect(await waiting).toBe("stopped");
    await new Promise(resolve => setTimeout(resolve, 20));
    await first.tab.confirm(first.tab.seen.find(message => message.event === "confirm").data.id, true);
    expect((await handing).error).toMatchObject({
      code: "NOT_FOUND",
      message: expect.stringMatching(/stopped waiting/)
    });
    expect(bridge.state()).toEqual({ status: "paired", agent: "claude-code" });
    expect(first.tab.seen.some(message => message.event === "bye")).toBe(false);
  });

  it("answers EDITOR_GONE when the tab handed over to never listens, rather than moving to a file", async () => {
    const { bridge, address } = await bridgeOn({ callMs: 100 });
    const first = await paired(bridge, address);
    const second = tabAt(address);
    const registered = second.register("222-333");
    const handing = bring(bridge, "222-333", "codex");
    await expect.poll(() => first.tab.seen.find(message => message.event === "confirm")).toBeTruthy();
    await first.tab.confirm(first.tab.seen.find(message => message.event === "confirm").data.id, true);
    expect((await registered).status).toBe(200);
    expect((await handing).error.code).toBe("TIMEOUT");
    expect(bridge.state()).toMatchObject({ status: "gone", reason: "closed" });
  });

  it("stays unpaired when a first pairing's tab never listens", async () => {
    const { bridge, address } = await bridgeOn({ callMs: 50 });
    const tab = tabAt(address);
    const registered = tab.register("K7Q-2MX");
    expect((await bring(bridge, "K7Q-2MX", "claude-code")).error.code).toBe("TIMEOUT");
    expect((await registered).status).toBe(200);
    expect(bridge.state()).toEqual({ status: "none" });
  });

  it("reads no more than a code from a tab that registers one", async () => {
    const { address } = await bridgeOn();
    const response = await fetch(`http://${address}/pair`, {
      method: "POST",
      headers: { origin: "http://localhost:5173", "content-type": "application/json" },
      body: JSON.stringify({ code: "K7Q-2MX", padding: "x".repeat(4096) })
    });
    expect(response.status).toBe(413);
  });

  it("tells the paired tab, and the tabs waiting, when the server stops", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    const waiting = tabAt(address).register("222-333");
    await new Promise(resolve => setTimeout(resolve, 20));
    await bridge.close();
    await tab.closed();
    expect(tab.seen.at(-1)).toEqual({ event: "bye", data: { reason: "server" } });
    expect((await waiting).status).toBe(503);
  });

  it("adds under 50 ms to a call (spec §11)", async () => {
    const { bridge, address } = await bridgeOn();
    await paired(bridge, address);
    await bridge.call("document.summary", {});
    const times = [];
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      await bridge.call("document.summary", {});
      times.push(performance.now() - started);
    }
    times.sort((a, b) => a - b);
    expect(times[10]).toBeLessThan(50);
  });
});

/** Let the bridge's events reach the tab. */
const settle = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));

describe("messages from the person (collaboration spec §3.2)", () => {
  it("takes a message from the paired tab only, and only a message", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    const stranger = tabAt(address);
    expect((await stranger.send({ text: "hi" })).status).toBe(401);
    expect(await tab.send({ text: "these need a timeout", context: { level: { id: "cnv_a" } } })).toEqual({
      status: 202,
      body: { id: "msg_1" }
    });
    expect((await tab.send({ context: {} })).status).toBe(400);
    expect((await tab.send({ text: "" })).status).toBe(400);
    expect((await tab.send({ text: "x".repeat(8 * 1024 * 1024 + 1) })).status).toBe(413);
    expect(bridge.unread()).toBe(1);
  });

  it("hands a waiting agent the message as soon as it comes, says it is read, and says while it listens", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    const waiting = bridge.wait(5);
    await settle();
    expect(tab.events("listening")).toEqual([{ listening: true, channel: false }]);
    await tab.send({ text: "hello", context: { level: { id: "cnv_a" } } });
    const { result } = await waiting;
    expect(result.messages).toMatchObject([{ id: "msg_1", text: "hello", context: { level: { id: "cnv_a" } } }]);
    await settle();
    expect(tab.events("read")).toEqual([{ ids: ["msg_1"] }]);
    expect(tab.events("listening").at(-1)).toEqual({ listening: false, channel: false });
    expect(bridge.inbox()).toEqual({ ok: true, result: { messages: [] } });
  });

  it("ends a wait at once when the tab goes, and a new pairing starts with nothing", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    await tab.send({ text: "old" });
    const waiting = bridge.wait(600);
    expect((await waiting).result.messages.map(message => message.text)).toEqual(["old"]);
    const pending = bridge.wait(600);
    await settle();
    await tab.disconnect();
    expect(await pending).toMatchObject({ ok: false, error: { code: "EDITOR_GONE" } });
    const next = await paired(bridge, address, { code: "222-333" });
    await next.tab.send({ text: "new" });
    expect(bridge.inbox().result.messages.map(message => message.text)).toEqual(["new"]);
  });

  it("shows the agent's reply in the tab, reads what it answers, and learns the Channel is live", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    await tab.send({ text: "by the channel" });
    expect(bridge.reply({ text: "Done", to: "msg_1", point: ["nod_a"] })).toEqual({
      ok: true,
      result: { replied: "rpl_1" }
    });
    await settle();
    expect(tab.events("reply")).toEqual([{ id: "rpl_1", text: "Done", to: "msg_1", point: ["nod_a"] }]);
    expect(tab.events("read")).toEqual([{ ids: ["msg_1"] }]);
    expect(tab.events("listening")).toEqual([{ listening: false, channel: true }]);
    await tab.send({ text: "by waiting" });
    bridge.inbox();
    bridge.reply({ text: "Again", to: "msg_2" });
    await settle();
    expect(tab.events("listening")).toHaveLength(1);
    expect(bridge.reply({ text: "" }).error.code).toBe("BAD_ARGUMENTS");
    expect(bridge.reply({ text: "Lost", to: "msg_9" }).error.code).toBe("NOT_FOUND");
  });

  it("is stopping from the person's Stop until the agent reads it", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    expect(bridge.stopping()).toBe(false);
    await tab.send({ stop: true });
    expect(bridge.stopping()).toBe(true);
    expect(bridge.inbox().result.messages).toMatchObject([{ id: "msg_1", stop: true }]);
    expect(bridge.stopping()).toBe(false);
  });

  it("tells who listens for messages each one, the stop included", async () => {
    const { bridge, address } = await bridgeOn();
    const { tab } = await paired(bridge, address);
    const heard = [];
    const stop = bridge.onMessage(message => heard.push(message.id));
    await tab.send({ text: "one" });
    await tab.send({ stop: true });
    stop();
    await tab.send({ text: "three" });
    expect(heard).toEqual(["msg_1", "msg_2"]);
  });

  it("answers as the other calls do when no tab is paired", async () => {
    const { bridge } = await bridgeOn();
    expect((await bridge.wait(1)).error.code).toBe("EDITOR_GONE");
    expect(bridge.inbox().error.code).toBe("EDITOR_GONE");
    expect(bridge.reply({ text: "hi" }).error.code).toBe("EDITOR_GONE");
    expect(bridge.unread()).toBe(0);
    expect(bridge.stopping()).toBe(false);
  });
});
