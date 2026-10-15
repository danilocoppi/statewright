import { z } from "zod";
import { mapOf, obj } from "./helpers.js";

const Point = z.tuple([z.int(), z.int()]);

export const NodeLayout = obj({
  x: z.int(),
  y: z.int(),
  w: z.int().positive().optional(),
  h: z.int().positive().optional(),
  display: z.enum(["node", "card", "frame"]).optional()
});

export const EdgeLayout = obj({ points: z.array(Point).optional(), labelAt: Point.optional() });

export const NoteLayout = obj({ x: z.int(), y: z.int() });

const CanvasLayout = obj({
  nodes: mapOf("nod", NodeLayout).optional(),
  edges: mapOf("edg", EdgeLayout).optional(),
  notes: mapOf("nte", NoteLayout).optional()
});

/** Legend wording overrides per style key (spec §14). */
export const LegendLabels = z.record(
  z.string().regex(/^[a-z]+\.[A-Za-z.]+$/, "Expected a style key such as state.waiting"),
  z.string().min(1)
);

export const Layout = obj(
  {
    legend: obj({ labels: LegendLabels.optional() }).optional(),
    canvases: mapOf("cnv", CanvasLayout).optional()
  },
  { description: "Positions and presentation (spec §14)." }
);
