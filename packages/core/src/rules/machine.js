import { canonicalize } from "../serialize/canonical.js";
import { isLink, sorted, triggersOf } from "./facts.js";

const NOT_TARGETS = new Set(["initial", "entry", "any"]);
const STARTS = new Set(["initial", "entry"]);

/** Machine canvases in ID order. */
const machines = facts => sorted(facts.doc.canvases).filter(([, canvas]) => canvas.kind === "machine");

/** Nodes of a canvas in one region, in ID order. */
const inRegion = (facts, canvas, key) =>
  sorted(canvas.nodes).filter(([, node]) => facts.regionKey(canvas, node) === key);

/** Where a region is, for messages: the machine itself when it has a single implicit region. */
const regionText = (facts, canvasId, region) =>
  region.key === "" ? facts.describe(canvasId) : `region "${region.name}" of ${facts.describe(canvasId)}`;

/** Each check's `any` nodes, by canvas and region, in ID order: found once, not once per state (performance §3 P1). */
const anyNodes = new WeakMap();

function anyByRegion(facts, canvasId) {
  if (!anyNodes.has(facts)) anyNodes.set(facts, new Map());
  const byCanvas = anyNodes.get(facts);
  if (!byCanvas.has(canvasId)) {
    const canvas = facts.doc.canvases[canvasId];
    const byRegion = new Map();
    for (const [id, node] of sorted(canvas.nodes)) {
      if (node.kind !== "any") continue;
      const key = facts.regionKey(canvas, node);
      if (!byRegion.has(key)) byRegion.set(key, []);
      byRegion.get(key).push([id, node]);
    }
    byCanvas.set(canvasId, byRegion);
  }
  return byCanvas.get(canvasId);
}

/** `any` nodes of the node's region whose transitions apply to it (spec §16.4). */
function anyFor(facts, canvasId, nodeId) {
  const canvas = facts.doc.canvases[canvasId];
  const key = facts.regionKey(canvas, canvas.nodes[nodeId]);
  return (anyByRegion(facts, canvasId).get(key) ?? []).filter(([, node]) => !node.except?.includes(nodeId));
}

/** Readable trigger token for messages. */
function triggerText(facts, token) {
  const [kind, value] = token.split(/:(.*)/s);
  if (kind === "on") return `on ${facts.doc.catalog.events[value]?.name ?? value}`;
  if (kind === "after") return `after ${facts.doc.catalog.timers[value]?.name ?? value}`;
  if (kind === "via") return `via ${facts.describe(value)}`;
  return token.replace(":", " ");
}

/** Does this state have a way out: its own transitions, `any` transitions, or an enclosing state's (§22)? */
function hasExit(facts, canvasId, nodeId, memo = new Map(), visiting = new Set()) {
  if (memo.has(nodeId)) return memo.get(nodeId);
  if (visiting.has(nodeId)) return false;
  visiting.add(nodeId);
  const leaves = facts.outgoing(canvasId).get(nodeId) ?? [];
  const result =
    leaves.some(([, edge]) => edge.to !== nodeId) ||
    anyFor(facts, canvasId, nodeId).some(([anyId]) => facts.outgoing(canvasId).get(anyId).length > 0) ||
    facts.parentStates(canvasId).some(parent => hasExit(facts, parent.canvas, parent.id, memo, visiting));
  memo.set(nodeId, result);
  return result;
}

