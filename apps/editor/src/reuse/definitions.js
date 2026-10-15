// Reuse (spec §7.6, Core spec §11): interiors of boxes and catalog items, and reusable parts — definitions whose body
// is one level, used by the boxes that name it.
import { collectRefs, ownerOf } from "statewright";

import { idsFor } from "@/editing/ids";

/** The kinds of interior each kind of box can have (Core spec §9.8). */
const INTERIORS = {
  system: {
    actor: ["system", "machine", "flow"],
    service: ["system", "machine", "flow"],
    store: ["system", "machine", "flow"],
    queue: ["system", "machine", "flow"],
    external: ["system", "machine", "flow"]
  },
  machine: { state: ["machine"] },
  flow: { while: ["flow"], forEach: ["flow"], subflow: ["flow"] }
};

/** Catalog items with an implementation: a flow. */
const CATALOG_INTERIORS = { actions: ["flow"], endpoints: ["flow"], webhooks: ["flow"] };

/**
 * The kinds of interior an element can have: none for most, a flow for an action, a machine for a state, any for a
 * system's boxes.
 * @param {{ type: string, value: any, canvas?: string, collection?: string }} entry
 * @returns {Array<"system" | "machine" | "flow">}
 */
export function interiorKinds(doc, entry) {
  if (entry.type === "catalog") return CATALOG_INTERIORS[entry.collection] ?? [];
  if (entry.type !== "node") return [];
  return INTERIORS[doc.canvases[entry.canvas].kind]?.[entry.value.kind] ?? [];
}

/** How many boxes (and catalog items) use each reusable part. @returns {Map<string, number>} */
export function instanceCounts(doc) {
  const counts = new Map();
  for (const ref of collectRefs(doc)) {
    if (ref.field === "inner.definition") counts.set(ref.target, (counts.get(ref.target) ?? 0) + 1);
  }
  return counts;
}

/**
 * The reusable part a level belongs to: the definition whose body it is, or whose body holds it further down; null
 * for the project's own levels.
 */
export function partOf(doc, canvasId) {
  const seen = new Set();
  let level = canvasId;
  while (level && !seen.has(level)) {
    seen.add(level);
    const owner = ownerOf(doc, level);
    if (!owner || owner.type === "root") return null;
    if (owner.type === "definition") return owner.id;
    const entry = Object.entries(doc.canvases).find(([, canvas]) => canvas.nodes[owner.id]);
    level = entry?.[0];
    if (!level) return null;
  }
  return null;
}

/**
 * Give an element a new, empty interior of a kind (named after it).
 * @returns {{ id: string, commands: object[] }}
 */
export function interiorCommands(doc, ownerId, kind, name, ids = idsFor(doc)) {
  const id = ids.take("cnv", name);
  return { id, commands: [{ type: "canvas.create", args: { kind, name, owner: ownerId, id } }] };
}
