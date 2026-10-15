// A mixed level seen as the typed level it runs as (mixed levels spec §4.5): its states and transitions form one
// machine; with no states, its steps form a flow; with neither, it is a system. The view keeps every ID, so traces,
// paths, problems and contracts name the mixed level's own elements; what the view sets aside (a machine level's steps
// and boxes) is still drawn, laid out, referenced and documented from the document itself.
import { edgeHome, homeKind, isGuest } from "./kinds.js";

/** Fields a level of each kind has besides its header and its nodes and edges. */
const OWN_FIELDS = {
  machine: ["subject", "context", "regions", "transitions"],
  flow: ["vars"],
  system: []
};
const ALL_FIELDS = new Set(Object.values(OWN_FIELDS).flat());

/**
 * What a mixed level runs as: a machine when it has states or initial nodes, else a flow when it has a start, else a
 * system.
 * @returns {"machine"|"flow"|"system"}
 */
export function partOf(canvas) {
  const nodes = Object.values(canvas.nodes);
  if (nodes.some(node => homeKind("mixed", node) === "machine" && !isGuest("mixed", node))) return "machine";
  if (nodes.some(node => node.kind === "start")) return "flow";
  return "system";
}

/** Whether a node of a mixed level belongs to its view as a level of this kind (guests where they are guests). */
function belongs(node, part) {
  if (node.kind === "ref") return true;
  if (node.kind === "participant") return part !== "system";
  return homeKind("mixed", node) === part;
}

/**
 * A mixed level as a level of one kind: its nodes of that kind (with shortcuts and the guests of that kind), its
 * connections of that kind (a transition without its `kind`) and the links between what is kept.
 * @param {any} canvas A mixed canvas.
 * @param {"machine"|"flow"|"system"} [part] Default: what it runs as.
 */
export function viewOf(canvas, part = partOf(canvas)) {
  const nodes = Object.fromEntries(
    Object.entries(canvas.nodes)
      .filter(([, node]) => belongs(node, part))
      .map(([id, node]) => {
        if (part === "machine" || node.region === undefined) return [id, node];
        const rest = { ...node };
        delete rest.region;
        return [id, rest];
      })
  );
  const edges = Object.fromEntries(
    Object.entries(canvas.edges)
      .filter(([, edge]) => nodes[edge.from] && nodes[edge.to])
      .filter(([, edge]) => edge.kind === "link" || edgeHome(canvas, edge) === part)
      .map(([id, edge]) => {
        if (edge.kind !== "transition") return [id, edge];
        const transition = { ...edge };
        delete transition.kind;
        return [id, transition];
      })
  );
  const header = Object.fromEntries(
    Object.entries(canvas).filter(
      ([key]) => !["kind", "nodes", "edges"].includes(key) && (!ALL_FIELDS.has(key) || OWN_FIELDS[part].includes(key))
    )
  );
  return { ...header, kind: part, nodes, edges };
}

const views = new WeakMap();

/**
 * The document with each mixed level replaced by the typed level it runs as (`viewOf`); the document itself when it
 * has none. Definitions of mixed bodies take their body's kind. Cached per frozen document (a document that can still
 * change is seen anew each time).
 * @param {any} doc A schema-valid document.
 */
export function typedView(doc) {
  if (views.has(doc)) return views.get(doc);
  const mixed = Object.entries(doc.canvases).filter(([, canvas]) => canvas.kind === "mixed");
  let view = doc;
  if (mixed.length) {
    const canvases = { ...doc.canvases };
    for (const [id, canvas] of mixed) canvases[id] = viewOf(canvas);
    const definitions = Object.fromEntries(
      Object.entries(doc.definitions).map(([id, definition]) => [
        id,
        definition.kind === "mixed" ?
          { ...definition, kind: canvases[definition.canvas]?.kind ?? "system" }
        : definition
      ])
    );
    view = { ...doc, canvases, definitions };
  }
  if (Object.isFrozen(doc)) views.set(doc, view);
  return view;
}
