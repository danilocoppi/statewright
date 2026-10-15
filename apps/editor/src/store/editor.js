// The open project (spec §4.2). The document is the only truth: every change is a batch of Core commands applied by
// `dispatch`, recorded with its patches so it can be undone. Components read with `useEditor(selector)`.
import { freeze } from "immer";
import { applyBatch, applyPatches, CommandError } from "statewright";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { emptyHistory, record, seal, takeRedo, takeUndo } from "./history";

/**
 * @typedef {{ dirty: boolean, savedAt: number | null, error: string | null, byHand: boolean }} SaveStatus `byHand`:
 *   among the changes not stored yet is one a person made (an edit, an undo), not only the editor's own (a level
 *   arranged as it opens) — only then is leaving the page asked about.
 * @typedef {{ ok: true, created: string[] }
 *   | { ok: false, error: { code: string, message: string, details?: object, index?: number } }} DispatchResult
 *   `index`: the command of the batch that failed.
 */

const initialState = () => ({
  /** @type {object | null} */
  doc: null,
  /** Increases on every change of `doc`; derived data and autosave key on it. */
  version: 0,
  /** @type {string | null} */
  canvasId: null,
  readOnly: false,
  /** Per level, while the session lasts (spec §6.3): what is selected and where the view was. */
  view: { selections: {}, viewports: {}, reveal: null },
  history: emptyHistory(),
  /** @type {SaveStatus} */
  status: { dirty: false, savedAt: null, error: null, byHand: false }
});

/**
 * @param {{ now?: () => number }} [options] `now` is injectable for tests.
 */
export function createEditorStore({ now = Date.now } = {}) {
  /**
   * What holds the document still for a while: given a batch (null for undo or redo), whether it must wait. A
   * simulation holds it (simulator spec §6.1: "While simulating, the document is not edited").
   */
  let held = () => false;
  return createStore((set, get) => {
    /** Apply an undo or redo entry's patches. */
    const step = (taken, key) => {
      if (!taken || get().readOnly || held(null)) return false;
      const doc = applyPatches(get().doc, taken.entry[key]);
      const canvasId = doc.canvases[taken.entry.canvasId] ? taken.entry.canvasId : doc.root;
      set(state => ({
        doc,
        canvasId,
        version: state.version + 1,
        history: taken.history,
        status: { ...state.status, dirty: true, byHand: true }
      }));
      return true;
    };

    return {
      ...initialState(),

      /**
       * Hold the document while `holds(commands, { record })` says so (commands null: undo or redo); a held change is
       * refused with `SIMULATING`.
       */
      holdWhile(holds) {
        held = holds;
      },

      /** Show a document; `canvasId` falls back to the root when it is not one of its canvases. */
      open(doc, { canvasId, readOnly = false } = {}) {
        set({
          ...initialState(),
          // Frozen all the way down, as every edited document is: what is worked out from a document (its index, its
          // references, its figures) is kept with it from the first view (performance spec §3 P2).
          doc: freeze(doc, true),
          readOnly,
          canvasId: canvasId && doc.canvases[canvasId] ? canvasId : doc.root
        });
      },

      close() {
        set(initialState());
      },

      setCanvas(canvasId) {
        if (get().doc?.canvases[canvasId]) set({ canvasId });
      },

      setReadOnly(readOnly) {
        set({ readOnly });
      },

      /** Select elements of a level, the current one by default (an empty list clears the selection). */
      select(ids, canvasId = get().canvasId) {
        set(state => ({
          view: { ...state.view, selections: { ...state.view.selections, [canvasId]: ids } }
        }));
      },

      /** Ask the canvas to bring an element of a level into view when that level is shown; null when done. */
      reveal(canvasId, id) {
        set(state => ({ view: { ...state.view, reveal: id ? { canvasId, id } : null } }));
      },

      /** Remember where the view of a level was (`{ x, y, zoom }`). */
      setViewport(canvasId, viewport) {
        set(state => ({ view: { ...state.view, viewports: { ...state.view.viewports, [canvasId]: viewport } } }));
      },

      /**
       * Apply a batch of commands atomically. A refused batch (CommandError) leaves the document unchanged.
       * `record: false` keeps the change out of the undo history (automatic placement: undoing it would only place the
       * same elements again).
       * `origin: "ai"` records the change as an agent's (AI interface spec §7.3), with its name.
       * @param {object[]} commands
       * @param {{ label: string, coalesceKey?: string, record?: boolean, origin?: "user" | "ai", agent?: string }}
       *   options
       * @returns {DispatchResult}
       */
      dispatch(commands, { label, coalesceKey, record: recorded = true, origin = "user", agent } = { label: "" }) {
        const { doc, readOnly, canvasId } = get();
        if (!doc) throw new Error("No document is open");
        if (readOnly) return { ok: false, error: { code: "READ_ONLY", message: "This tab is read-only" } };
        if (held(commands, { record: recorded })) {
          return { ok: false, error: { code: "SIMULATING", message: "The document is not edited while simulating" } };
        }
        let result;
        try {
          result = applyBatch(doc, commands);
        } catch (error) {
          if (error instanceof CommandError) {
            // `index`: which command of the batch failed.
            const where = error.index === undefined ? {} : { index: error.index };
            return { ok: false, error: { code: error.code, message: error.message, details: error.details, ...where } };
          }
          throw error;
        }
        set(state => ({
          doc: result.doc,
          version: state.version + 1,
          history:
            recorded ?
              record(state.history, {
                label,
                canvasId,
                commands,
                patches: result.patches,
                inversePatches: result.inversePatches,
                origin,
                ...(agent ? { agent } : {}),
                coalesceKey,
                at: now()
              })
            : state.history,
          status: { ...state.status, dirty: true, byHand: state.status.byHand || recorded }
        }));
        return { ok: true, created: result.created };
      },

      /** Undo the last entry and show the canvas where it happened. @returns {boolean} */
      undo() {
        return step(takeUndo(get().history), "inversePatches");
      },

      /** Redo the next entry. @returns {boolean} */
      redo() {
        return step(takeRedo(get().history), "patches");
      },

      /** Stop the last entry from absorbing later changes (a field lost focus). */
      seal() {
        set(state => ({ history: seal(state.history) }));
      },

      /** Record a successful save of the given version. */
      markSaved(version, savedAt = now()) {
        set(state => ({
          status: {
            dirty: state.version !== version,
            savedAt,
            error: null,
            byHand: state.version !== version && state.status.byHand
          }
        }));
      },

      markSaveFailed(message) {
        set(state => ({ status: { ...state.status, error: message } }));
      }
    };
  });
}

/** The app's editor store. */
export const editorStore = createEditorStore();

/** Read from the editor store in a component: `useEditor(state => state.doc)`. */
export const useEditor = selector => useStore(editorStore, selector);
