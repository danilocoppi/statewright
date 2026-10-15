// A tab pairing with an agent's `statewright mcp` (AI interface spec §6, §7.4), against the real bridge of Core.
import { afterEach, describe, expect, it } from "vitest";

import {
  ADDRESS_KEY,
  BRIDGE_ADDRESS,
  CODE_ALPHABET,
  addressOf,
  createPairing,
  newCode,
  serverCommand
} from "@/agent/pairing";

import { createConversationStore } from "@/conversation/store";

import { createBridge } from "../../../../packages/core/src/mcp/bridge.js";

const opened = [];

/** A bridge on a free port, closed after the test. */
async function bridgeOn(options) {
  const bridge = createBridge(options);
  opened.push(() => bridge.close());
  const { port } = await bridge.listen(0);
  return { bridge, address: `127.0.0.1:${port}` };
}

/** Requests as a page of the Editor at `origin` sends them. */
const fromPage =
  (origin = "http://localhost:5173") =>
  (url, init = {}) =>
    fetch(url, { ...init, headers: { ...init.headers, origin } });

/** Storage in memory, as localStorage keeps it. */
function memoryStorage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, String(value)) };
}

/** A tab's pairing whose calls run on a fake window.statewright that names each call back. */
function tab({
  origin,
  storage = memoryStorage(),
  fetch: request = fromPage(origin),
  conversation = createConversationStore()
} = {}) {
  const hellos = [];
  const ends = [];
  const calls = [];
  const pairing = createPairing({
    api: () => ({
      hello: options => hellos.push(options),
      call: async (name, args) => (calls.push(name), { ok: true, result: { name, args } })
    }),
    fetch: request,
    storage,
    onEnd: (reason, agent) => ends.push({ reason, agent }),
    conversation
  });
  opened.push(() => pairing.disconnect());
  return { pairing, hellos, ends, calls, storage, conversation, state: () => pairing.store.getState() };
}

