import { CATALOG_COLLECTIONS, ID_PREFIXES } from "../constants.js";
import { buildIndex } from "../query/build-index.js";
import { collectRefs } from "../query/refs.js";

/** Singular element name per catalog collection ("statuses" → "status"), from the ID prefixes. */
const SINGULAR = Object.fromEntries(
  Object.entries(CATALOG_COLLECTIONS).map(([collection, prefix]) => [
    collection,
    Object.keys(ID_PREFIXES).find(name => ID_PREFIXES[name] === prefix)
  ])
);

/** Code-point order of two strings (the same in every locale). */
export function compareText(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Entries of an ID map sorted by key, so rules report in a stable order whatever the input key order. */
export function sorted(map) {
  return Object.entries(map ?? {}).sort(([a], [b]) => compareText(a, b));
}

/**
 * Trigger tokens of a transition (spec §12.3): `on:evt_x`, `onMatch:leg.*`, `after:tmr_x`, `always`, `done:true`,
 * `done:rgn_x`, `via:ept_x`. Empty lists contribute nothing, so a transition whose triggers are all explicitly empty
 * has no trigger (it can never fire).
 */
export function triggersOf(edge) {
  const tokens = [];
  for (const id of edge.on ?? []) tokens.push(`on:${id}`);
  for (const pattern of edge.onMatch ?? []) tokens.push(`onMatch:${pattern}`);
  if (edge.after !== undefined) tokens.push(`after:${edge.after}`);
  if (edge.always === true) tokens.push("always");
  if (edge.done !== undefined) tokens.push(`done:${edge.done}`);
  if (edge.via !== undefined) tokens.push(`via:${edge.via}`);
  return tokens;
}

/** Edges that take part in execution: everything but links (spec §16.14). */
export function isLink(edge) {
  return edge.kind === "link";
}

/**
 * Everything rules need to know about a document, computed once per check.
 * @param {any} doc A schema-valid document.
 */
export function createFacts(doc) {
  const index = buildIndex(doc);
  const refs = collectRefs(doc);

  /** canvas ID → who has it as interior: { type: "root" | "inner" | "definition", id } */
  const owners = new Map();
  for (const ref of refs) {
    if (ref.section !== "content") continue;
    let owner = null;
    if (ref.field === "root") owner = { type: "root", id: doc.project.id };
    else if (ref.field === "inner.canvas") owner = { type: "inner", id: ref.source };
    else if (ref.field === "canvas" && ref.path[0] === "definitions") owner = { type: "definition", id: ref.source };
    if (!owner) continue;
    if (!owners.has(ref.target)) owners.set(ref.target, []);
    owners.get(ref.target).push(owner);
  }
  for (const list of owners.values()) list.sort((a, b) => compareText(a.id, b.id));

  /** Canvas reached through an `inner` (own canvas or definition body), or undefined. */
  const interiorOf = inner => inner?.canvas ?? (inner?.definition && doc.definitions[inner.definition]?.canvas);

  /** canvas ID → state nodes that have it as interior, directly or as instances of its definition. */
  const parents = new Map();
  for (const [canvasId, canvas] of sorted(doc.canvases)) {
    if (canvas.kind !== "machine") continue;
    for (const [nodeId, node] of sorted(canvas.nodes)) {
      const child = node.kind === "state" ? interiorOf(node.inner) : undefined;
      if (!child) continue;
      if (!parents.has(child)) parents.set(child, []);
      parents.get(child).push({ id: nodeId, canvas: canvasId });
    }
  }

  const outgoing = new Map();

  return {
    doc,
    index,
    refs,
    owners,
    interiorOf,

    /** IDs used by more than one element. */
    duplicates: new Set(index.duplicates),

    /** State nodes whose interior is this canvas. */
    parentStates: canvasId => parents.get(canvasId) ?? [],

    /**
     * Severity of rules that judge missing edges (spec §22): `complete` → error, `partial` (the default) →
     * incomplete, `unknown` → null (skip the rule).
     */
    levelSeverity(canvas) {
      if (canvas.transitions === "complete") return "error";
      if (canvas.transitions === "unknown") return null;
      return "incomplete";
    },

    /** Regions of a machine canvas: its declared regions, or one implicit region (key "") when it has none. */
    regionsOf(canvasId, canvas) {
      const declared = sorted(canvas.regions);
      if (declared.length === 0) return [{ key: "", id: canvasId, name: canvas.name }];
      return declared.map(([id, region]) => ({ key: id, id, name: region.name }));
    },

    /** Region key of a node: its region on a canvas with regions, "" on a canvas without. */
    regionKey(canvas, node) {
      return Object.keys(canvas.regions ?? {}).length ? (node.region ?? null) : "";
    },

    /** Outgoing non-link edges of a canvas's nodes: node ID → [edgeId, edge][], in edge ID order. */
    outgoing(canvasId) {
      if (!outgoing.has(canvasId)) {
        const canvas = doc.canvases[canvasId];
        const out = new Map(Object.keys(canvas.nodes).map(id => [id, []]));
        for (const [edgeId, edge] of sorted(canvas.edges)) {
          if (!isLink(edge)) out.get(edge.from)?.push([edgeId, edge]);
        }
        outgoing.set(canvasId, out);
      }
      return outgoing.get(canvasId);
    },

    /** Human description of an element for messages: `state "paused"`, `event "payin.confirmed"`, … */
    describe(id) {
      const entry = index.get(id);
      if (!entry) return `"${id}"`;
      const value = entry.value;
      const named = value.name ?? value.label;
      switch (entry.type) {
        case "project":
          return `project "${value.name}"`;
        case "canvas":
          return `${value.kind} canvas "${value.name}"`;
        case "catalog":
          return `${SINGULAR[entry.collection]} "${value.name}"`;
        case "node":
          return named === undefined ? `${value.kind} node ${id}` : `${value.kind} "${named}"`;
        case "edge": {
          const nodes = doc.canvases[entry.canvas].nodes;
          const end = nodeId => nodes[nodeId]?.name ?? nodes[nodeId]?.kind ?? nodeId;
          return `edge ${id} (${end(value.from)} → ${end(value.to)})`;
        }
        case "finding":
          return `finding ${value.code}`;
        case "lane":
          return `lane "${value.label}"`;
        case "note":
          return `note ${id}`;
        case "scenario":
          return `scenario "${value.name}"`;
        default:
          return `${entry.type} "${named ?? id}"`;
      }
    },

    /** Canvas an element lives on (or is), for Problem.canvas. */
    canvasOf(id) {
      const entry = index.get(id);
      if (!entry) return undefined;
      if (entry.type === "canvas") return id;
      if (entry.type === "note" || entry.type === "lane" || entry.type === "scenario") return entry.value.canvas;
      return entry.canvas;
    }
  };
}
