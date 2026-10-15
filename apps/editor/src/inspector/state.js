// What the inspector shows (spec §6.1, §7.4): it appears with the selection; the level's or the project's details, a
// finding, a lane or a region are shown on request, in its place, until the selection changes. Closing it hides it
// until then too.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { editorStore, useEditor } from "@/store/editor";

export const inspectorStore = createStore(set => ({
  /** @type {string | null} An element shown instead of the selection (a level, the project, a finding, …). */
  focus: null,
  /** Closed by the person: hidden until the selection changes. */
  closed: false,
  /** @type {string | null} An element just made, shown to be named first: its title has the focus. */
  fresh: null,
  /** @type {boolean | null} The layer an element shown on request opens on (Details: true), this once. */
  details: null,
  /**
   * Show an element's details in place of the selection; `fresh`: it was just made, and is named first; `details`:
   * open it on that layer this once, the person's remembered choice staying as it is.
   * @param {string} id
   * @param {{ fresh?: boolean, details?: boolean }} [options]
   */
  show: (id, { fresh = false, details = null } = {}) =>
    set({ focus: id, closed: false, fresh: fresh ? id : null, details }),
  /** Back to the selection. */
  back: () => set({ focus: null, fresh: null, details: null }),
  close: () => set({ focus: null, closed: true, fresh: null, details: null }),
  /** The selection changed: show it. */
  reset: () => set({ focus: null, closed: false, fresh: null, details: null }),
  /** The person chose a layer: theirs from now on. */
  settle: () => set({ details: null })
}));

/** Read from the inspector's store in a component. */
export const useInspector = selector => useStore(inspectorStore, selector);

/**
 * What the inspector shows: an element's ID, a count of selected elements, or nothing.
 * @param {{ focus: string | null, closed: boolean }} state
 * @param {string[]} selection
 * @returns {{ id: string } | { count: number } | null}
 */
export function subjectOf({ focus, closed }, selection) {
  if (closed) return null;
  if (focus) return { id: focus };
  if (selection.length === 1) return { id: selection[0] };
  if (selection.length > 1) return { count: selection.length };
  return null;
}

const NONE = [];

/** What the inspector shows now: an element, a count, or nothing (hidden). */
export function useSubject() {
  const selection = useEditor(state => state.view.selections[state.canvasId] ?? NONE);
  const focus = useInspector(state => state.focus);
  const closed = useInspector(state => state.closed);
  return subjectOf({ focus, closed }, selection);
}

/** ⇧I (spec §6.1): show the inspector — the selection, or the level's details when nothing is selected — or hide it. */
export function toggleInspector() {
  const { canvasId, view } = editorStore.getState();
  const selection = view.selections[canvasId] ?? [];
  if (subjectOf(inspectorStore.getState(), selection)) inspectorStore.getState().close();
  else if (selection.length) inspectorStore.getState().reset();
  else inspectorStore.getState().show(canvasId);
}
