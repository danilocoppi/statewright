// The difference a batch makes (collaboration spec §7): what it would add, remove and change — each by ID, name, kind
// and level, a change with each field's before and after — and the document it would leave, without changing the one
// shown. Moves (the layout) are no change of meaning.
import { applyBatch } from "statewright";

import { itemOf } from "@/conversation/context";
import { indexOf } from "@/lib/derived";

/**
 * @typedef {{ id: string, name: string, kind: string, level: string | null }} Item
 * @typedef {Item & { fields: Array<{ path: string, before: any, after: any }> }} Change
 */

/** An element as the person reads it. */
function describe(doc, index, id) {
  const entry = index.get(id);
  const item = itemOf(doc, index, id);
  if (item) return { id, name: item.name, kind: item.kind, level: item.level ?? null };
  return { id, name: entry?.value?.name ?? id, kind: entry?.type ?? "element", level: entry?.canvas ?? null };
}

/** Where a patch lands: the element it changes and the field inside it; null for the layout and the project. */
function placeOf(path) {
  const [root, a, b, c, ...rest] = path;
  if (root === "canvases") {
    if (["nodes", "edges", "regions"].includes(b) && c !== undefined) return { id: c, field: rest };
    return { id: a, field: [b, c, ...rest].filter(part => part !== undefined) };
  }
  if (root === "catalog" && b !== undefined) return { id: b, field: [c, ...rest].filter(part => part !== undefined) };
  if (root === "definitions" && a !== undefined)
    return { id: a, field: [b, c, ...rest].filter(part => part !== undefined) };
  if (root === "annotations" && b !== undefined)
    return { id: b, field: [c, ...rest].filter(part => part !== undefined) };
  return null;
}

const valueAt = (doc, path) => path.reduce((value, key) => (value == null ? undefined : value[key]), doc);

/**
 * @param {any} doc
 * @param {Array<{ type: string, args?: object }>} commands
 * @returns {{ ok: true, preview: any, added: Item[], removed: Item[], changed: Change[], levels: string[] } |
 *   { ok: false, error: { code: string, message: string, index?: number } }}
 */
export function diffOf(doc, commands) {
  let applied;
  try {
    applied = applyBatch(doc, commands);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error.code ?? "INTERNAL",
        message: error.message,
        ...(error.index !== undefined ? { index: error.index } : {})
      }
    };
  }
  const preview = applied.doc;
  const before = indexOf(doc);
  const after = indexOf(preview);
  const counted = id => before.get(id)?.type !== "project" && after.get(id)?.type !== "project";
  const added = [...after.entries.keys()]
    .filter(id => !before.has(id) && counted(id))
    .map(id => describe(preview, after, id));
  const removed = [...before.entries.keys()]
    .filter(id => !after.has(id) && counted(id))
    .map(id => describe(doc, before, id));
  const fields = new Map();
  for (const { path } of applied.patches) {
    const place = placeOf(path);
    if (!place || !before.has(place.id) || !after.has(place.id)) continue;
    const key = place.field.join(".");
    if (!fields.has(place.id)) fields.set(place.id, new Map());
    const own = fields.get(place.id);
    if (own.has(key)) continue;
    const at = before.get(place.id).path;
    const atAfter = after.get(place.id).path;
    own.set(key, {
      path: key,
      before: valueAt(doc, [...at, ...place.field]),
      after: valueAt(preview, [...atAfter, ...place.field])
    });
  }
  const changed = [...fields].map(([id, own]) => ({ ...describe(preview, after, id), fields: [...own.values()] }));
  const levels = [...new Set([...added, ...removed, ...changed].map(item => item.level).filter(Boolean))];
  return { ok: true, preview, added, removed, changed, levels };
}

/** Whether a batch removes anything that was there (spec §7: such a batch is always proposed). */
export const removes = diff => diff.ok && diff.removed.length > 0;

/** What the card counts. */
export const summaryOf = diff => ({
  added: diff.added.length,
  removed: diff.removed.length,
  changed: diff.changed.length,
  levels: diff.levels.length
});
