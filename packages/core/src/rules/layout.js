import { createGeometry } from "../layout/geometry.js";
import { measureOverlaps } from "../layout/overlaps.js";
import { sorted } from "./facts.js";

/** Layout rules (spec §22). */
export default [
  {
    code: "layout.overlap",
    severity: "warning",
    description: "Nodes or edge labels overlap in the stored layout (run statewright layout --all to recompute it).",
    check(facts, report) {
      const geometry = createGeometry(facts.doc);
      for (const [canvasId] of sorted(facts.doc.layout?.canvases)) {
        for (const { a, b, kind } of measureOverlaps(facts.doc, canvasId, { geometry })) {
          report({
            target: a,
            canvas: canvasId,
            message: `${facts.describe(a)} overlaps ${facts.describe(b)} in the stored layout`,
            data: { with: b, kind }
          });
        }
      }
    }
  }
];
