// An agent's changes, made visible (AI interface spec §7.3): what it created or changed glows on the level shown for
// 2 s, and a toast says who did what, with Undo — and Show when the change is on another level. The toast goes as soon
// as the change is no longer the last one (undone, or followed by another), so its Undo never undoes anything else.
import i18n from "i18next";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { editorStore } from "@/store/editor";
import { toast, useToastStore } from "@/stores/toast";

import { changedOf } from "./changes";

/** How long a change glows (spec §7.3: "for 2 s"). */
export const MARK_MS = 2000;
/** How long an agent's toast stays: long enough to read who did what and act on it. */
export const AI_TOAST_MS = 8000;

/**
 * @typedef {{ canvases: Record<string, string[]>, key: number }} Marked What glows, by level; `key` changes with every
 *   change, so the same elements glow again.
 * @typedef {{ canvasId: string, ids: string[], note?: string }} Pointed What an agent points out (view.point), until
 *   the person clicks elsewhere or another point replaces it.
 */
export const noticeStore = createStore(() => ({
  /** @type {Marked | null} */
  marked: null,
  /** @type {Pointed | null} */
  pointed: null
}));

/** Read the notices in a component: `useNotice(state => state.marked)`. */
export const useNotice = selector => useStore(noticeStore, selector);

let clearing = null;
let key = 0;

/** Make these elements glow, by level, for MARK_MS. @param {Record<string, string[]>} canvases */
export function markChanged(canvases) {
  clearTimeout(clearing);
  noticeStore.setState({ marked: { canvases, key: (key += 1) } });
  clearing = setTimeout(() => noticeStore.setState({ marked: null }), MARK_MS);
}

/** Undo the last change; while a run holds the document, or in a tab that only reads, say why it stays. */
function undoOrSayWhy() {
  const store = editorStore.getState();
  if (store.undo()) return;
  toast.info(i18n.t(store.readOnly ? "agent:change.undoReadOnly" : "agent:change.undoHeld"));
}

/**
 * Show an agent's change, just recorded as the last entry of the history.
 * @param {import("@/store/history").HistoryEntry} entry
 */
export function announce(entry) {
  const canvases = changedOf(entry.patches);
  markChanged(canvases);
  const levels = Object.keys(canvases);
  const shown = editorStore.getState().canvasId;
  const elsewhere = levels.length && !levels.includes(shown) ? levels[0] : null;
  const isLast = () => editorStore.getState().history.past.at(-1) === entry;
  const actions = [
    { label: i18n.t("agent:change.undo"), onClick: () => isLast() && undoOrSayWhy() },
    ...(elsewhere ?
      [
        {
          label: i18n.t("agent:change.show"),
          onClick: () => {
            editorStore.getState().setCanvas(elsewhere);
            markChanged(canvases);
          }
        }
      ]
    : [])
  ];
  const lead = i18n.t("agent:change.by", { agent: entry.agent ?? i18n.t("agent:change.anAgent") });
  const id = toast.ai(entry.label, { lead, actions, duration: AI_TOAST_MS });
  const stop = editorStore.subscribe(() => {
    if (isLast()) return;
    useToastStore.getState().dismiss(id);
    stop();
  });
  setTimeout(stop, AI_TOAST_MS);
}
