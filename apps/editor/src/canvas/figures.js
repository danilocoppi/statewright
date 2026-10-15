// One drawing of a level per document (performance spec §3 P2): the canvas draws it, and what else reads the level's
// geometry — marks, comments, locks, proposals, edits — reads that figure instead of drawing the level again. A
// figure's geometry does not depend on its colours, marker IDs or tooltips.
import { figureOf } from "statewright";

const kept = new WeakMap();
let drawings = 0;

/** How many figures were drawn so far (tests count them). */
export const drawnCount = () => drawings;

/** Draw a level's figure, counted. */
export function draw(doc, canvasId, options = {}) {
  drawings += 1;
  return figureOf(doc, canvasId, options);
}

/** Keep the figure drawn for a document's level (the canvas's own). */
export function remember(doc, canvasId, figure) {
  if (!kept.has(doc)) kept.set(doc, new Map());
  kept.get(doc).set(canvasId, figure);
}

/** A level's figure for its geometry: the one drawn for this document, else drawn now and kept. */
export function figureFor(doc, canvasId) {
  const known = kept.get(doc)?.get(canvasId);
  if (known) return known;
  const figure = draw(doc, canvasId);
  remember(doc, canvasId, figure);
  return figure;
}
