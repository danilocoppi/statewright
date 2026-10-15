// Which canvas a run of a level starts from (simulator spec §5.1): a machine that is not the interior of a state, or a
// flow that is not the body of a `while`, `forEach` or `subflow`. A level inside one runs as part of it.
import { sorted } from "../rules/facts.js";

/** Flow nodes whose interior runs as part of their flow. */
const BODY_OWNERS = new Set(["while", "forEach", "subflow"]);

/** The canvas an element's `inner` reaches: its own canvas or its definition's body. */
const interiorOf = (doc, inner) =>
  inner?.canvas ?? (inner?.definition ? doc.definitions[inner.definition]?.canvas : null);

/** Nodes whose interior is `canvasId`, in canvas then node ID order. */
function ownersOf(doc, canvasId) {
  const owners = [];
  for (const [canvas, value] of sorted(doc.canvases)) {
    for (const [node, element] of sorted(value.nodes)) {
      if (interiorOf(doc, element.inner) === canvasId) owners.push({ canvas, node, kind: element.kind });
    }
  }
  return owners;
}

/** The top executable canvases inside a system canvas, through its boxes and nested system canvases. */
function insideOf(doc, systemId, seen) {
  const found = [];
  for (const [, node] of sorted(doc.canvases[systemId].nodes)) {
    const inner = interiorOf(doc, node.inner);
    if (!inner || !doc.canvases[inner] || seen.has(inner)) continue;
    seen.add(inner);
    const result =
      doc.canvases[inner].kind === "system" ? insideOf(doc, inner, seen) : [executableOf(doc, inner).canvas];
    for (const canvas of result) if (canvas && !found.includes(canvas)) found.push(canvas);
  }
  return found;
}

/**
 * The canvas a run of this level starts from: the level itself, or the nearest machine or flow it runs inside (a
 * definition's body used in several places runs inside its first user, in ID order). System canvases do not run;
 * they list the top executable canvases inside them.
 * @param {any} doc
 * @param {string} canvasId
 * @returns {{ canvas: string, kind: "machine" | "flow" } | { reason: "system", inside: string[] } | { reason: "missing" | "cycle" }}
 */
export function executableOf(doc, canvasId, seen = new Set()) {
  const canvas = doc.canvases[canvasId];
  if (!canvas) return { reason: "missing" };
  if (canvas.kind === "system") return { reason: "system", inside: insideOf(doc, canvasId, new Set([canvasId])) };
  if (seen.has(canvasId)) return { reason: "cycle" };
  seen.add(canvasId);
  const owner = ownersOf(doc, canvasId).find(
    ({ canvas: at, kind }) =>
      doc.canvases[at].kind === canvas.kind && (canvas.kind === "machine" ? kind === "state" : BODY_OWNERS.has(kind))
  );
  return owner ? executableOf(doc, owner.canvas, seen) : { canvas: canvasId, kind: canvas.kind };
}
