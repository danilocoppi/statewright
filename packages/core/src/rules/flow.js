import { isGuest } from "../roles/kinds.js";
import { sorted } from "./facts.js";

/** Flow canvases in ID order. */
const flows = facts => sorted(facts.doc.canvases).filter(([, canvas]) => canvas.kind === "flow");

/** Flow canvas rules (spec §12.4, §16.13, §22). */
export default [
  {
    code: "flow.start",
    severity: "error",
    description: "A flow does not have exactly one start node.",
    check(facts, report) {
      for (const [canvasId, canvas] of flows(facts)) {
        const starts = sorted(canvas.nodes).filter(([, node]) => node.kind === "start");
        if (starts.length === 1) continue;
        report({
          target: canvasId,
          canvas: canvasId,
          message: `${facts.describe(canvasId)} has ${starts.length} start nodes; it needs exactly one`,
          data: { nodes: starts.map(([id]) => id) }
        });
      }
    }
  },
  {
    code: "flow.deadEnd",
    severity: "error",
    description: "A flow node other than end has no outgoing edge.",
    check(facts, report) {
      for (const [canvasId, canvas] of flows(facts)) {
        const out = facts.outgoing(canvasId);
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind === "end" || node.kind === "ref" || isGuest("flow", node) || out.get(id).length) continue;
          report({
            target: id,
            canvas: canvasId,
            message: `${facts.describe(id)} has no outgoing edge; connect it or end the flow`
          });
        }
      }
    }
  },
  {
    code: "flow.unreachable",
    severity: "warning",
    description: "A flow node cannot be reached from the start node.",
    check(facts, report) {
      for (const [canvasId, canvas] of flows(facts)) {
        const out = facts.outgoing(canvasId);
        const nodes = sorted(canvas.nodes);
        const pending = nodes.filter(([, node]) => node.kind === "start").map(([id]) => id);
        if (!pending.length) continue; // flow.start covers it
        const reached = new Set(pending);
        while (pending.length) {
          for (const [, edge] of out.get(pending.pop()) ?? []) {
            if (reached.has(edge.to)) continue;
            reached.add(edge.to);
            pending.push(edge.to);
          }
        }
        for (const [id, node] of nodes) {
          if (reached.has(id) || node.kind === "ref" || isGuest("flow", node)) continue;
          report({ target: id, canvas: canvasId, message: `${facts.describe(id)} cannot be reached from the start` });
        }
      }
    }
  },
  {
    code: "flow.branches",
    severity: "incomplete",
    description: "An if lacks its true or false edge; a while, forEach or subflow has no body.",
    check(facts, report) {
      for (const [canvasId, canvas] of flows(facts)) {
        const out = facts.outgoing(canvasId);
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind === "if") {
            const kinds = new Set(out.get(id).map(([, edge]) => edge.kind));
            const missing = ["true", "false"].filter(kind => !kinds.has(kind));
            if (!missing.length) continue;
            report({
              target: id,
              canvas: canvasId,
              message: `${facts.describe(id)} has no ${missing.join(" or ")} edge`,
              data: { missing }
            });
          } else if (["while", "forEach", "subflow"].includes(node.kind) && !node.inner) {
            report({ target: id, canvas: canvasId, message: `${facts.describe(id)} has no body (inner flow)` });
          }
        }
      }
    }
  },
  {
    code: "flow.switchDefault",
    severity: "warning",
    description: "A switch has no default edge.",
    check(facts, report) {
      for (const [canvasId, canvas] of flows(facts)) {
        const out = facts.outgoing(canvasId);
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind !== "switch" || out.get(id).some(([, edge]) => edge.kind === "default")) continue;
          report({ target: id, canvas: canvasId, message: `${facts.describe(id)} has no default edge` });
        }
      }
    }
  }
];
