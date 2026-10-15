// An action's flow run inside the machine's step that calls it (mixed levels spec §4.2): its assigns write the machine
// instance's context, the events it emits are raised by the machine, its questions are asked in order with the
// machine's. A flow that waits cannot run within one step: it runs apart, and the action is only logged, as before.
import { startFlow } from "./flow.js";
import { contextOf, createRun, warn } from "./run.js";

const FLOW_BODIES = new Set(["while", "forEach", "subflow"]);

/** The canvas an `inner` shows (own canvas or definition body), or null. */
function canvasOf(doc, inner) {
  const id = inner?.canvas ?? doc.definitions[inner?.definition]?.canvas;
  return id && doc.canvases[id] ? id : null;
}

/** Whether a flow, or a body inside it, has a `wait` step. */
function waits(doc, canvasId, seen = new Set()) {
  if (seen.has(canvasId)) return false;
  seen.add(canvasId);
  return Object.values(doc.canvases[canvasId].nodes).some(node => {
    if (node.kind === "wait") return true;
    const body = FLOW_BODIES.has(node.kind) && canvasOf(doc, node.inner);
    return Boolean(body) && waits(doc, body, seen);
  });
}

/** The catalog item an ID names among those a flow implements, or undefined. */
const itemOf = (doc, id) => doc.catalog.actions[id] ?? doc.catalog.endpoints[id] ?? doc.catalog.webhooks[id];

/**
 * The flow an action, endpoint or webhook runs within a machine's step, or null: it has a flow, and the flow never
 * waits.
 */
export function embeddedFlowOf(doc, itemId) {
  const flowId = canvasOf(doc, itemOf(doc, itemId)?.inner);
  if (!flowId || doc.canvases[flowId].kind !== "flow" || waits(doc, flowId)) return null;
  return flowId;
}

/**
 * Run an item's flow where the machine calls it, recording its entries under the trace `entry` (`steps`).
 * @param {object} run The machine's run.
 * @param {string} itemId
 * @param {object} entry The machine trace's entry for the call (an `action` entry).
 * @param {string} key The machine instance whose context the flow writes.
 * @param {{ name: string, payload?: unknown } | null} event The event being handled, as expressions see it.
 */
export function runEmbedded(run, itemId, entry, key, event) {
  const flowId = embeddedFlowOf(run.doc, itemId);
  if (!flowId) return;
  const session = {
    canvas: flowId,
    clock: run.state.clock,
    active: [],
    tokens: [],
    vars: entry.args !== undefined ? { input: entry.args } : {},
    context: {},
    timers: []
  };
  const flow = createRun(run.doc, session, run.answers, { guards: run.guards });
  flow.cursor = run.cursor;
  flow.event = event ? { name: event.name, payload: event.payload ?? null } : null;
  flow.state.context[flowId] = contextOf(run, key);
  try {
    startFlow(flow);
  } finally {
    run.cursor = flow.cursor;
    entry.steps = flow.trace;
  }
  for (const step of flow.trace) {
    if (step.type === "emitted") run.queue.push({ event: step.event, payload: step.payload });
  }
  if (flow.state.outcome === "failure") {
    const name = itemOf(run.doc, itemId)?.name ?? itemId;
    warn(run, "actionFailed", `${name} failed: its flow ended in failure`, { action: itemId });
  }
}
