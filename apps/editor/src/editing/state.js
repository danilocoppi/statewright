// What the person is doing on the canvas (spec §7): the tool in hand, the one editor open on the canvas (a name being
// typed, a trigger being chosen, something being inserted by name), and the last change the canvas refused, said where
// the gesture happened (spec §10).
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { editorStore } from "@/store/editor";

/**
 * @typedef {{ x: number, y: number }} Point In canvas coordinates.
 * @typedef {{ id: number, reason: string, message?: string, at: Point }} Refusal `reason`: a key of
 *   `editor:refusals` (a refusal of the canvas or one of Core's error codes); `message`: Core's own words, shown on
 *   request; `id` tells one refusal from the next.
 */

let refusals = 0;
let requests = 0;

const initial = () => ({
  /** The tool in hand: "select", or the ID of a tool of the level's kind. */
  tool: "select",
  /** The editor open on the canvas, if any: `{ type, ... }`. */
  editor: null,
  /** @type {Refusal | null} */
  refusal: null,
  /** @type {Point | null} Where the pointer is over the canvas: pastes and inserts go there. */
  pointer: null,
  /** @type {{ action: "fit" | "zoomIn" | "zoomOut", id: number } | null} A change of view asked from the keyboard. */
  view: null
});

export const editingStore = createStore(set => ({
  ...initial(),
  /** @type {(() => Point) | null} The middle of the canvas's view, while a canvas is shown: a paste with the pointer
   * elsewhere goes there. Not cleared by `reset` (the canvas keeps it across levels). */
  centre: null,
  setCentre: centre => set({ centre }),
  /** Take a tool; Select puts any other down. */
  setTool: tool => set({ tool }),
  /** Open an editor on the canvas (closing any other). */
  open: editor => set({ editor, refusal: null }),
  close: () => set({ editor: null }),
  /** Say why a gesture changed nothing, where it happened. */
  refuse: refusal => set({ refusal: { ...refusal, id: ++refusals } }),
  dismiss: () => set({ refusal: null }),
  /** Ask the canvas to fit the level or zoom (⇧1, ⌘+, ⌘−); the canvas does it and settles the request. */
  zoom: action => set({ view: { action, id: ++requests } }),
  settle: () => set({ view: null }),
  /** Follow the pointer over the canvas (null when it leaves). */
  point: pointer => set({ pointer }),
  /** Back to Select with nothing open (another level, another project). */
  reset: () => set(initial())
}));

/** Read the editing state in a component: `useEditing(state => state.tool)`. */
export const useEditing = selector => useStore(editingStore, selector);

/**
 * Make a change from the canvas: the commands are one undoable entry; when Core refuses them the document stays as it
 * was and the canvas says why, at the gesture.
 * @param {object[]} commands
 * @param {{ label: string, at: Point, coalesceKey?: string }} options
 * @returns {{ ok: boolean, created?: string[] }}
 */
export function change(commands, { label, at, coalesceKey }) {
  if (!commands.length) return { ok: true, created: [] };
  const result = editorStore.getState().dispatch(commands, { label, coalesceKey });
  if (!result.ok) editingStore.getState().refuse({ reason: result.error.code, message: result.error.message, at });
  return result;
}
