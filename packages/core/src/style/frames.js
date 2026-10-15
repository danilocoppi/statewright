// What a figure shows of the levels inside its boxes (spec §14; mixed levels spec §4.2): which interior a box has, how
// it is displayed, and which canvases are therefore drawn on one figure.

/** The catalog item embedded steps show: an action, endpoint or webhook (mixed levels spec §4.2), or undefined. */
export const stepsItem = (doc, node) =>
  doc.catalog.actions[node.action] ?? doc.catalog.endpoints[node.action] ?? doc.catalog.webhooks[node.action];

/**
 * The canvas a node's interior shows (own canvas or definition body), or null. Embedded steps show their catalog
 * item's flow.
 */
export function interiorOf(doc, node) {
  const inner = node?.kind === "steps" ? stepsItem(doc, node)?.inner : node?.inner;
  if (inner?.canvas) return doc.canvases[inner.canvas] ? inner.canvas : null;
  const body = inner?.definition && doc.definitions[inner.definition]?.canvas;
  return body && doc.canvases[body] ? body : null;
}

/**
 * How a node with an interior is displayed: the stored display, else a frame for embedded steps (a card when other
 * steps of the same item on the level come first), else a node. "node" for nodes without an interior.
 * @returns {"node"|"card"|"frame"}
 */
export function displayOf(doc, canvasId, nodeId) {
  const canvas = doc.canvases[canvasId];
  const node = canvas?.nodes[nodeId];
  if (!interiorOf(doc, node)) return "node";
  const stored = doc.layout?.canvases?.[canvasId]?.nodes?.[nodeId]?.display;
  if (stored) return stored;
  if (node.kind !== "steps") return "node";
  const first = Object.keys(canvas.nodes)
    .sort()
    .find(id => canvas.nodes[id].kind === "steps" && canvas.nodes[id].action === node.action);
  return first === nodeId ? "frame" : "card";
}

/**
 * Canvases drawn on one figure: the canvas and, recursively, interiors displayed as frames (each canvas once).
 * @param {any} doc
 * @param {string} canvasId
 * @returns {string[]}
 */
export function figureCanvases(doc, canvasId, seen = new Set()) {
  if (seen.has(canvasId) || !doc.canvases[canvasId]) return [];
  seen.add(canvasId);
  const out = [canvasId];
  for (const [nodeId, node] of Object.entries(doc.canvases[canvasId].nodes)) {
    const interior = interiorOf(doc, node);
    if (interior && displayOf(doc, canvasId, nodeId) === "frame") out.push(...figureCanvases(doc, interior, seen));
  }
  return out;
}
