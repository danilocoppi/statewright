// What goes with a message (collaboration spec §5.4): the project, the level shown and what is selected on it — unless
// the person takes it off — and the chips that show it in the field.
import { edgeLabel } from "statewright";

import { indexOf } from "@/lib/derived";

/** A selected element as the agent reads it: its ID, name, kind and level. */
export function itemOf(doc, index, id) {
  const entry = index.get(id);
  if (!entry) return null;
  const { value } = entry;
  const name = entry.type === "edge" ? edgeLabel(doc, id) || id : (value.name ?? value.label ?? value.text ?? id);
  // The highlights it carries, by name (highlights spec §7): "the critical ones" then means something to the agent.
  const highlights = (value.highlights ?? [])
    .map(highlight => doc.catalog.highlights?.[highlight]?.name)
    .filter(Boolean);
  return {
    id,
    name,
    kind: entry.type === "node" ? value.kind : entry.type,
    level: entry.canvas,
    ...(highlights.length ? { highlights } : {})
  };
}

/**
 * @param {any} doc
 * @param {string} canvasId
 * @param {string[]} selection
 * @param {{ leave?: Set<"level" | "selection"> }} [options] What the person took off.
 * @returns {{ project: { id: string, name: string }, level?: { id: string, name: string },
 *   selection?: Array<{ id: string, name: string, kind: string, level: string }> }}
 */
export function contextOf(doc, canvasId, selection, { leave = new Set() } = {}) {
  const index = indexOf(doc);
  const context = { project: { id: doc.project.id, name: doc.project.name } };
  if (!leave.has("level") && doc.canvases[canvasId]) {
    context.level = { id: canvasId, name: doc.canvases[canvasId].name ?? canvasId };
  }
  const items = selection.map(id => itemOf(doc, index, id)).filter(Boolean);
  if (!leave.has("selection") && items.length) context.selection = items;
  return context;
}

/**
 * The chips of a context: the level, and how many elements are selected.
 * @returns {Array<{ key: "level" | "selection", label: string }>}
 */
export function chipsOf(context, t) {
  return [
    ...(context.level ? [{ key: "level", label: context.level.name }] : []),
    ...(context.selection ?
      [{ key: "selection", label: t("conversation.chips.selection", { count: context.selection.length }) }]
    : [])
  ];
}
