// Which nodes are guests (mixed levels spec §3): elements of another kind drawn on a level in a role. They take no
// part in the level's own semantics (a machine's states and transitions, a flow's steps), so its rules skip them.

/** Guest node kinds by kind of level. */
export const GUEST_KINDS = Object.freeze({
  system: Object.freeze([]),
  machine: Object.freeze(["participant", "steps"]),
  flow: Object.freeze(["participant", "state"])
});

/**
 * Whether a node is a guest on a level of this kind.
 * @param {"system"|"machine"|"flow"} canvasKind
 * @param {{ kind: string }} node
 */
export const isGuest = (canvasKind, node) =>
  canvasKind === "mixed" ?
    node?.kind === "participant" || node?.kind === "steps" || (node?.kind === "state" && node.target !== undefined)
  : (GUEST_KINDS[canvasKind]?.includes(node?.kind) ?? false);

/** Node kinds by the kind of level they belong to (a `state` with a `target` is a flow's state guest). */
const HOMES = {
  machine: new Set(["initial", "entry", "state", "choice", "history", "any", "participant", "steps"]),
  flow: new Set([
    "start",
    "end",
    "action",
    "if",
    "switch",
    "while",
    "forEach",
    "parallel",
    "join",
    "emit",
    "wait",
    "call",
    "webhook",
    "assign",
    "subflow"
  ]),
  system: new Set(["actor", "service", "store", "queue", "external"])
};

/**
 * The kind of level a node belongs to (mixed levels spec §4.5): its level's kind, or, on a mixed level, the kind its
 * own kind comes from; null for a shortcut on a mixed level.
 * @returns {"system"|"machine"|"flow"|null}
 */
export function homeKind(canvasKind, node) {
  if (canvasKind !== "mixed") return canvasKind;
  if (!node || node.kind === "ref") return null;
  if (node.kind === "state") return node.target === undefined ? "machine" : "flow";
  return Object.keys(HOMES).find(kind => HOMES[kind].has(node.kind)) ?? null;
}

const FLOW_EDGES = new Set(["next", "true", "false", "case", "default", "error"]);
const SYSTEM_EDGES = new Set(["command", "event", "webhook", "stream", "data"]);

/**
 * What a connection is (mixed levels spec §4.5): its level's kind, or, on a mixed level, a transition (`machine`), a
 * flow's edge or a system's connection — by its kind, else by the kind of its ends; null for a link.
 * @returns {"system"|"machine"|"flow"|null}
 */
export function edgeHome(canvas, edge) {
  if (canvas.kind !== "mixed") return canvas.kind;
  if (edge.kind === "link") return null;
  if (edge.kind === "transition") return "machine";
  if (FLOW_EDGES.has(edge.kind)) return "flow";
  if (SYSTEM_EDGES.has(edge.kind)) return "system";
  const from = homeKind("mixed", canvas.nodes[edge.from]);
  return from === "machine" ? null : from;
}

/**
 * The level a machine's state is on (on a machine level, or on a mixed level as a state, not a state guest), or null.
 * @param {any} doc
 * @param {string} stateId
 * @returns {string|null}
 */
export function stateLevelOf(doc, stateId) {
  for (const [canvasId, canvas] of Object.entries(doc.canvases)) {
    const node = canvas.nodes[stateId];
    if (node?.kind === "state" && homeKind(canvas.kind, node) === "machine") return canvasId;
  }
  return null;
}
