// Pairing this tab with an agent's `statewright mcp` (AI interface spec §6, §7.4). The tab shows a code and registers
// it with the bridge on the person's computer (`POST /pair`), then waits; once the agent brings the code, the tab gets
// a token, listens for the agent's calls (`GET /calls`, server-sent events) and runs each on `window.statewright` —
// the Editor's host — answering with its result (`POST /results`). Only one tab is paired with a server: another asks
// this one first (`handover`).
import { EDITOR_ORIGIN } from "statewright";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { conversationStore } from "@/conversation/store";
import { marksStore } from "@/marks/store";
import { proposalsStore } from "@/proposals/store";

import { APP } from "@/config/app";

/** Where the bridge listens unless the person says otherwise (spec §6: "127.0.0.1:47615, editable"). */
export const BRIDGE_ADDRESS = "127.0.0.1:47615";
/** The characters of a code: no 0 and O, no 1, I and L, so a code read aloud is not misheard. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** Where the address the person last paired with is kept. */
export const ADDRESS_KEY = `${APP.storagePrefix}:bridge`;

/**
 * A new code: six characters of the alphabet, shown `K7Q-2MX`.
 * @param {(bytes: Uint8Array) => Uint8Array} [random]
 */
export function newCode(random = bytes => globalThis.crypto.getRandomValues(bytes)) {
  const chars = [...random(new Uint8Array(6))].map(byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}

/** The events of a server-sent stream, read through fetch: `{ event, data }`. */
export async function* eventsOf(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = null;
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (event) yield { event, data: JSON.parse(data) };
    }
  }
}

/** An address on this computer, where the bridge listens (spec §6: "Nothing listens on other interfaces"). */
const LOCAL = /^(127\.0\.0\.1|localhost|\[::1\]):\d{1,5}$/;

/**
 * The command that starts the server where this Editor looks for it: its port, and `--origin` when the Editor is served
 * from a page the server does not let in by default (the published Editor and localhost are let in).
 * @param {string} address As the person typed it, `127.0.0.1:47615`.
 * @param {string} [origin] This page's origin.
 */
export function serverCommand(address, origin = globalThis.location?.origin) {
  const port = addressOf(address).split(":").pop();
  const known = origin === EDITOR_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin ?? "");
  return `npx statewright mcp --port ${port}${origin && !known ? ` --origin ${origin}` : ""}`;
}

/** The address as the person typed it: `127.0.0.1:47615`, without a scheme or a slash. */
export const addressOf = text =>
  String(text)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

/**
 * @typedef {"off" | "waiting" | "invalid" | "unreachable" | "refused" | "expired" | "connected"} PairingStatus
 *   `waiting`: the code is shown and registered; `invalid`: the address is not on this computer; `unreachable`: no
 *   bridge answers at the address; `refused`: one answers, but not to this Editor's address (it needs `--origin`);
 *   `expired`: no agent brought the code in five minutes.
 * @typedef {{ status: PairingStatus, code: string | null, address: string, agent: string | null,
 *   handover: { id: string, agent: string | null } | null }} PairingState
 */

/**
 * The pairing of a tab.
 * @param {{ api?: () => { hello: (options: { agent?: string }) => unknown,
 *   call: (name: string, args: object) => Promise<object> }, fetch?: typeof fetch, storage?: Storage,
 *   random?: (bytes: Uint8Array) => Uint8Array, onEnd?: (reason: string, agent: string | null) => void }} [options]
 *   `api`: what runs the agent's calls (`window.statewright`); `onEnd`: told why a pairing ended — `agent` (the agent
 *   disconnected), `replaced` (another tab took over), `server` (the server stopped), `lost`, or `person`;
 *   `conversation`: the conversation the person's messages and the agent's replies go to (collaboration spec §3).
 */
