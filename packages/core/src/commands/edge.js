import { z } from "zod";
import { FlowEdge, MachineEdge, MixedEdge, SystemEdge } from "../schema/canvas.js";
import {
  allocateId,
  applyChange,
  changeArgs,
  changed,
  checkRefs,
  clone,
  refsOf,
  requireEntry,
  validate
} from "./context.js";
import { fail } from "./errors.js";
import { removeElements } from "./remove.js";
import { edgeHome, homeKind, isGuest } from "../roles/kinds.js";

const SCHEMAS = { system: SystemEdge, machine: MachineEdge, flow: FlowEdge, mixed: MixedEdge };
const NOT_TARGETS = new Set(["initial", "entry", "any"]);

/**
 * The rules for the ends of machine and flow edges: edges touching a ref node are links and links touch a ref
 * node; initial, entry and any nodes are never targets (spec §12.3).
 * @param {any} canvas
 * @param {string} edgeId
 * @param {any} edge
 * @param {(nodeId: string) => any} [nodeOf] Resolves an end (lets node.update judge a node's pending change).
 */
export function checkEdgeEnds(canvas, edgeId, edge, nodeOf = nodeId => canvas.nodes[nodeId]) {
  if (canvas.kind === "system") return;
  const from = nodeOf(edge.from);
  const to = nodeOf(edge.to);
  if (canvas.kind === "mixed") return checkMixedEnds(canvas, edgeId, edge, from, to);
  const touchesRef = from.kind === "ref" || to.kind === "ref";
  if (touchesRef !== (edge.kind === "link")) {
    fail(
      "NOT_ALLOWED",
      `Edge "${edgeId}": edges touching a ref node must have kind "link", and links must touch a ref node`,
      { id: edgeId }
    );
  }
  // Guests stand for elements of other kinds (mixed levels spec §3): their roles are read from fields, not drawn as the
  // level's own transitions or steps. Shortcuts may still link to them.
  if (edge.kind !== "link" && (isGuest(canvas.kind, from) || isGuest(canvas.kind, to))) {
    const guest = isGuest(canvas.kind, from) ? from : to;
    fail(
      "NOT_ALLOWED",
      `Edge "${edgeId}": a ${guest.kind} guest takes no part in this level's ${canvas.kind === "machine" ? "transitions" : "steps"}; its role is set by its fields`,
      { id: edgeId }
    );
  }
  if (canvas.kind === "machine" && NOT_TARGETS.has(to.kind)) {
    fail("NOT_ALLOWED", `Edge "${edgeId}": a ${to.kind} node cannot be the target of an edge`, { id: edgeId });
  }
}

/** "a state", "an end", "an initial node". */
const named = kind => `${/^[aeiou]/i.test(kind) ? "an" : "a"} ${kind}`;

/**
 * Why a connection on a mixed level means nothing (mixed levels spec §4.5), or null: it means what its ends make it —
 * a transition between a machine's nodes (saying so with `kind: "transition"`), a flow's edge between steps, a system's
 * connection between boxes, a link to or from a shortcut. Shared by `edge.add` and the rule `edge.mixed`.
 * @returns {string | null}
 */
export function mixedEndsProblem(canvas, edge, from, to) {
  if (!from || !to) return null;
  const touchesRef = from.kind === "ref" || to.kind === "ref";
  if (touchesRef !== (edge.kind === "link")) {
    return 'edges touching a ref node are links (kind "link"), and only they';
  }
  if (touchesRef) return null;
  for (const end of [from, to]) {
    if (isGuest("mixed", end)) return `${named(end.kind)} takes part in no connection; its role is set by its fields`;
  }
  const [a, b] = [homeKind("mixed", from), homeKind("mixed", to)];
  if (a !== b) return `${named(from.kind)} cannot lead to ${named(to.kind)}: they belong to different kinds of level`;
  // What the connection says it is: its kind, else what its ends are (a transition always says so).
  const is =
    edge.kind !== undefined ? edgeHome(canvas, edge)
    : a === "machine" ? null
    : a;
  if (is !== a) {
    if (a === "machine")
      return `between ${named(from.kind)} and ${named(to.kind)} a connection is a transition: give it kind "transition"`;
    const what = { flow: "a flow's edge", system: "a system's connection" };
    return `between ${named(from.kind)} and ${named(to.kind)} a connection is ${what[a]}, not kind "${edge.kind}"`;
  }
  if (a === "machine" && NOT_TARGETS.has(to.kind)) return `${named(to.kind)} node cannot be the target of an edge`;
  return null;
}

/** On a mixed level, refuse a connection whose ends mean nothing together. */
function checkMixedEnds(canvas, edgeId, edge, from, to) {
  const problem = mixedEndsProblem(canvas, edge, from, to);
  if (problem) fail("NOT_ALLOWED", `Edge "${edgeId}": ${problem}`, { id: edgeId });
}

/** Validate an edge as it will be stored in `canvasId`. */
function checkEdge(ctx, canvasId, edgeId, edge) {
  const canvas = ctx.doc.canvases[canvasId];
  validate(SCHEMAS[canvas.kind], edge, ["canvases", canvasId, "edges", edgeId]);
  checkRefs(ctx, refsOf("edge", canvas.kind, canvasId, edgeId, edge), { canvas: canvasId });
  checkEdgeEnds(canvas, edgeId, edge);
}

/** Display name of a node for generated edge IDs. */
const nameOf = (canvas, nodeId) => canvas.nodes[nodeId]?.name ?? canvas.nodes[nodeId]?.kind ?? "node";

/** Edge commands (spec §21). */
export default [
  {
    type: "edge.add",
    description: "Connect two nodes of the same canvas (a transition, interaction or flow step).",
    args: z.strictObject({
      canvas: z.string(),
      edge: z
        .record(z.string(), z.unknown())
        .describe("The edge with from and to node IDs (see the format reference)."),
      id: z.string().optional()
    }),
    run(ctx, { canvas, edge, id }) {
      const canvasEntry = requireEntry(ctx, canvas, ["canvas"]);
      const value = clone(edge);
      const base = `${nameOf(canvasEntry.value, value.from)} ${nameOf(canvasEntry.value, value.to)}`;
      const edgeId = allocateId(ctx, "edg", base, id);
      checkEdge(ctx, canvas, edgeId, value);
      canvasEntry.value.edges[edgeId] = value;
    }
  },
  {
    type: "edge.update",
    description: "Change fields of an edge, such as triggers, guard, actions, intent or its ends.",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["edge"]);
      checkEdge(ctx, entry.canvas, id, changed(entry.value, change));
      applyChange(entry.value, change);
    }
  },
  {
    type: "edge.remove",
    description: "Remove an edge; annotations and layout entries go too. Ref nodes targeting it block unless cascade.",
    args: z.strictObject({ id: z.string(), cascade: z.boolean().optional() }),
    run(ctx, { id, cascade }) {
      requireEntry(ctx, id, ["edge"]);
      removeElements(ctx.doc, [id], { cascade });
    }
  }
];
