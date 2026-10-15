import { createGeometry, labelSize } from "./geometry.js";

const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Overlaps in the stored layout of one canvas (spec §14, §22 `layout.overlap`): node boxes that overlap each other,
 * and edge labels that overlap a node box or another label. Elements without a stored position are ignored.
 * @param {any} doc
 * @param {string} canvasId
 * @param {{ geometry?: ReturnType<typeof createGeometry> }} [options]
 * @returns {Array<{ a: string, b: string, kind: "node" | "label" }>}
 */
export function measureOverlaps(doc, canvasId, { geometry = createGeometry(doc) } = {}) {
  const canvas = doc.canvases[canvasId];
  const stored = doc.layout?.canvases?.[canvasId];
  if (!canvas || !stored) return [];
  const nodes = Object.keys(canvas.nodes)
    .sort()
    .filter(id => stored.nodes?.[id])
    .map(id => ({ id, x: stored.nodes[id].x, y: stored.nodes[id].y, ...geometry.size(canvasId, id) }));
  const labels = Object.keys(canvas.edges)
    .sort()
    .filter(id => stored.edges?.[id]?.labelAt)
    .map(id => {
      const box = labelSize(geometry.style.edgeLabel(id));
      if (!box) return null;
      const [x, y] = stored.edges[id].labelAt;
      return { id, x: x - box.w / 2, y: y - box.h / 2, w: box.w, h: box.h };
    })
    .filter(Boolean);
  const found = [];
  nodes.forEach((a, i) => {
    for (const b of nodes.slice(i + 1)) if (intersects(a, b)) found.push({ a: a.id, b: b.id, kind: "node" });
  });
  labels.forEach((a, i) => {
    for (const b of nodes) if (intersects(a, b)) found.push({ a: a.id, b: b.id, kind: "label" });
    for (const b of labels.slice(i + 1)) if (intersects(a, b)) found.push({ a: a.id, b: b.id, kind: "label" });
  });
  return found;
}
