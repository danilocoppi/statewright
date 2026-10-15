import { buildIndex } from "./build-index.js";
import { collectRefs, createRefCollector } from "./refs.js";

export { buildIndex, collectRefs, createRefCollector };

/**
 * The element with this ID, or null.
 * @param {any} doc
 * @param {string} id
 */
export function resolve(doc, id) {
  return buildIndex(doc).get(id) ?? null;
}

/**
 * Every reference to `id`.
 * @param {any} doc
 * @param {string} id
 */
export function usagesOf(doc, id) {
  return collectRefs(doc).filter(ref => ref.target === id);
}

/**
 * Who has this canvas as interior: elements via `inner.canvas`, definitions via `canvas`, and the
 * document via `root`. A valid document has exactly one owner per canvas (rules report the rest).
 * @param {any} doc
 * @param {string} canvasId
 * @returns {Array<{ type: "root" } | { type: "inner", id: string } | { type: "definition", id: string }>}
 */
export function ownersOf(doc, canvasId) {
  return collectRefs(doc)
    .filter(ref => ref.target === canvasId && ref.section === "content")
    .flatMap(ref => {
      if (ref.field === "root") return [{ type: "root" }];
      if (ref.field === "inner.canvas") return [{ type: "inner", id: ref.source }];
      if (ref.field === "canvas" && ref.path[0] === "definitions") return [{ type: "definition", id: ref.source }];
      return [];
    });
}

/** First owner of a canvas, or null for an orphan. */
export function ownerOf(doc, canvasId) {
  return ownersOf(doc, canvasId)[0] ?? null;
}

/**
 * @typedef {object} TreeNode
 * @property {string} canvas
 * @property {string|null} via Element entered to reach this canvas (null for tree roots).
 * @property {string|null} definition Definition whose body this canvas is, when entered through an instance.
 * @property {boolean} cycle True when this canvas already appears higher up the path (children are not expanded).
 * @property {TreeNode[]} children
 */

/** Canvas reached through an element's `inner`, with the definition when it is an instance. */
function interior(doc, inner) {
  if (!inner) return null;
  if (inner.canvas) return doc.canvases[inner.canvas] ? { canvas: inner.canvas, definition: null } : null;
  const definition = doc.definitions[inner.definition];
  return definition && doc.canvases[definition.canvas] ?
      { canvas: definition.canvas, definition: inner.definition }
    : null;
}

/**
 * @param {Set<string>} ancestors Canvases already on the path from the tree root; meeting one again is a cycle
 *   (an inner.canvas loop or definitions containing each other).
 */
function subtree(doc, canvasId, via, definition, ancestors) {
  const cycle = ancestors.has(canvasId);
  const node = { canvas: canvasId, via, definition, cycle, children: [] };
  // A dangling root has no canvas to expand; rules report it.
  if (cycle || !doc.canvases[canvasId]) return node;
  const next = new Set([...ancestors, canvasId]);
  for (const [id, element] of Object.entries(doc.canvases[canvasId].nodes)) {
    const child = interior(doc, element.inner);
    if (child) node.children.push(subtree(doc, child.canvas, id, child.definition, next));
  }
  return node;
}

/**
 * Levels of detail as trees: from the root canvas, from catalog items with an implementation flow,
 * and from every definition body (for libraries/navigation).
 * @param {any} doc
 * @returns {{ root: TreeNode, catalog: TreeNode[], definitions: TreeNode[], unattached: TreeNode[] }} `unattached`: the
 *   levels none of the others reaches (spec §22 canvas.orphan), with the levels inside them.
 */
export function hierarchy(doc) {
  const catalog = [];
  for (const collection of ["actions", "endpoints", "webhooks"]) {
    for (const [id, item] of Object.entries(doc.catalog[collection])) {
      const child = interior(doc, item.inner);
      if (child) catalog.push(subtree(doc, child.canvas, id, child.definition, new Set()));
    }
  }
  const definitions = Object.entries(doc.definitions)
    .filter(([, definition]) => doc.canvases[definition.canvas])
    .map(([id, definition]) => subtree(doc, definition.canvas, null, id, new Set()));
  const root = subtree(doc, doc.root, null, null, new Set());
  return { root, catalog, definitions, unattached: unattached(doc, [root, ...catalog, ...definitions]) };
}

/** Every canvas in a tree. */
function walk(tree, into = new Set()) {
  into.add(tree.canvas);
  for (const child of tree.children) walk(child, into);
  return into;
}

/**
 * Levels no tree reaches (canvas.orphan), as trees of their own: those that no other unattached level enters first,
 * then any left over (unattached levels that enter each other in a ring).
 */
function unattached(doc, trees) {
  const seen = new Set();
  for (const tree of trees) walk(tree, seen);
  const left = Object.keys(doc.canvases).filter(id => !seen.has(id));
  const entered = new Set(
    left.flatMap(id =>
      Object.values(doc.canvases[id].nodes ?? {})
        .map(node => interior(doc, node.inner)?.canvas)
        .filter(child => child && child !== id)
    )
  );
  const found = [];
  for (const id of [...left.filter(id => !entered.has(id)), ...left]) {
    if (seen.has(id)) continue;
    const tree = subtree(doc, id, null, null, new Set());
    walk(tree, seen);
    found.push(tree);
  }
  return found;
}

function findPath(tree, canvasId) {
  if (tree.canvas === canvasId) return [tree];
  for (const child of tree.children) {
    const below = findPath(child, canvasId);
    if (below) return [tree, ...below];
  }
  return null;
}

/**
 * Breadcrumb to an element: the chain of canvases from a tree root down to the canvas that is (or contains) `id`.
 * Searches the root tree first, then catalog implementations, then definition bodies, then unattached levels. Null
 * when the element is on no level.
 * @param {any} doc
 * @param {string} id A canvas, node, edge or region ID.
 * @returns {Array<{ canvas: string, via: string|null, definition: string|null }> | null}
 */
export function pathTo(doc, id) {
  const entry = buildIndex(doc).get(id);
  if (!entry) return null;
  const canvasId = entry.type === "canvas" ? id : entry.canvas;
  if (!canvasId) return null;
  const trees = hierarchy(doc);
  for (const tree of [trees.root, ...trees.catalog, ...trees.definitions, ...trees.unattached]) {
    const path = findPath(tree, canvasId);
    if (path) return path.map(({ canvas, via, definition }) => ({ canvas, via, definition }));
  }
  return null;
}
