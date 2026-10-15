import { z } from "zod";
import { ownersOf } from "../query/index.js";
import { Canvas } from "../schema/canvas.js";
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
import { checkInner } from "./inner.js";
import { removeElements } from "./remove.js";

const STRUCTURE = ["kind", "nodes", "edges", "regions"];

/** Canvas commands (spec §21). */
export default [
  {
    type: "canvas.mix",
    description:
      "Make a level mixed (mixed levels spec §4.5): it then takes elements of every kind; its transitions say they are " +
      "transitions (kind transition). Its elements and their meaning are kept.",
    args: z.strictObject({ id: z.string() }),
    run(ctx, { id }) {
      const entry = requireEntry(ctx, id, ["canvas"]);
      const canvas = entry.value;
      if (canvas.kind === "mixed") fail("NOT_ALLOWED", `"${id}" is mixed already`, { id });
      if (canvas.kind === "machine") {
        for (const edge of Object.values(canvas.edges)) if (edge.kind !== "link") edge.kind = "transition";
      }
      canvas.kind = "mixed";
      validate(Canvas, clone(canvas), ["canvases", id]);
      // A reusable part whose body this is is mixed too.
      for (const definition of Object.values(ctx.doc.definitions))
        if (definition.canvas === id) definition.kind = "mixed";
    }
  },
  {
    type: "canvas.create",
    description:
      "Create an empty canvas. With owner, it becomes that element's interior (the owner must not have one yet). " +
      "Other canvas fields (code, kicker, title, caption, stage, subject, context, transitions, vars, …) may be given.",
    args: z
      .object({
        kind: z.enum(["system", "machine", "flow", "mixed"]),
        name: z.string().min(1),
        owner: z.string().optional().describe("Node or catalog item that gets this canvas as interior."),
        id: z.string().optional()
      })
      .catchall(z.unknown()),
    run(ctx, args) {
      const { owner, id, ...fields } = args;
      const blocked = ["nodes", "edges", "regions"].filter(key => key in fields);
      if (blocked.length) fail("NOT_ALLOWED", `Use node, edge and region commands instead of ${blocked.join(", ")}`);
      const canvas = { ...clone(fields), nodes: {}, edges: {} };
      const canvasId = allocateId(ctx, "cnv", canvas.name, id);
      validate(Canvas, canvas, ["canvases", canvasId]);
      checkRefs(ctx, refsOf("canvas", canvasId, canvas));
      ctx.doc.canvases[canvasId] = canvas;
      if (owner) {
        const entry = requireEntry(ctx, owner, ["node", "catalog"]);
        if (entry.value.inner) fail("NOT_ALLOWED", `"${owner}" already has an interior`, { id: owner });
        checkInner(ctx, entry, { canvas: canvasId });
        entry.value.inner = { canvas: canvasId };
      }
    }
  },
  {
    type: "canvas.update",
    description: "Change canvas fields such as name, title, caption, stage or transitions (not kind or contents).",
    args: z.strictObject({ id: z.string(), ...changeArgs }),
    run(ctx, { id, ...change }) {
      const entry = requireEntry(ctx, id, ["canvas"]);
      const next = changed(entry.value, change, STRUCTURE);
      validate(Canvas, next, ["canvases", id]);
      checkRefs(ctx, refsOf("canvas", id, next));
      applyChange(entry.value, change);
    }
  },
  {
    type: "canvas.remove",
    description:
      "Remove a canvas with everything in it and its nested interiors. The root canvas and definition bodies " +
      "cannot be removed this way.",
    args: z.strictObject({ id: z.string(), cascade: z.boolean().optional() }),
    run(ctx, { id, cascade }) {
      requireEntry(ctx, id, ["canvas"]);
      if (id === ctx.doc.root) fail("NOT_ALLOWED", "The root canvas cannot be removed", { id });
      const definition = ownersOf(ctx.doc, id).find(owner => owner.type === "definition");
      if (definition) {
        fail("NOT_ALLOWED", `"${id}" is the body of ${definition.id}; remove the definition instead`, { id });
      }
      removeElements(ctx.doc, [id], { cascade });
    }
  }
];
