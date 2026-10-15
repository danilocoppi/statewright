import { z } from "zod";
import { FlowNode, MachineNode, MixedNode, SystemNode } from "../schema/canvas.js";
import {
  allocateId,
  applyChange,
  changeArgs,
  changed,
  checkRefs,
  clone,
  refsOf,
  requireEntry,
  setNodeLayout,
  validate
} from "./context.js";
import { checkEdgeEnds } from "./edge.js";
import { fail } from "./errors.js";
import { checkInner, keepOwnInterior } from "./inner.js";
import { removeElements } from "./remove.js";

const SCHEMAS = { system: SystemNode, machine: MachineNode, flow: FlowNode, mixed: MixedNode };

/**
 * Validate a node as it will be stored in `canvasId`: shape for the canvas kind, region membership, references
 * and interior.
 */
export function checkNode(ctx, canvasId, nodeId, node) {
  const canvas = ctx.doc.canvases[canvasId];
  const path = ["canvases", canvasId, "nodes", nodeId];
  validate(SCHEMAS[canvas.kind], node, path);
  if (canvas.kind === "machine") {
    if (canvas.regions && node.region === undefined) {
      fail("SCHEMA", `Nodes of "${canvasId}" must declare a region (${Object.keys(canvas.regions).join(", ")})`, {
        path
      });
    }
    if (!canvas.regions && node.region !== undefined) {
      fail("SCHEMA", `"${canvasId}" has no regions; remove "region" from the node`, { path });
    }
  }
  checkRefs(ctx, refsOf("node", canvas.kind, canvasId, nodeId, node), { canvas: canvasId, self: nodeId });
  if (node.inner) checkInner(ctx, { id: nodeId, type: "node", canvas: canvasId, value: node }, node.inner, node);
}

/** Node commands (spec §21). */
export default [
  {
    type: "node.add",
    description:
      "Add a node (box) to a canvas. Allowed kinds depend on the canvas kind; `at` also stores its position.",
    args: z.strictObject({
      canvas: z.string(),
      node: z.record(z.string(), z.unknown()).describe("The node, including its kind (see the format reference)."),
      id: z.string().optional(),
      at: z.strictObject({ x: z.number(), y: z.number() }).optional()
    }),
    run(ctx, { canvas, node, id, at }) {
      const canvasEntry = requireEntry(ctx, canvas, ["canvas"]);
      const value = clone(node);
      const nodeId = allocateId(ctx, "nod", value.name ?? value.kind ?? "node", id);
      checkNode(ctx, canvas, nodeId, value);
      canvasEntry.value.nodes[nodeId] = value;
      if (at) setNodeLayout(ctx.doc, canvas, nodeId, at);
    }
  },
  {
    type: "node.update",
    description: "Change fields of a node, including its kind. An own interior can only be removed with canvas.remove.",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["node"]);
      const next = changed(entry.value, change);
      keepOwnInterior(entry.value, next);
      checkNode(ctx, entry.canvas, id, next);
      // A new kind must still suit the node's edges.
      const canvas = ctx.doc.canvases[entry.canvas];
      for (const [edgeId, edge] of Object.entries(canvas.edges)) {
        if (edge.from !== id && edge.to !== id) continue;
        checkEdgeEnds(canvas, edgeId, edge, nodeId => (nodeId === id ? next : canvas.nodes[nodeId]));
      }
      applyChange(entry.value, change);
    }
  },
  {
    type: "node.remove",
    description:
      "Remove a node with its edges and own interior; annotations and layout entries go too. Other references " +
      "(ref targets, any.except) block it unless cascade is true.",
    args: z.strictObject({ id: z.string(), cascade: z.boolean().optional() }),
    run(ctx, { id, cascade }) {
      requireEntry(ctx, id, ["node"]);
      removeElements(ctx.doc, [id], { cascade });
    }
  }
];
