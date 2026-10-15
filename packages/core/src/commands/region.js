import { z } from "zod";
import { RegionDef } from "../schema/canvas.js";
import { allocateId, applyChange, changeArgs, changed, clone, requireEntry, validate } from "./context.js";
import { fail } from "./errors.js";
import { removeElements } from "./remove.js";

/** Region commands (spec §21). */
export default [
  {
    type: "region.add",
    description:
      "Add an orthogonal region to a machine canvas. The first region of a canvas adopts all its existing nodes.",
    args: z.strictObject({
      canvas: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      id: z.string().optional()
    }),
    run(ctx, { canvas, name, description, id }) {
      const entry = requireEntry(ctx, canvas, ["canvas"]);
      if (entry.value.kind !== "machine") fail("WRONG_KIND", "Only machine canvases have regions", { id: canvas });
      const region = clone(description === undefined ? { name } : { name, description });
      const regionId = allocateId(ctx, "rgn", name, id);
      validate(RegionDef, region, ["canvases", canvas, "regions", regionId]);
      const target = entry.value;
      const first = target.regions === undefined;
      if (first) target.regions = {};
      target.regions[regionId] = region;
      if (first) for (const node of Object.values(target.nodes)) node.region = regionId;
    }
  },
  {
    type: "region.update",
    description: "Rename a region or change its description.",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["region"]);
      validate(RegionDef, changed(entry.value, change), entry.path);
      applyChange(entry.value, change);
    }
  },
  {
    type: "region.remove",
    description:
      "Remove a region. Its nodes move to moveNodesTo, or are removed with cascade: true. Removing the last region " +
      "turns the canvas back into a single implicit region and keeps every node.",
    args: z.strictObject({
      id: z.string(),
      moveNodesTo: z.string().optional(),
      cascade: z.boolean().optional()
    }),
    run(ctx, { id, moveNodesTo, cascade }) {
      const entry = requireEntry(ctx, id, ["region"]);
      const canvas = ctx.doc.canvases[entry.canvas];
      const members = Object.keys(canvas.nodes).filter(nodeId => canvas.nodes[nodeId].region === id);
      const last = Object.keys(canvas.regions).length === 1;
      let alsoRemove = [];
      if (last) {
        for (const node of Object.values(canvas.nodes)) delete node.region;
      } else if (moveNodesTo !== undefined) {
        const target = requireEntry(ctx, moveNodesTo, ["region"]);
        if (target.canvas !== entry.canvas || moveNodesTo === id) {
          fail("NOT_ALLOWED", "moveNodesTo must be another region of the same canvas", { id: moveNodesTo });
        }
        for (const nodeId of members) canvas.nodes[nodeId].region = moveNodesTo;
      } else if (members.length && !cascade) {
        fail("IN_USE", `Region "${id}" still has ${members.length} node(s); pass moveNodesTo or cascade: true`, {
          nodes: members
        });
      } else {
        alsoRemove = members;
      }
      removeElements(ctx.doc, [id, ...alsoRemove], { cascade });
      if (last) delete canvas.regions;
    }
  }
];
