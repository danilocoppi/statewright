// Review comments (collaboration spec §8.1): an open comment is something still to settle.
import { sorted } from "./facts.js";

/** Comment rules (spec §22). */
export default [
  {
    code: "comment.open",
    severity: "incomplete",
    description: "A review comment is open: answer it, change what it asks, or resolve it.",
    check(facts, report) {
      for (const [id, comment] of sorted(facts.doc.annotations?.comments ?? {})) {
        if (comment.status !== "open") continue;
        const target = comment.target ?? comment.canvas;
        report({
          target,
          canvas: comment.canvas,
          message: `${facts.describe(target)} has an open comment: "${comment.thread[0]?.text ?? ""}"`,
          data: { comment: id }
        });
      }
    }
  }
];
