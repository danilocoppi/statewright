import { z } from "zod";
import { EdgeLayout, LegendLabels, NodeLayout, NoteLayout } from "../schema/layout.js";
import { clone, ensure, requireEntry, setNodeLayout, tidy, validate } from "./context.js";
import { fail } from "./errors.js";

const Point = z.tuple([z.number(), z.number()]);
const round = ([x, y]) => [Math.round(x), Math.round(y)];

/** The entry must belong to `canvas`. */
function onCanvas(entry, canvas) {
  if (entry.canvas !== canvas) {
    fail("NOT_ALLOWED", `"${entry.id}" is on canvas "${entry.canvas}", not "${canvas}"`, { id: entry.id });
  }
}

/** Layout commands (spec §14, §21). Coordinates are rounded to integers. */
export default [
  {
    type: "layout.node.set",
    description: "Place a node: position, optional size, and (for nodes with an interior) display node, card or frame.",
    args: z.strictObject({
      canvas: z.string(),
      id: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number().optional(),
      h: z.number().optional(),
      display: z.enum(["node", "card", "frame"]).optional()
    }),
    run(ctx, { canvas, id, ...placement }) {
      const entry = requireEntry(ctx, id, ["node"]);
      onCanvas(entry, canvas);
      if (placement.display !== undefined && !entry.value.inner) {
        fail("NOT_ALLOWED", `"${id}" has no interior to show as ${placement.display}`, { id });
      }
      const stored = setNodeLayout(ctx.doc, canvas, id, placement);
      validate(NodeLayout, clone(stored), ["layout", "canvases", canvas, "nodes", id]);
    }
  },
  {
    type: "layout.edge.set",
    description: "Store an edge's route points and label position; with neither, the stored route is cleared.",
    args: z.strictObject({
      canvas: z.string(),
      id: z.string(),
      points: z.array(Point).optional(),
      labelAt: Point.optional()
    }),
    run(ctx, { canvas, id, points, labelAt }) {
      onCanvas(requireEntry(ctx, id, ["edge"]), canvas);
      const entry = {};
      if (points) entry.points = points.map(round);
      if (labelAt) entry.labelAt = round(labelAt);
      const edges = ensure(ensure(ensure(ensure(ctx.doc, "layout"), "canvases"), canvas), "edges");
      if (Object.keys(entry).length === 0) delete edges[id];
      else {
        validate(EdgeLayout, entry, ["layout", "canvases", canvas, "edges", id]);
        edges[id] = entry;
      }
      tidy(ctx.doc);
    }
  },
  {
    type: "layout.note.set",
    description: "Place a note on its canvas.",
    args: z.strictObject({ canvas: z.string(), id: z.string(), x: z.number(), y: z.number() }),
    run(ctx, { canvas, id, x, y }) {
      const note = requireEntry(ctx, id, ["note"]);
      if (note.value.canvas !== canvas) fail("NOT_ALLOWED", `Note "${id}" belongs to "${note.value.canvas}"`, { id });
      const entry = { x: Math.round(x), y: Math.round(y) };
      validate(NoteLayout, entry, ["layout", "canvases", canvas, "notes", id]);
      ensure(ensure(ensure(ensure(ctx.doc, "layout"), "canvases"), canvas), "notes")[id] = entry;
    }
  },
  {
    type: "layout.canvas.clear",
    description: "Forget every stored position of a canvas (auto-layout recomputes them).",
    args: z.strictObject({ canvas: z.string() }),
    run(ctx, { canvas }) {
      requireEntry(ctx, canvas, ["canvas"]);
      if (ctx.doc.layout?.canvases) delete ctx.doc.layout.canvases[canvas];
      tidy(ctx.doc);
    }
  },
  {
    type: "legend.labels.set",
    description: "Replace the project's legend wording overrides, keyed by style key (e.g. state.waiting).",
    args: z.strictObject({ labels: z.record(z.string(), z.string()) }),
    run(ctx, { labels }) {
      validate(LegendLabels, labels, ["layout", "legend", "labels"]);
      ensure(ensure(ctx.doc, "layout"), "legend").labels = clone(labels);
      tidy(ctx.doc);
    }
  }
];
