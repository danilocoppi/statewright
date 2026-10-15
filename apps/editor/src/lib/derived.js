// What is worked out from a whole document, once per document (spec §9: documents of up to 2,000 elements, an edit on
// the canvas within 50 ms). Core's documents are immutable — every change makes a new one — so each is walked once and
// what was found is kept as long as the document is.
import { buildIndex, collectRefs, hierarchy } from "statewright";

const indexes = new WeakMap();
const uses = new WeakMap();
const paths = new WeakMap();

/** Core's index of the document's elements (`buildIndex`), made once per document. */
export function indexOf(doc) {
  let index = indexes.get(doc);
  if (!index) indexes.set(doc, (index = buildIndex(doc)));
  return index;
}

/**
 * The path of levels down to a level — what Core's `pathTo(doc, canvasId)` gives — from one walk of the levels per
 * document. Null for a level no tree reaches.
 * @returns {Array<{ canvas: string, via: string | null, definition: string | null }> | null}
 */
export function levelPathOf(doc, canvasId) {
  let found = paths.get(doc);
  if (!found) {
    found = new Map();
    // Each tree in Core's order, each level the first time it is reached, as `pathTo` searches them.
    const walk = (tree, above) => {
      const path = [...above, { canvas: tree.canvas, via: tree.via, definition: tree.definition }];
      if (!found.has(tree.canvas)) found.set(tree.canvas, path);
      for (const child of tree.children) walk(child, path);
    };
    const trees = hierarchy(doc);
    for (const tree of [trees.root, ...trees.catalog, ...trees.definitions]) walk(tree, []);
    paths.set(doc, found);
  }
  return found.get(canvasId) ?? null;
}

/** How many references an element has — `usagesOf(doc, id).length` — from one walk per document. */
export function usageCount(doc, id) {
  let counts = uses.get(doc);
  if (!counts) {
    counts = new Map();
    for (const ref of collectRefs(doc)) counts.set(ref.target, (counts.get(ref.target) ?? 0) + 1);
    uses.set(doc, counts);
  }
  return counts.get(id) ?? 0;
}
