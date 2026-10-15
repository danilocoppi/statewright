// The conversation with the paired agent (collaboration spec §4): the person's lines and their state, the agent's
// replies and changes, the draft, and what says whether the agent works, listens or is away. It lives while the pairing
// lasts: nothing goes to the document, the browser's storage or the history of Undo.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** How long after its last call the agent still counts as working, unless it says it listens: models think between calls. */
export const WORKING_MS = 30000;

/**
 * @typedef {{ key: string, label: string }} Chip What goes with a message, shown in the field.
 * @typedef {{ key: number, kind: "person", id?: string, text: string, chips: Chip[],
 *   state: "sending" | "sent" | "read" | "failed" }} PersonLine
 * @typedef {{ key: number, kind: "agent", id: string, text: string, to?: string, point?: string[] }} AgentLine
 * @typedef {{ key: number, kind: "change", entry: object, label: string, agent: string | null,
 *   canvases: Record<string, string[]> }} ChangeLine
 * @typedef {{ key: number, kind: "stop", id?: string, state: "sending" | "sent" | "read" | "failed" }} StopLine
 * @typedef {{ key: number, kind: "question", id: string, question: string,
 *   options?: Array<{ label: string, value: string, point?: string[], description?: string }>, multiple?: boolean,
 *   pick?: "elements", state: "open" | "answered", answer?: object }} QuestionLine The agent's question (spec §6.1).
 * @typedef {PersonLine | AgentLine | ChangeLine | StopLine | QuestionLine} Line
 */

const EMPTY = {
  lines: [],
  read: [],
  hover: [],
  action: null,
  draft: "",
  historyOpen: false,
  listening: false,
  channel: false,
  lastCall: 0
};

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
      set(state => {
        // The agent may have read it before its number came back from the bridge: then it is read already.
        const read = patch.id && patch.state === "sent" && state.read.includes(patch.id);
        const change = read ? { ...patch, state: "read" } : patch;
        return { lines: state.lines.map(line => (line.key === key ? { ...line, ...change } : line)) };
      }),
    /** The agent read these messages. */
    markRead: ids =>
      set(state => ({
        read: [...state.read, ...ids],
        lines: state.lines.map(line =>
          line.id && ids.includes(line.id) && "state" in line ? { ...line, state: "read" } : line
        )
      })),
    /** A question that no longer waits (the bridge forgot it) or the person dismissed: it leaves the field. */
    closeQuestion: id =>
      set(state => ({
        lines: state.lines.map(line =>
          line.kind === "question" && line.id === id && line.state === "open" ? { ...line, state: "closed" } : line
        ),
        hover: []
      })),
    /** The person answered the agent's question. */
    answerQuestion: (id, answer) =>
      set(state => ({
        lines: state.lines.map(line =>
          line.kind === "question" && line.id === id ? { ...line, state: "answered", answer } : line
        ),
        hover: []
      })),
    /** The elements an option of a question means, rung on the canvas while the pointer rests on it. */
    setHover: ids => set({ hover: ids }),
    /** The field's text; emptied, it is no longer a quick request. */
    setDraft: draft => set(state => ({ draft, action: draft.trim() ? state.action : null })),
    /** A quick request (spec §6.2): its words in the field, its action with the message. */
    request: (action, words) => set({ action, draft: words }),
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
 * Whether the agent is listening (it waits for a message), working (it called in the last 30 s), listening by the
 * Channel, or away.
 * @param {{ listening: boolean, channel: boolean, lastCall: number }} state
 * @param {number} now
 * @returns {"working" | "listening" | "away"}
 */
export function statusOf({ listening, channel, lastCall }, now) {
  if (listening) return "listening";
  if (lastCall && now - lastCall < WORKING_MS) return "working";
  return channel ? "listening" : "away";
}
