// The comment open on the canvas (collaboration spec §8.1): one thread at a time, or the draft of a new comment.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export const commentsStore = createStore(set => ({
  /** @type {string | null} */
  open: null,
  /** A comment being written: where it goes. @type {null | { canvas: string, target?: string, at?: { x: number, y: number } }} */
  draft: null,
  /** Resolved comments are shown too, muted (the canvas menu's switch). */
  showResolved: false,
  setShowResolved: showResolved => set({ showResolved }),
  show: id => set({ open: id, draft: null }),
  startDraft: draft => set({ draft, open: null }),
  close: () => set({ open: null, draft: null })
}));

/** Read the open comment in a component. */
export const useComments = selector => useStore(commentsStore, selector);
