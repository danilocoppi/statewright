// Undo history (spec §4.2): entries of Core command batches with their forward and inverse patches. Pure functions;
// the editor store keeps the result.

/** Entries kept per session. */
export const HISTORY_LIMIT = 200;
/** Changes with the same coalesce key closer than this become one entry (one drag, one field being typed). */
export const COALESCE_MS = 1000;

/**
 * @typedef {object} HistoryEntry
 * @property {string} label What the person did, for menus ("Rename project").
 * @property {string | null} canvasId The canvas shown when it happened; undo returns there.
 * @property {object[]} commands
 * @property {object[]} patches Forward patches (redo).
 * @property {object[]} inversePatches Inverse patches (undo).
 * @property {"user" | "ai"} origin Who made it: the person, or an agent (AI interface spec §7.3).
 * @property {string} [agent] The agent's name, for an `"ai"` entry.
 * @property {string} [coalesceKey]
 * @property {boolean} [sealed] A sealed entry never absorbs later changes.
 * @property {number} at Time of the last change, in ms.
 * @typedef {{ past: HistoryEntry[], future: HistoryEntry[] }} History
 */

/** @returns {History} */
export const emptyHistory = () => ({ past: [], future: [] });

/**
 * Add an entry; clears the redo stack. A change with the same `coalesceKey` as the last, unsealed entry, within
 * COALESCE_MS of it, merges into that entry instead.
 * @param {History} history
 * @param {HistoryEntry} entry
 * @returns {History}
 */
export function record(history, entry) {
  const last = history.past.at(-1);
  if (
    entry.coalesceKey &&
    last &&
    !last.sealed &&
    last.coalesceKey === entry.coalesceKey &&
    entry.at - last.at < COALESCE_MS
  ) {
    const merged = {
      ...last,
      commands: [...last.commands, ...entry.commands],
      patches: [...last.patches, ...entry.patches],
      inversePatches: [...entry.inversePatches, ...last.inversePatches],
      at: entry.at
    };
    return { past: [...history.past.slice(0, -1), merged], future: [] };
  }
  return { past: [...history.past, entry].slice(-HISTORY_LIMIT), future: [] };
}

/** Close the last entry to merging (the field lost focus, the drag ended). */
export function seal(history) {
  const last = history.past.at(-1);
  if (!last || last.sealed) return history;
  return { ...history, past: [...history.past.slice(0, -1), { ...last, sealed: true }] };
}

/**
 * Take the entry to undo.
 * @param {History} history
 * @returns {{ history: History, entry: HistoryEntry } | null}
 */
export function takeUndo(history) {
  const entry = history.past.at(-1);
  if (!entry) return null;
  return {
    entry,
    history: { past: history.past.slice(0, -1), future: [{ ...entry, sealed: true }, ...history.future] }
  };
}

/**
 * Take the entry to redo.
 * @param {History} history
 * @returns {{ history: History, entry: HistoryEntry } | null}
 */
export function takeRedo(history) {
  const entry = history.future[0];
  if (!entry) return null;
  return { entry, history: { past: [...history.past, entry], future: history.future.slice(1) } };
}
