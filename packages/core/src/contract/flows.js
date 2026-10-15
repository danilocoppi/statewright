// A design's flows as structure for code to implement (source-of-truth spec §5, Flows): each step with what it does —
// the endpoint it calls, the event it emits or waits for, the values it sets, its condition — and the edges between
// steps with their kind. What is for people only (summaries, provenance, evidence, tags) stays out.
import { isGuest } from "../roles/kinds.js";
import { ownerOf } from "../query/index.js";
import { sorted } from "../rules/facts.js";
import { actionName, conditionOf, defined, eventName, partyName, timerOf, viaName } from "./names.js";

/** A step's body: the flow level a `while`, `forEach` or `subflow` runs, or the reusable part it is an instance of. */
const bodyOf = inner =>
  inner?.canvas ? { flow: inner.canvas }
  : inner?.definition ? { definition: inner.definition }
  : undefined;

/** A step as the contract writes it. */
function stepOf(doc, id, node) {
  return defined({
    id,
    kind: node.kind,
    name: node.name,
    outcome: node.outcome,
    action: node.action ? actionName(doc, node.action) : undefined,
    args: node.args,
    condition: conditionOf(doc, node.condition),
    // A switch's `on` is the value it branches on; a wait's, the events it waits for.
    on: node.kind === "wait" ? node.on?.map(event => eventName(doc, event)) : node.on,
    after: node.after ? timerOf(doc, node.after) : undefined,
    items: node.items,
    as: node.as,
    body: bodyOf(node.inner),
    event: node.event ? eventName(doc, node.event) : undefined,
    payload: node.payload,
    endpoint: node.endpoint ? viaName(doc, node.endpoint) : undefined,
    request: node.request,
    party: node.party ? partyName(doc, node.party) : undefined,
    webhook: node.webhook ? viaName(doc, node.webhook) : undefined,
    set: node.set
  });
}

/**
 * The flow levels of a design, in ID order: their steps and the edges between them; `ref` nodes and links do not run.
 * @param {any} doc A schema-valid document.
 * @returns {object[]}
 */
export function flowsOf(doc) {
  return sorted(doc.canvases)
    .filter(([, canvas]) => canvas.kind === "flow")
    .map(([id, canvas]) => {
      const owner = ownerOf(doc, id);
      // Shortcuts and guests (mixed levels spec §3) are not steps.
      const steps = sorted(canvas.nodes).filter(([, node]) => node.kind !== "ref" && !isGuest("flow", node));
      const running = new Set(steps.map(([stepId]) => stepId));
      return defined({
        id,
        name: canvas.name,
        owner: owner && owner.type !== "root" ? owner.id : null,
        steps: steps.map(([stepId, node]) => stepOf(doc, stepId, node)),
        edges: sorted(canvas.edges)
          .filter(([, edge]) => edge.kind !== "link" && running.has(edge.from) && running.has(edge.to))
          .map(([edgeId, edge]) =>
            defined({ id: edgeId, from: edge.from, to: edge.to, kind: edge.kind, case: edge.case, name: edge.name })
          )
      });
    });
}
