// The conversation with the paired agent (collaboration spec §4): the person's lines and their state, the agent's
// replies and changes, the draft, and what says whether the agent works, listens or is away. It lives while the pairing
// lasts: nothing goes to the document, the browser's storage or the history of Undo.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** How long after its last call the agent still counts as working. */
export const WORKING_MS = 5000;

/**
 * @typedef {{ key: string, label: string }} Chip What goes with a message, shown in the field.
 * @typedef {{ key: number, kind: "person", id?: string, text: string, chips: Chip[],
 *   state: "sending" | "sent" | "read" | "failed" }} PersonLine
 * @typedef {{ key: number, kind: "agent", id: string, text: string, to?: string, point?: string[] }} AgentLine
 * @typedef {{ key: number, kind: "change", entry: object, label: string, agent: string | null,
 *   canvases: Record<string, string[]> }} ChangeLine
 * @typedef {{ key: number, kind: "stop", id?: string, state: "sending" | "sent" | "read" | "failed" }} StopLine
 * @typedef {PersonLine | AgentLine | ChangeLine | StopLine} Line
 */

const EMPTY = { lines: [], draft: "", historyOpen: false, listening: false, channel: false, lastCall: 0 };

/** A conversation's store; the Editor keeps one (`conversationStore`), tests make their own. */
export function createConversationStore() {
  let next = 0;
  return createStore(set => ({
    ...EMPTY,
    /** Add a line; its key, to update it later. */
    add(line) {
      next += 1;
      const key = next;
      set(state => ({ lines: [...state.lines, { key, ...line }] }));
      return key;
    },
    /** Change a line: a person's message once sent (its id), or failed. */
    update: (key, patch) =>
      set(state => ({ lines: state.lines.map(line => (line.key === key ? { ...line, ...patch } : line)) })),
    /** The agent read these messages. */
    markRead: ids =>
      set(state => ({
        lines: state.lines.map(line =>
          line.id && ids.includes(line.id) && "state" in line ? { ...line, state: "read" } : line
        )
      })),
    setDraft: draft => set({ draft }),
    toggleHistory: () => set(state => ({ historyOpen: !state.historyOpen })),
    setListening: ({ listening, channel }) => set({ listening: Boolean(listening), channel: Boolean(channel) }),
    /** The agent called just now. */
    called: (at = Date.now()) => set({ lastCall: at }),
    clear: () => set({ ...EMPTY })
  }));
}

export const conversationStore = createConversationStore();

/** Read the conversation in a component. */
export const useConversation = selector => useStore(conversationStore, selector);

/**
 * Whether the agent is working (it called in the last 5 s), listening (it waits for a message, or the Channel reached
 * it), or away.
 * @param {{ listening: boolean, channel: boolean, lastCall: number }} state
 * @param {number} now
 * @returns {"working" | "listening" | "away"}
 */
export function statusOf({ listening, channel, lastCall }, now) {
  if (lastCall && now - lastCall < WORKING_MS) return "working";
  return listening || channel ? "listening" : "away";
}