/** The agent brings the code the tab shows, once it has reached the bridge. */
async function bring(bridge, code, agent = "claude-code") {
  for (;;) {
    const outcome = await bridge.pair(code, agent);
    if (outcome.error?.code !== "NOT_FOUND") return outcome;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

/** A tab paired with `bridge`. */
async function pairedTab(bridge, address, options) {
  const paired = tab(options);
  paired.pairing.begin(address);
  expect(paired.state()).toMatchObject({ status: "waiting", address });
  expect((await bring(bridge, paired.state().code)).ok).toBe(true);
  await expect.poll(() => paired.state().status).toBe("connected");
  return paired;
}

afterEach(async () => {
  for (const close of opened.splice(0).reverse()) await close();
});

describe("pairing a tab with an agent (AI interface spec §6, §7.4)", () => {
  it("shows a code of six characters that cannot be misheard", () => {
    expect(newCode(bytes => bytes.fill(0))).toBe("222-222");
    expect(newCode(bytes => bytes.map((_, index) => index + 8))).toBe("ABC-DEF");
    for (let index = 0; index < 50; index += 1) {
      expect(newCode()).toMatch(new RegExp(`^[${CODE_ALPHABET}]{3}-[${CODE_ALPHABET}]{3}$`));
    }
    expect(addressOf(" http://127.0.0.1:47616/ ")).toBe("127.0.0.1:47616");
  });

  it("pairs when the agent brings the code, and runs the agent's calls on window.statewright, named as the agent", async () => {
    const { bridge, address } = await bridgeOn();
    const paired = await pairedTab(bridge, address);
    expect(paired.state()).toEqual({
      status: "connected",
      code: null,
      address,
      agent: "claude-code",
      handover: null
    });
    expect(paired.hellos).toEqual([{ agent: "claude-code" }]);
    expect(await bridge.call("level.get", { canvas: "cnv_lifecycle" })).toEqual({
      ok: true,
      result: { name: "level.get", args: { canvas: "cnv_lifecycle" } }
    });
    expect(paired.storage.getItem(ADDRESS_KEY)).toBe(address);
  });

  it("looks where the person paired last, else at 127.0.0.1:47615", () => {
    expect(tab().state().address).toBe(BRIDGE_ADDRESS);
    const storage = memoryStorage();
    storage.setItem(ADDRESS_KEY, "127.0.0.1:47620");
    expect(tab({ storage }).state().address).toBe("127.0.0.1:47620");
  });

  it("says when nothing answers at the address, or when the server there does not answer this Editor", async () => {
    const nothing = tab();
    await nothing.pairing.begin("127.0.0.1:9");
    expect(nothing.state().status).toBe("unreachable");
    const { address } = await bridgeOn();
    const elsewhere = tab({ origin: "https://editor.example.com" });
    await elsewhere.pairing.begin(address);
    expect(elsewhere.state().status).toBe("refused");
  });

  it("pairs only with a server on this computer", async () => {
    const asked = [];
    const pairing = createPairing({
      api: () => ({ hello() {}, call: async () => ({ ok: true, result: {} }) }),
      fetch: async url => (asked.push(url), new Response("{}", { status: 200 })),
      storage: memoryStorage()
    });
    await pairing.begin("evil.example:80");
    expect(pairing.store.getState()).toMatchObject({ status: "invalid", address: "evil.example:80" });
    expect(asked).toEqual([]);
    for (const address of ["localhost:47616", "[::1]:47616"]) {
      pairing.begin(address);
      expect(pairing.store.getState().status).toBe("waiting");
      pairing.cancel();
    }
  });

  it("puts the question away when the bridge takes it back", async () => {
    const { bridge, address } = await bridgeOn({ callMs: 100 });
    const first = await pairedTab(bridge, address);
    const second = tab();
    second.pairing.begin(address);
    const asked = bring(bridge, second.state().code, "codex");
    await expect.poll(() => first.state().handover).not.toBe(null);
    expect((await asked).error.code).toBe("TIMEOUT");
    await expect.poll(() => first.state().handover).toBe(null);
    expect(first.state().status).toBe("connected");
  });

  it("says the code has expired when no agent brought it in time", async () => {
    const { address } = await bridgeOn({ codeMs: 50 });
    const waiting = tab();
    await waiting.pairing.begin(address);
    expect(waiting.state().status).toBe("expired");
  });

  it("withdraws its code when the person stops waiting", async () => {
    const { bridge, address } = await bridgeOn();
    const waiting = tab();
    const begun = waiting.pairing.begin(address);
    const { code } = waiting.state();
    await new Promise(resolve => setTimeout(resolve, 30));
    waiting.pairing.cancel();
    await begun;
    expect(waiting.state()).toMatchObject({ status: "off", code: null });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect((await bridge.pair(code, "claude-code")).error.code).toBe("NOT_FOUND");
  });

  it("ends when the person disconnects, when the agent does, or when the server stops, and says why", async () => {
    const { bridge, address } = await bridgeOn();
    const first = await pairedTab(bridge, address);
    first.pairing.disconnect();
    expect(first.state().status).toBe("off");
    expect(first.ends).toEqual([{ reason: "person", agent: "claude-code" }]);
    expect(first.hellos.at(-1)).toEqual({});
    await expect.poll(() => bridge.state().status).toBe("gone");

    const second = await pairedTab(bridge, address);
    bridge.disconnect();
    await expect.poll(() => second.ends).toEqual([{ reason: "agent", agent: "claude-code" }]);

    const third = await pairedTab(bridge, address);
    await bridge.close();
    await expect.poll(() => third.ends).toEqual([{ reason: "server", agent: "claude-code" }]);
    expect(third.state().status).toBe("off");
  });

  it("tells the agent the person disconnected, even when the browser is slow to say so", async () => {
    const { bridge, address } = await bridgeOn();
    // A browser that asks first (a preflight) before it says the person disconnected.
    const slow = (url, init = {}) =>
      init.method === "DELETE" ?
        new Promise(resolve => setTimeout(resolve, 50)).then(() => fromPage()(url, init))
      : fromPage()(url, init);
    const paired = await pairedTab(bridge, address, { fetch: slow });
    paired.pairing.disconnect();
    expect(paired.state().status).toBe("off");
    // What the agent asks meanwhile is not run: the person has disconnected.
    expect((await bridge.call("batch.apply", { label: "Late", commands: [] })).error.code).toBe("EDITOR_GONE");
    expect(paired.calls).toEqual([]);
    expect(paired.state().handover).toBe(null);
    await expect.poll(() => bridge.state()).toMatchObject({ status: "gone", reason: "person" });
  });

  it("asks before another tab takes over, and hands over only when the person agrees", async () => {
    const { bridge, address } = await bridgeOn();
    const first = await pairedTab(bridge, address);
    const second = tab();
    second.pairing.begin(address);
    const kept = bring(bridge, second.state().code, "codex");
    await expect.poll(() => first.state().handover).toEqual({ id: expect.any(String), agent: "codex" });
    first.pairing.handOver(false);
    expect((await kept).error.code).toBe("NOT_ALLOWED");
    expect(first.state()).toMatchObject({ status: "connected", handover: null });

    const handed = bridge.pair(second.state().code, "codex");
    await expect.poll(() => first.state().handover).not.toBe(null);
    first.pairing.handOver(true);
    expect((await handed).ok).toBe(true);
    await expect.poll(() => second.state()).toMatchObject({ status: "connected", agent: "codex" });
    await expect.poll(() => first.ends).toEqual([{ reason: "replaced", agent: "claude-code" }]);
  });
});

describe("serverCommand", () => {
  it("starts the server where the Editor looks for it, and lets an Editor served elsewhere in", () => {
    expect(serverCommand("127.0.0.1:47615", "https://statewright.cpss.com.br")).toBe(
      "npx statewright mcp --port 47615"
    );
    expect(serverCommand("localhost:5000", "http://localhost:5173")).toBe("npx statewright mcp --port 5000");
    expect(serverCommand("127.0.0.1:47615", "https://design.example.com")).toBe(
      "npx statewright mcp --port 47615 --origin https://design.example.com"
    );
  });
});

describe("the conversation through the pairing (collaboration spec §3)", () => {
  it("sends the person's message, and hears when it is read, the agent's reply and whether it listens", async () => {
    const { bridge, address } = await bridgeOn();
    const paired = await pairedTab(bridge, address);
    const talk = () => paired.conversation.getState();
    const waiting = bridge.wait(5);
    await expect.poll(() => talk().listening).toBe(true);
    talk().add({ kind: "person", id: "msg_1", text: "hello", chips: [], state: "sent" });
    expect(await paired.pairing.send({ text: "hello", context: { level: { id: "cnv_a" } } })).toEqual({ id: "msg_1" });
    expect((await waiting).result.messages.map(message => message.text)).toEqual(["hello"]);
    await expect.poll(() => talk().lines[0].state).toBe("read");
    await expect.poll(() => talk().listening).toBe(false);
    bridge.reply({ text: "Done", point: ["nod_a"] });
    await expect.poll(() => talk().lines.at(-1)).toMatchObject({ kind: "agent", id: "rpl_1", text: "Done" });
  });

  it("knows when the agent last called, and forgets the conversation when the pairing ends", async () => {
    const { bridge, address } = await bridgeOn();
    const paired = await pairedTab(bridge, address);
    const talk = () => paired.conversation.getState();
    expect(talk().lastCall).toBe(0);
    await bridge.call("document.summary", {});
    expect(talk().lastCall).toBeGreaterThan(0);
    talk().add({ kind: "person", text: "hi", chips: [], state: "sent" });
    paired.pairing.disconnect();
    expect(talk().lines).toEqual([]);
    expect(await paired.pairing.send({ text: "late" })).toEqual({ error: "not paired" });
  });
});