/** Machine canvas rules (spec §12.3, §16, §22). */
export default [
  {
    code: "machine.region",
    severity: "error",
    description: "On a machine with regions every node declares one; without regions no node does.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        const hasRegions = Object.keys(canvas.regions ?? {}).length > 0;
        for (const [id, node] of sorted(canvas.nodes)) {
          if (hasRegions && node.region === undefined) {
            report({ target: id, canvas: canvasId, message: `${facts.describe(id)} must declare one of the regions` });
          } else if (!hasRegions && node.region !== undefined) {
            report({
              target: id,
              canvas: canvasId,
              message: `${facts.describe(id)} declares a region, but ${facts.describe(canvasId)} has none`
            });
          }
        }
      }
    }
  },
  {
    code: "machine.noStart",
    severity: "by level",
    description: "A region has neither an initial node nor an entry.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        const severity = facts.levelSeverity(canvas);
        if (!severity) continue;
        for (const region of facts.regionsOf(canvasId, canvas)) {
          if (inRegion(facts, canvas, region.key).some(([, node]) => STARTS.has(node.kind))) continue;
          report({
            target: region.id,
            canvas: canvasId,
            severity,
            message: `${regionText(facts, canvasId, region)} has neither an initial node nor an entry`
          });
        }
      }
    }
  },
  {
    code: "machine.multipleInitial",
    severity: "error",
    description: "A region has more than one initial node.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        for (const region of facts.regionsOf(canvasId, canvas)) {
          const initials = inRegion(facts, canvas, region.key).filter(([, node]) => node.kind === "initial");
          if (initials.length < 2) continue;
          report({
            target: region.id,
            canvas: canvasId,
            message: `${regionText(facts, canvasId, region)} has ${initials.length} initial nodes; keep one`,
            data: { nodes: initials.map(([id]) => id) }
          });
        }
      }
    }
  },
  {
    code: "machine.initialEdge",
    severity: "error",
    description: "An initial node does not have exactly one outgoing transition, or that transition has a trigger.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind !== "initial") continue;
          const leaves = facts.outgoing(canvasId).get(id);
          if (leaves.length !== 1) {
            report({
              target: id,
              canvas: canvasId,
              message: `${facts.describe(id)} has ${leaves.length} outgoing transitions; it needs exactly one`,
              data: { edges: leaves.map(([edgeId]) => edgeId) }
            });
          } else if (triggersOf(leaves[0][1]).length) {
            report({
              target: leaves[0][0],
              canvas: canvasId,
              message: `${facts.describe(leaves[0][0])} leaves an initial node, so it cannot have a trigger`
            });
          }
        }
      }
    }
  },
  {
    code: "machine.unreachable",
    severity: "by level",
    description: "A state cannot be reached from the initial nodes and entries.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        const severity = facts.levelSeverity(canvas);
        if (!severity) continue;
        const out = facts.outgoing(canvasId);
        const nodes = sorted(canvas.nodes);
        const starts = nodes.filter(([, node]) => STARTS.has(node.kind)).map(([id]) => id);
        const startRegions = new Set(starts.map(id => facts.regionKey(canvas, canvas.nodes[id])));
        const reached = new Set();
        const pending = [];
        const visit = id => {
          if (reached.has(id)) return;
          reached.add(id);
          pending.push(id);
        };
        starts.forEach(visit);
        while (pending.length) {
          for (const [, edge] of out.get(pending.pop()) ?? []) visit(edge.to);
          if (pending.length) continue;
          // `any` transitions start from every reached non-terminal state they apply to.
          for (const [id, node] of nodes) {
            if (node.kind !== "any" || reached.has(id)) continue;
            const key = facts.regionKey(canvas, node);
            const applies = nodes.some(
              ([stateId, state]) =>
                state.kind === "state" &&
                !state.terminal &&
                reached.has(stateId) &&
                facts.regionKey(canvas, state) === key &&
                !node.except?.includes(stateId)
            );
            if (applies) visit(id);
          }
        }
        for (const [id, node] of nodes) {
          if (node.kind !== "state" || reached.has(id)) continue;
          if (!startRegions.has(facts.regionKey(canvas, node))) continue; // machine.noStart covers it
          report({
            target: id,
            canvas: canvasId,
            severity,
            message: `${facts.describe(id)} cannot be reached from an initial node or entry`
          });
        }
      }
    }
  },
  {
    code: "machine.stuck",
    severity: "by level",
    description: "A non-terminal state has no way out (own, enclosing-state or any transitions).",
    check(facts, report) {
      const memo = new Map();
      for (const [canvasId, canvas] of machines(facts)) {
        const severity = facts.levelSeverity(canvas);
        if (!severity) continue;
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind !== "state" || node.terminal || hasExit(facts, canvasId, id, memo)) continue;
          report({
            target: id,
            canvas: canvasId,
            severity,
            message: `${facts.describe(id)} has no way out; add a transition or mark it terminal`
          });
        }
      }
    }
  },
  {
    code: "machine.sameName",
    severity: "warning",
    description:
      "Two states of one level and region share a name: code that holds the state by its name cannot tell them apart.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        const first = new Map();
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind !== "state") continue;
          const key = `${facts.regionKey(canvas, node)}\u0000${node.name}`;
          if (!first.has(key)) {
            first.set(key, id);
            continue;
          }
          report({
            target: id,
            canvas: canvasId,
            severity: "warning",
            message:
              `${facts.describe(id)} has the name of ${facts.describe(first.get(key))} in the same level: code that ` +
              "holds the state by its name cannot tell them apart; rename one",
            data: { same: first.get(key) }
          });
        }
      }
    }
  },
  {
    code: "machine.terminalWithExits",
    severity: "error",
    description: "A terminal state has outgoing transitions.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        for (const [id, node] of sorted(canvas.nodes)) {
          const leaves = facts.outgoing(canvasId).get(id);
          if (node.kind !== "state" || !node.terminal || leaves.length === 0) continue;
          report({
            target: id,
            canvas: canvasId,
            message: `${facts.describe(id)} is terminal but has ${leaves.length} outgoing transition(s)`,
            data: { edges: leaves.map(([edgeId]) => edgeId) }
          });
        }
      }
    }
  },
  {
    code: "machine.ambiguous",
    severity: "error",
    description:
      "Two transitions from one source share a trigger with no guard (or the same guard) to tell them apart.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        const out = facts.outgoing(canvasId);
        for (const [id, node] of sorted(canvas.nodes)) {
          const leaves = [...out.get(id)];
          // `any` transitions behave as if declared on the state itself (spec §16.4).
          if (node.kind === "state" && !node.terminal) {
            for (const [anyId] of anyFor(facts, canvasId, id)) leaves.push(...out.get(anyId));
          }
          const byTrigger = new Map();
          for (const [edgeId, edge] of leaves) {
            for (const token of new Set(triggersOf(edge))) {
              if (!byTrigger.has(token)) byTrigger.set(token, []);
              byTrigger.get(token).push([edgeId, edge]);
            }
          }
          for (const [token, edges] of byTrigger) {
            // Same guard (or none) and same validity period: nothing tells them apart.
            const groups = new Map();
            for (const [edgeId, edge] of edges) {
              const key = canonicalize([edge.guard ?? null, edge.effective ?? null]);
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key).push(edgeId);
            }
            for (const group of groups.values()) {
              if (group.length < 2) continue;
              report({
                target: id,
                canvas: canvasId,
                message: `${facts.describe(id)} has ${group.length} transitions ${triggerText(facts, token)} that no guard tells apart (${group.join(", ")})`,
                data: { trigger: token, edges: group }
              });
            }
          }
        }
      }
    }
  },
  {
    code: "machine.crossRegion",
    severity: "error",
    description: "A transition connects nodes in different regions.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        if (!Object.keys(canvas.regions ?? {}).length) continue;
        for (const [id, edge] of sorted(canvas.edges)) {
          const from = canvas.nodes[edge.from];
          const to = canvas.nodes[edge.to];
          if (isLink(edge) || !from?.region || !to?.region || from.region === to.region) continue;
          report({
            target: id,
            canvas: canvasId,
            message: `${facts.describe(id)} crosses from region ${from.region} to ${to.region}`
          });
        }
      }
    }
  },
  {
    code: "choice.else",
    severity: "error",
    description: "A choice does not have exactly one else branch, or one of its branches has a trigger.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind !== "choice") continue;
          const leaves = facts.outgoing(canvasId).get(id);
          const elses = leaves.filter(([, edge]) => edge.else === true).length;
          if (elses !== 1) {
            report({
              target: id,
              canvas: canvasId,
              message: `${facts.describe(id)} has ${elses} else branches; it needs exactly one`,
              data: { else: elses }
            });
          }
          for (const [edgeId, edge] of leaves) {
            if (!triggersOf(edge).length) continue;
            report({
              target: edgeId,
              canvas: canvasId,
              message: `${facts.describe(edgeId)} leaves a choice, so it cannot have a trigger`
            });
          }
        }
      }
    }
  },
  {
    code: "transition.noTrigger",
    severity: "incomplete",
    description: "A transition out of a state has no trigger (on, onMatch, after, always, done or via).",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        for (const [id, edge] of sorted(canvas.edges)) {
          if (isLink(edge) || canvas.nodes[edge.from]?.kind !== "state" || triggersOf(edge).length) continue;
          report({ target: id, canvas: canvasId, message: `${facts.describe(id)} does not say what triggers it` });
        }
      }
    }
  },
  {
    code: "history.outsideCompound",
    severity: "warning",
    description: "A history node is in a machine that is not the interior of a state.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        if (facts.parentStates(canvasId).length) continue;
        for (const [id, node] of sorted(canvas.nodes)) {
          if (node.kind !== "history") continue;
          report({
            target: id,
            canvas: canvasId,
            message: `${facts.describe(id)} is in a machine that no state contains, so there is nothing to resume`
          });
        }
      }
    }
  },
  {
    code: "edge.link",
    severity: "error",
    description: "On machine and flow canvases, an edge touching a ref node is not a link, or a link touches none.",
    check(facts, report) {
      for (const [canvasId, canvas] of sorted(facts.doc.canvases)) {
        if (canvas.kind === "system") continue;
        for (const [id, edge] of sorted(canvas.edges)) {
          const from = canvas.nodes[edge.from];
          const to = canvas.nodes[edge.to];
          if (!from || !to) continue;
          const touchesRef = from.kind === "ref" || to.kind === "ref";
          if (touchesRef === isLink(edge)) continue;
          report({
            target: id,
            canvas: canvasId,
            message:
              touchesRef ?
                `${facts.describe(id)} touches a ref node, so it must be a link (kind "link")`
              : `${facts.describe(id)} is a link but touches no ref node`
          });
        }
      }
    }
  },
  {
    code: "edge.target",
    severity: "error",
    description: "An initial, entry or any node is the target of an edge.",
    check(facts, report) {
      for (const [canvasId, canvas] of machines(facts)) {
        for (const [id, edge] of sorted(canvas.edges)) {
          const to = canvas.nodes[edge.to];
          if (!to || !NOT_TARGETS.has(to.kind)) continue;
          report({
            target: id,
            canvas: canvasId,
            message: `${facts.describe(id)} ends at ${facts.describe(edge.to)}, which cannot be a target`
          });
        }
      }
    }
  }
];
