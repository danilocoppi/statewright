import { homeKind, stateLevelOf } from "../roles/kinds.js";
import { sorted } from "./facts.js";

/** Catalog collections whose items may have a flow, with the word messages use for them. */
const IMPLEMENTED = { actions: "action", endpoints: "endpoint", webhooks: "webhook" };

/** The catalog item an ID names, with its collection, or null. */
function itemOf(facts, id) {
  const entry = facts.index.get(id);
  return entry?.type === "catalog" && IMPLEMENTED[entry.collection] ? entry : null;
}

/** Nodes of one kind on canvases of one kind, in ID order: [canvasId, nodeId, node]. */
function nodesOf(facts, canvasKind, kind) {
  // A mixed level's nodes count where their own kind lives (mixed levels spec §4.5).
  return sorted(facts.doc.canvases)
    .filter(([, canvas]) => canvas.kind === canvasKind || canvas.kind === "mixed")
    .flatMap(([canvasId, canvas]) =>
      sorted(canvas.nodes)
        .filter(([, node]) => node.kind === kind && homeKind(canvas.kind, node) === canvasKind)
        .map(([id, node]) => [canvasId, id, node])
    );
}

/** The guests' rules (mixed levels spec §8): problems, never enforced. */
export default [
  {
    code: "roles.stepsWithoutFlow",
    severity: "incomplete",
    description: "Embedded steps of an action, endpoint or webhook that has no flow yet.",
    check(facts, report) {
      for (const [canvasId, id, node] of nodesOf(facts, "machine", "steps")) {
        const item = itemOf(facts, node.action);
        if (!item || facts.interiorOf(item.value.inner)) continue; // ref.dangling covers a missing item
        report({
          target: id,
          canvas: canvasId,
          message: `The steps of ${facts.describe(node.action)} have no flow yet; add a flow inside it`
        });
      }
    }
  },
  {
    code: "roles.stateGuest",
    severity: "error",
    description: "A state guest on a flow stands for something that is not a state of a state machine.",
    check(facts, report) {
      for (const [canvasId, id, node] of nodesOf(facts, "flow", "state")) {
        const entry = facts.index.get(node.target);
        if (!entry) continue; // ref.dangling covers it
        // A machine's state, on a machine level or on a mixed one.
        if (stateLevelOf(facts.doc, node.target)) continue;
        report({
          target: id,
          canvas: canvasId,
          message: `This state guest stands for ${facts.describe(node.target)}, which is not a state of a state machine`
        });
      }
    }
  },
  {
    code: "roles.waitInAction",
    severity: "warning",
    description: "Embedded steps whose flow waits: a machine runs them in one step, so they run apart from it.",
    check(facts, report) {
      for (const [canvasId, id, node] of nodesOf(facts, "machine", "steps")) {
        const flowId = facts.interiorOf(itemOf(facts, node.action)?.value.inner);
        const flow = facts.doc.canvases[flowId];
        if (flow?.kind !== "flow") continue;
        const waits = sorted(flow.nodes)
          .filter(([, step]) => step.kind === "wait")
          .map(([waitId]) => waitId);
        if (!waits.length) continue;
        report({
          target: id,
          canvas: canvasId,
          message: `The flow of ${facts.describe(node.action)} waits, so it cannot run within the machine's step; it runs apart`,
          data: { waits }
        });
      }
    }
  },
  {
    code: "roles.participantTwice",
    severity: "warning",
    description: "Two participants of one party on one level.",
    check(facts, report) {
      for (const canvasKind of ["machine", "flow"]) {
        const byLevel = new Map();
        for (const [canvasId, id, node] of nodesOf(facts, canvasKind, "participant")) {
          const key = `${canvasId}\u0000${node.party}`;
          if (!byLevel.has(key)) byLevel.set(key, { canvasId, nodes: [] });
          byLevel.get(key).nodes.push(id);
        }
        for (const { canvasId, nodes } of byLevel.values()) {
          for (const id of nodes.slice(1)) {
            report({
              target: id,
              canvas: canvasId,
              message: `${facts.describe(nodes[0])} is already on this level; one participant per party`,
              data: { nodes }
            });
          }
        }
      }
    }
  }
];