export function createPairing({
  api = () => globalThis.statewright,
  fetch: request = (...args) => globalThis.fetch(...args),
  storage = globalThis.localStorage,
  random,
  onEnd = () => {},
  conversation = conversationStore,
  marks = marksStore,
  proposals = proposalsStore
} = {}) {
  const saved = (() => {
    try {
      return storage?.getItem(ADDRESS_KEY) || BRIDGE_ADDRESS;
    } catch {
      return BRIDGE_ADDRESS;
    }
  })();
  /** @type {import("zustand/vanilla").StoreApi<PairingState>} */
  const store = createStore(() => ({ status: "off", code: null, address: saved, agent: null, handover: null }));
  /** The registration waiting for an agent: its AbortController. */
  let waiting = null;
  /** The pairing at work: `{ address, token, agent, controller }`. */
  let link = null;

  const post = (own, path, body) =>
    request(`http://${own.address}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${own.token}` },
      body: JSON.stringify(body)
    });

  function stopWaiting() {
    waiting?.abort();
    waiting = null;
  }

  function ended(own, reason) {
    if (link !== own) return;
    link = null;
    api()?.hello({});
    store.setState({ status: "off", code: null, agent: null, handover: null });
    // The conversation lives while the pairing does (collaboration spec §4).
    conversation.getState().clear();
    // The marks too, and the tool in hand: nothing is left to mark for (collaboration spec §5).
    marks.getState().reset();
    // The proposals end with it, and the agent may no longer delete without asking.
    proposals.getState().clear();
    onEnd(reason, own.agent);
  }

  /** Run a call of the agent's and answer it. */
  async function answer(own, { id, name, args }) {
    conversation.getState().called();
    const outcome = await api().call(name, args);
    if (link === own) await post(own, "/results", { id, outcome }).catch(() => {});
  }

  /** Listen for the agent's calls, until the pairing ends. */
  async function listen(own) {
    let response;
    try {
      response = await request(`http://${own.address}/calls`, {
        headers: { authorization: `Bearer ${own.token}` },
        signal: own.controller.signal
      });
    } catch {
      return ended(own, "lost");
    }
    if (!response.ok) return ended(own, "lost");
    store.setState({ status: "connected", code: null, agent: own.agent, address: own.address });
    try {
      storage?.setItem(ADDRESS_KEY, own.address);
    } catch {
      // A browser that keeps no site data pairs all the same.
    }
    let reason = "lost";
    try {
      for await (const { event, data } of eventsOf(response.body)) {
        // Disconnected from this tab while the bridge has not heard it yet: nothing more is run or asked.
        if (link !== own && event !== "bye") continue;
        if (event === "call") answer(own, data);
        else if (event === "confirm") store.setState({ handover: { id: data.id, agent: data.agent ?? null } });
        else if (event === "withdrawn" && store.getState().handover?.id === data.id) store.setState({ handover: null });
        else if (event === "bye") reason = data.reason;
        else if (event === "read") conversation.getState().markRead(data.ids ?? []);
        else if (event === "reply") conversation.getState().add({ kind: "agent", ...data });
        else if (event === "listening") conversation.getState().setListening(data);
        else if (event === "ask") conversation.getState().add({ kind: "question", ...data, state: "open" });
      }
    } catch {
      // The stream broke: the server stopped, or this tab disconnected.
    }
    ended(own, reason);
  }

  return {
    store,

    /** Show a new code at `address` and wait for an agent to bring it. */
    async begin(address = store.getState().address) {
      stopWaiting();
      const where = addressOf(address);
      const code = newCode(random);
      const controller = new AbortController();
      waiting = controller;
      // Only a server on this computer: one elsewhere would be given this browser's projects.
      if (!LOCAL.test(where)) {
        waiting = null;
        return store.setState({ status: "invalid", code, address: where, agent: null });
      }
      store.setState({ status: "waiting", code, address: where, agent: null });
      let response;
      try {
        response = await request(`http://${where}/pair`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
          signal: controller.signal
        });
      } catch {
        if (waiting === controller) {
          waiting = null;
          store.setState({ status: "unreachable" });
        }
        return;
      }
      if (waiting !== controller) return;
      waiting = null;
      if (response.status === 410) return store.setState({ status: "expired" });
      if (response.status === 403) return store.setState({ status: "refused" });
      if (!response.ok) return store.setState({ status: "unreachable" });
      const { token, agent } = await response.json();
      const own = { address: where, token, agent: agent ?? null, controller: new AbortController() };
      link = own;
      api()?.hello({ agent: own.agent ?? undefined });
      await listen(own);
    },

    /** Stop waiting: the code is withdrawn (the dialog closed before an agent brought it). */
    cancel() {
      stopWaiting();
      if (!link) store.setState({ status: "off", code: null });
    },

    /** End the pairing from this tab (the island's Disconnect). */
    disconnect() {
      const own = link;
      if (!own) return;
      ended(own, "person");
      // The stream closes once the bridge has heard the person: closed first, it would tell the agent the tab was lost.
      request(`http://${own.address}/pair`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${own.token}` }
      })
        .catch(() => {})
        .finally(() => own.controller.abort());
    },

    /**
     * Write to the agent (collaboration spec §3.2): `{ text, context? }`, or `{ stop: true }`.
     * @returns {Promise<{ id: string } | { error: string }>}
     */
    async send(body) {
      const own = link;
      if (!own) return { error: "not paired" };
      try {
        const response = await post(own, "/messages", body);
        if (response.status !== 202) return { error: `refused (${response.status})` };
        return { id: (await response.json()).id };
      } catch {
        return { error: "unreachable" };
      }
    },

    /**
     * Answer the agent's question (collaboration spec §6.1): the bridge's status (204, or 404 when it no longer waits).
     * @returns {Promise<number>}
     */
    async answer(id, body) {
      const own = link;
      if (!own) return 0;
      try {
        return (await post(own, "/answers", { id, ...body })).status;
      } catch {
        return 0;
      }
    },

    /** Answer whether another tab may take this one's place. */
    handOver(accept) {
      const { handover } = store.getState();
      if (!handover || !link) return;
      store.setState({ handover: null });
      post(link, "/confirm", { id: handover.id, accept }).catch(() => {});
    }
  };
}

/** Read a pairing's state in a component: `usePairing(pairing, state => state.status)`. */
export const usePairing = (pairing, selector) => useStore(pairing.store, selector);
