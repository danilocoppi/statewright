import { z } from "zod";
import { FlowEdge, MachineEdge, SystemEdge } from "../schema/canvas.js";
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
import { isGuest } from "../roles/kinds.js";

const SCHEMAS = { system: SystemEdge, machine: MachineEdge, flow: FlowEdge };
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
