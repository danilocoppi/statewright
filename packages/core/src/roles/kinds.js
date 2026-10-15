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
export const isGuest = (canvasKind, node) => GUEST_KINDS[canvasKind]?.includes(node?.kind) ?? false;
