import { ownersOf } from "../query/index.js";
import { fail } from "./errors.js";

const SYSTEM_ELEMENTS = new Set(["actor", "service", "store", "queue", "external"]);
const FLOW_CONTAINERS = new Set(["while", "forEach", "subflow"]);
const IMPLEMENTED = new Set(["actions", "endpoints", "webhooks"]);

/**
 * Canvas kinds an element may have as interior (spec §9.8), or null when it cannot have one.
 * @param {any} doc
 * @param {import("../query/build-index.js").IndexEntry} entry
 * @param {any} [value] The element value to judge (defaults to the stored one, e.g. a pending update).
 */
export function allowedInteriors(doc, entry, value = entry.value) {
  if (entry.type === "catalog") return IMPLEMENTED.has(entry.collection) ? ["flow"] : null;
  if (entry.type !== "node") return null;
  const canvasKind = doc.canvases[entry.canvas].kind;
  if (canvasKind === "system" && SYSTEM_ELEMENTS.has(value.kind)) return ["system", "machine", "flow"];
  if (canvasKind === "machine" && value.kind === "state") return ["machine"];
  if (canvasKind === "flow" && FLOW_CONTAINERS.has(value.kind)) return ["flow"];
  return null;
}

/**
 * Check that `inner` may become the interior of the element: the target exists, has an allowed kind and,
 * for an own canvas, is not the root and has no other owner.
 * @param {ReturnType<import("./context.js").createContext>} ctx
 * @param {import("../query/build-index.js").IndexEntry} entry The owner (as stored).
 * @param {{ canvas?: string, definition?: string }} inner
 * @param {any} [value] The owner value after the change.
 */
export function checkInner(ctx, entry, inner, value = entry.value) {
  const allowed = allowedInteriors(ctx.doc, entry, value);
  if (!allowed) fail("NOT_ALLOWED", `"${entry.id}" cannot have an interior`, { id: entry.id });
  if (inner.canvas) {
    const canvas = ctx.doc.canvases[inner.canvas];
    if (!canvas) fail("NOT_FOUND", `No canvas "${inner.canvas}"`, { id: inner.canvas });
    if (!allowed.includes(canvas.kind)) {
      fail("WRONG_KIND", `"${entry.id}" can only contain ${allowed.join(", ")} canvases`, { id: inner.canvas });
    }
    const others = ownersOf(ctx.doc, inner.canvas).filter(owner => owner.id !== entry.id);
    if (others.length) {
      fail("NOT_ALLOWED", `Canvas "${inner.canvas}" already belongs to another owner; use a definition to reuse it`, {
        owners: others
      });
    }
  }
  if (inner.definition) {
    const definition = ctx.doc.definitions[inner.definition];
    if (!definition) fail("NOT_FOUND", `No definition "${inner.definition}"`, { id: inner.definition });
    if (!allowed.includes(definition.kind)) {
      fail("WRONG_KIND", `"${entry.id}" can only contain ${allowed.join(", ")} definitions`, { id: inner.definition });
    }
  }
  // Catalog items are on no canvas, so only nodes can close a cycle.
  if (entry.canvas !== undefined) {
    const target = inner.canvas ?? ctx.doc.definitions[inner.definition].canvas;
    if (reachableCanvases(ctx.doc, target).has(entry.canvas)) {
      fail("NOT_ALLOWED", `"${entry.id}" would contain its own canvas (${entry.canvas}); levels cannot form a cycle`, {
        id: entry.id
      });
    }
  }
}

/** `canvasId` and every canvas below it, through own interiors and definition bodies. */
function reachableCanvases(doc, canvasId) {
  const seen = new Set();
  const pending = [canvasId];
  while (pending.length) {
    const id = pending.pop();
    if (seen.has(id) || !doc.canvases[id]) continue;
    seen.add(id);
    for (const node of Object.values(doc.canvases[id].nodes)) {
      if (node.inner?.canvas) pending.push(node.inner.canvas);
      if (node.inner?.definition) pending.push(doc.definitions[node.inner.definition]?.canvas);
    }
  }
  return seen;
}

/**
 * Refuse a change that would drop or replace an element's own interior canvas, which would leave it orphaned.
 * @param {any} before Stored element value.
 * @param {any} after Changed element value.
 */
export function keepOwnInterior(before, after) {
  const own = before.inner?.canvas;
  if (own && after.inner?.canvas !== own) {
    fail(
      "NOT_ALLOWED",
      `"inner" holds an own canvas (${own}); remove it with canvas.remove or reuse it with definition.extract`,
      { canvas: own }
    );
  }
}
