import { mixedEndsProblem } from "../commands/edge.js";
import { sorted } from "./facts.js";

/** The rules of mixed levels (mixed levels spec §4.5, §8). */
export default [
  {
    code: "edge.mixed",
    severity: "error",
    description: "A connection on a mixed level whose ends do not make it what it says it is.",
    check(facts, report) {
      for (const [canvasId, canvas] of sorted(facts.doc.canvases)) {
        if (canvas.kind !== "mixed") continue;
        for (const [id, edge] of sorted(canvas.edges)) {
          const problem = mixedEndsProblem(canvas, edge, canvas.nodes[edge.from], canvas.nodes[edge.to]);
          if (problem) report({ target: id, canvas: canvasId, message: `${facts.describe(id)}: ${problem}` });
        }
      }
    }
  }
];
