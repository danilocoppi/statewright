// Element diff by ID (spec §4.5): what an imported file adds, removes or changes compared with the copy in this
// browser. Canvases are compared without their contents (nodes, edges and regions are elements of their own); layout
// differences are only counted.
import { buildIndex, canonicalize } from "statewright";

/**
 * @typedef {object} ElementChange
 * @property {"added" | "removed" | "changed"} change
 * @property {string} type project, catalog, definition, canvas, region, node, edge, finding, note or lane.
 * @property {string} id
 * @property {string} name A readable name: the element's name, or "from → to" for unnamed edges.
 * @property {string} [collection] Catalog collection (catalog items).
 * @property {string} [canvasName] Name of the owning canvas (regions, nodes, edges).
 * @typedef {{ changes: ElementChange[], layout: number }} DocumentDiff
 */

const CONTAINED = new Set(["nodes", "edges", "regions"]);

/** The part of an element compared for "changed". */
function comparable(entry) {
  if (entry.type !== "canvas") return canonicalize(entry.value);
  return canonicalize(Object.fromEntries(Object.entries(entry.value).filter(([key]) => !CONTAINED.has(key))));
}

function describe(doc, index, entry, change) {
  const { value } = entry;
  const nameOf = id => index.get(id)?.value.name ?? id;
  const name =
    value.name ??
    value.title ??
    value.text ??
    value.code ??
    (entry.type === "edge" ? `${nameOf(value.from)} → ${nameOf(value.to)}` : entry.id);
  return {
    change,
    type: entry.type,
    id: entry.id,
    name,
    ...(entry.collection && { collection: entry.collection }),
    ...(entry.canvas && { canvasName: doc.canvases[entry.canvas]?.name ?? entry.canvas })
  };
}

/** Number of node, edge and note placements that differ between two layouts. */
function layoutDifferences(before, after) {
  const canvases = new Set([...Object.keys(before?.canvases ?? {}), ...Object.keys(after?.canvases ?? {})]);
  let count = 0;
  for (const canvasId of canvases) {
    for (const part of ["nodes", "edges", "notes"]) {
      const a = before?.canvases?.[canvasId]?.[part] ?? {};
      const b = after?.canvases?.[canvasId]?.[part] ?? {};
      for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(id in a) || !(id in b) || canonicalize(a[id]) !== canonicalize(b[id])) count += 1;
      }
    }
  }
  return count;
}

/**
 * @param {object} before The local copy.
 * @param {object} after The imported document.
 * @returns {DocumentDiff}
 */
export function diffDocuments(before, after) {
  const was = buildIndex(before);
  const is = buildIndex(after);
  const changes = [];
  for (const [id, entry] of is.entries) {
    const old = was.get(id);
    if (!old) changes.push(describe(after, is, entry, "added"));
    else if (old.type !== entry.type || comparable(old) !== comparable(entry)) {
      changes.push(describe(after, is, entry, "changed"));
    }
  }
  for (const [id, entry] of was.entries) {
    if (!is.has(id)) changes.push(describe(before, was, entry, "removed"));
  }
  return { changes, layout: layoutDifferences(before.layout, after.layout) };
}
