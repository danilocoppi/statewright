import { CATALOG_COLLECTIONS } from "../constants.js";

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
    add(canvasId, { type: "canvas", value: canvas, path: ["canvases", canvasId] });
    for (const [id, value] of Object.entries(canvas.regions ?? {})) {
      add(id, { type: "region", canvas: canvasId, value, path: ["canvases", canvasId, "regions", id] });
    }
    for (const [id, value] of Object.entries(canvas.nodes)) {
      add(id, { type: "node", canvas: canvasId, value, path: ["canvases", canvasId, "nodes", id] });
    }
    for (const [id, value] of Object.entries(canvas.edges)) {
      add(id, { type: "edge", canvas: canvasId, value, path: ["canvases", canvasId, "edges", id] });
    }
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
