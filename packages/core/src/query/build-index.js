import { isDraft } from "immer";
import { CATALOG_COLLECTIONS } from "../constants.js";

/** Indexes of frozen documents (what applyBatch returns): a document that cannot change keeps its index. */
const kept = new WeakMap();

/**
 * @typedef {object} IndexEntry
 * @property {string} id
 * @property {"project"|"catalog"|"definition"|"canvas"|"region"|"node"|"edge"|"finding"|"note"|"lane"|"scenario"} type
 * @property {any} value The element object itself.
 * @property {Array<string|number>} path Location in the document.
 * @property {string} [collection] Catalog collection (catalog entries only).
 * @property {string} [canvas] Owning canvas (regions, nodes, edges only).
 */

/**
 * Locate every element by ID. IDs are unique per document; repeated IDs are kept in `duplicates`
 * (the first occurrence wins in `get`).
 * @param {any} doc A valid document.
 * @returns {{ get(id: string): IndexEntry | undefined, has(id: string): boolean, entries: Map<string, IndexEntry>, duplicates: string[] }}
 */
export function buildIndex(doc) {
  const frozen = Object.isFrozen(doc) && !isDraft(doc);
  if (frozen && kept.has(doc)) return kept.get(doc);
  const index = indexOf(doc);
  if (frozen) kept.set(doc, index);
  return index;
}

function indexOf(doc) {
  const entries = new Map();
  const duplicates = [];
  const add = (id, entry) => {
    if (entries.has(id)) duplicates.push(id);
    else entries.set(id, { id, ...entry });
  };

  add(doc.project.id, { type: "project", value: doc.project, path: ["project"] });
  for (const collection of Object.keys(CATALOG_COLLECTIONS)) {
    for (const [id, value] of Object.entries(doc.catalog[collection] ?? {})) {
      add(id, { type: "catalog", collection, value, path: ["catalog", collection, id] });
    }
  }
  for (const [id, value] of Object.entries(doc.definitions)) {
    add(id, { type: "definition", value, path: ["definitions", id] });
  }
  for (const [canvasId, canvas] of Object.entries(doc.canvases)) {
    for (const [id, entry] of canvasEntries(canvasId, canvas)) add(id, entry);
  }
  const annotations = doc.annotations ?? {};
  for (const [section, type] of [
    ["findings", "finding"],
    ["notes", "note"],
    ["lanes", "lane"],
    ["scenarios", "scenario"],
    ["comments", "comment"],
    ["locks", "lock"]
  ]) {
    for (const [id, value] of Object.entries(annotations[section] ?? {})) {
      add(id, { type, value, path: ["annotations", section, id] });
    }
  }

  return { get: id => entries.get(id), has: id => entries.has(id), entries, duplicates };
}

/** Entries of frozen canvases, kept with each canvas: indexing a changed document revisits only what changed. */
const keptCanvases = new WeakMap();

/** A canvas's entries: itself, its regions, nodes and edges, as `[id, entry]`. */
function canvasEntries(canvasId, canvas) {
  const frozen = Object.isFrozen(canvas) && !isDraft(canvas);
  const known = frozen ? keptCanvases.get(canvas) : undefined;
  if (known?.id === canvasId) return known.entries;
  const entries = [[canvasId, { type: "canvas", value: canvas, path: ["canvases", canvasId] }]];
  for (const [id, value] of Object.entries(canvas.regions ?? {})) {
    entries.push([id, { type: "region", canvas: canvasId, value, path: ["canvases", canvasId, "regions", id] }]);
  }
  for (const [id, value] of Object.entries(canvas.nodes)) {
    entries.push([id, { type: "node", canvas: canvasId, value, path: ["canvases", canvasId, "nodes", id] }]);
  }
  for (const [id, value] of Object.entries(canvas.edges)) {
    entries.push([id, { type: "edge", canvas: canvasId, value, path: ["canvases", canvasId, "edges", id] }]);
  }
  if (frozen) keptCanvases.set(canvas, { id: canvasId, entries });
  return entries;
}
