// The roles that let elements of one kind appear on a level of another (mixed levels spec §3). Their connectors are
// never stored: each is read from the field that holds its meaning (a transition's `by`, an event's `source`, an
// action's `party`, a step's event), so every view of it agrees, and drawing or deleting one edits that field.
import { figureCanvases } from "../style/frames.js";
import { homeKind, stateLevelOf } from "./kinds.js";
import { viewOf } from "./typed.js";

/**
 * @typedef {object} Association A derived connector on a figure.
 * @property {string} id `${role}:${from}:${to}`, stable.
 * @property {"sends"|"receives"|"runs"|"drives"|"leadsTo"|"performs"} role
 * @property {string} from A node or edge ID on the figure.
 * @property {string} to A node or edge ID on the figure.
 * @property {string} field The field that holds the meaning ("by", "source", "party", "actions", "onEntry",
 *   "onExit", "via", "event", "endpoint", "action", "webhook").
 * @property {string[]} owners The elements whose `field` holds it (deleting the connector clears it on each).
 * @property {string} [label] What it stands for when the ends do not say it: the event or the actions.
 */

/** The roles, in the order the legend explains them. */
export const ROLES = Object.freeze(["sends", "receives", "runs", "drives", "leadsTo", "performs"]);

const compare = (a, b) =>
  a < b ? -1
  : a > b ? 1
  : 0;
const sortedEntries = map => Object.entries(map ?? {}).sort(([a], [b]) => compare(a, b));

/** Collects associations by ID, joining the owners (and labels) of the same connector. */
function collector() {
  const found = new Map();
  return {
    add(role, from, to, field, owner, label) {
      const id = `${role}:${from}:${to}`;
      const existing = found.get(id);
      if (!existing) {
        found.set(id, { id, role, from, to, field, owners: [owner], ...(label ? { label } : {}) });
        return;
      }
      if (existing.owners.includes(owner)) return;
      existing.owners.push(owner);
      if (label) existing.label = existing.label ? `${existing.label}, ${label}` : label;
    },
    list: () => [...found.values()].sort((a, b) => compare(a.id, b.id))
  };
}

/** Participant node IDs of a canvas by party. */
function participantsOf(canvas) {
  const byParty = new Map();
  for (const [id, node] of sortedEntries(canvas.nodes)) {
    if (node.kind !== "participant") continue;
    if (!byParty.has(node.party)) byParty.set(node.party, []);
    byParty.get(node.party).push(id);
  }
  return byParty;
}

/**
 * Who starts a transition or an entry: its `by`, else the source of its first event that has a party.
 * @returns {{ party: string, field: "by"|"source", owner: string, label?: string } | null}
 */
function senderOf(doc, id, element) {
  if (element.by) return { party: element.by, field: "by", owner: id };
  for (const eventId of element.on ?? []) {
    const event = doc.catalog.events[eventId];
    if (event?.source && event.source !== "internal") {
      return { party: event.source, field: "source", owner: eventId, label: event.name };
    }
  }
  return null;
}

/** The transitions (not links) and entries of a machine canvas, each with its ID. */
function startersOf(canvas) {
  const edges = sortedEntries(canvas.edges).filter(([, edge]) => edge.kind !== "link");
  const entries = sortedEntries(canvas.nodes).filter(([, node]) => node.kind === "entry");
  return [...edges, ...entries];
}

/** The places of a machine canvas that run catalog items: effects and `via`, with the field that says so. */
function runnersOf(canvas) {
  const places = [];
  for (const [id, edge] of sortedEntries(canvas.edges)) {
    if (edge.kind === "link") continue;
    for (const effect of edge.actions ?? [])
      if (effect.action) places.push({ id, item: effect.action, field: "actions" });
    if (edge.via) places.push({ id, item: edge.via, field: "via" });
  }
  for (const [id, node] of sortedEntries(canvas.nodes)) {
    for (const field of ["onEntry", "onExit"]) {
      for (const effect of node[field] ?? []) if (effect.action) places.push({ id, item: effect.action, field });
    }
    if (node.kind === "entry" && node.via) places.push({ id, item: node.via, field: "via" });
  }
  return places;
}

/** R1 sends and receives, R2 runs: the associations of one machine canvas. */
function machineRoles(doc, canvas, out) {
  const participants = participantsOf(canvas);
  for (const [id, element] of startersOf(canvas)) {
    const sender = senderOf(doc, id, element);
    for (const node of participants.get(sender?.party) ?? []) {
      out.add("sends", node, id, sender.field, sender.owner, sender.label);
    }
  }
  const steps = sortedEntries(canvas.nodes).filter(([, node]) => node.kind === "steps");
  for (const place of runnersOf(canvas)) {
    const action = doc.catalog.actions[place.item];
    for (const node of participants.get(action?.party) ?? []) {
      out.add("receives", place.id, node, "party", place.item, action.name);
    }
    for (const [node] of steps.filter(([, value]) => value.action === place.item)) {
      out.add("runs", place.id, node, place.field, place.id);
    }
  }
}

/** R3 drives: boxes with a party, to the transitions of the machines framed on a system canvas. */
function systemRoles(doc, canvasId, framed, out) {
  const boxes = sortedEntries(doc.canvases[canvasId].nodes).filter(([, node]) => node.kind !== "ref" && node.party);
  for (const machineId of framed) {
    // A framed mixed level drives by its machine part (mixed levels spec §4.5).
    const canvas = doc.canvases[machineId];
    const machine = canvas.kind === "mixed" ? viewOf(canvas, "machine") : canvas;
    if (machine.kind !== "machine") continue;
    for (const [id, element] of startersOf(machine)) {
      const sender = senderOf(doc, id, element);
      for (const [box] of boxes.filter(([, node]) => node.party === sender?.party)) {
        out.add("drives", box, id, sender.field, sender.owner, sender.label);
      }
    }
  }
}

/** Where a state is: its machine canvas, or null. */
const machineOfState = (doc, nodeId) => stateLevelOf(doc, nodeId);

/** The events and calls that lead a machine into a state: the triggers of its transitions there. */
function arrivalsAt(doc, stateId) {
  const machineId = machineOfState(doc, stateId);
  const events = new Set();
  const calls = new Set();
  if (!machineId) return { events, calls };
  for (const [, edge] of sortedEntries(doc.canvases[machineId].edges)) {
    if (edge.kind === "link" || edge.to !== stateId) continue;
    for (const eventId of edge.on ?? []) events.add(eventId);
    if (edge.via) calls.add(edge.via);
  }
  return { events, calls };
}

/** What a flow step sets off: the events it emits (directly or through what it calls) and what it calls. */
function effectsOfStep(doc, node) {
  const emitted = [];
  if (node.kind === "emit") emitted.push({ event: node.event, field: "event" });
  if (node.kind === "call" && node.endpoint) {
    for (const event of doc.catalog.endpoints[node.endpoint]?.emits ?? []) emitted.push({ event, field: "endpoint" });
  }
  if (node.kind === "action") {
    for (const event of doc.catalog.actions[node.action]?.emits ?? []) emitted.push({ event, field: "action" });
  }
  if (node.kind === "webhook") {
    const event = doc.catalog.webhooks[node.webhook]?.event;
    if (event) emitted.push({ event, field: "webhook" });
  }
  const called =
    node.kind === "call" ? node.endpoint
    : node.kind === "webhook" ? node.webhook
    : undefined;
  return { emitted, called };
}

/** The party a flow step names itself (exported for the contract, which says a lane's performer only): a call's, its webhook's, its action's; with the element that holds it. */
export function ownPartyOf(doc, id, node) {
  if (node.kind === "call" && node.party) return { party: node.party, owner: id };
  if (node.kind === "webhook") {
    const party = doc.catalog.webhooks[node.webhook]?.party;
    if (party) return { party, owner: node.webhook };
  }
  if (node.kind === "action") {
    const party = doc.catalog.actions[node.action]?.party;
    if (party) return { party, owner: node.action };
  }
  return null;
}

/** R4 leads to, R1 performs: the associations of one flow canvas. */
function flowRoles(doc, canvas, out) {
  const participants = participantsOf(canvas);
  const guests = sortedEntries(canvas.nodes).filter(([, node]) => node.kind === "state");
  const arrivals = new Map(guests.map(([id, node]) => [id, arrivalsAt(doc, node.target)]));
  for (const [id, node] of sortedEntries(canvas.nodes)) {
    const { emitted, called } = effectsOfStep(doc, node);
    for (const [guest] of guests) {
      const { events, calls } = arrivals.get(guest);
      const reached = emitted.find(item => events.has(item.event));
      if (reached) out.add("leadsTo", id, guest, reached.field, id, doc.catalog.events[reached.event]?.name);
      else if (called && calls.has(called))
        out.add("leadsTo", id, guest, node.kind === "call" ? "endpoint" : "webhook", id);
    }
    const own = ownPartyOf(doc, id, node);
    for (const participant of participants.get(own?.party) ?? []) {
      out.add("performs", id, participant, "party", own.owner);
    }
  }
}

/**
 * A mixed level's roles (mixed levels spec §4.5): its machine part's (a system box with a party sends and receives as
 * a participant does), its flow part's, and its boxes' drives of the lifecycles framed on it.
 */
function mixedRoles(doc, canvasId, framed, out) {
  const canvas = doc.canvases[canvasId];
  const machine = viewOf(canvas, "machine");
  for (const [id, node] of Object.entries(canvas.nodes)) {
    if (homeKind("mixed", node) === "system" && node.party)
      machine.nodes[id] = { kind: "participant", party: node.party };
  }
  machineRoles(doc, machine, out);
  flowRoles(doc, viewOf(canvas, "flow"), out);
  const boxes = {
    ...canvas,
    nodes: Object.fromEntries(Object.entries(canvas.nodes).filter(([, node]) => homeKind("mixed", node) === "system"))
  };
  systemRoles({ ...doc, canvases: { ...doc.canvases, [canvasId]: boxes } }, canvasId, framed.slice(1), out);
}

/**
 * The derived connectors of a level's figure (spec §3): its own and those of the interiors it shows as frames, and,
 * on a system level, the boxes that drive its framed machines. Pure; dangling IDs give nothing.
 * @param {any} doc A schema-valid document.
 * @param {string} canvasId
 * @returns {Association[]} In ID order.
 */
export function associationsOf(doc, canvasId) {
  if (!doc.canvases[canvasId]) return [];
  const out = collector();
  const framed = figureCanvases(doc, canvasId);
  for (const id of framed) {
    const canvas = doc.canvases[id];
    if (canvas.kind === "machine") machineRoles(doc, canvas, out);
    if (canvas.kind === "flow") flowRoles(doc, canvas, out);
    if (canvas.kind === "system") systemRoles(doc, id, framed, out);
    if (canvas.kind === "mixed") mixedRoles(doc, id, framed, out);
  }
  return out.list();
}

/**
 * Who performs a flow step (R5): the party it names (a call's, its webhook's, its action's), else the party of the
 * lane holding it, else null.
 * @param {any} doc
 * @param {string} canvasId
 * @param {string} nodeId
 * @returns {string|null}
 */
export function performerOf(doc, canvasId, nodeId) {
  const node = doc.canvases[canvasId]?.nodes[nodeId];
  if (!node) return null;
  const own = ownPartyOf(doc, nodeId, node);
  if (own) return own.party;
  for (const [, lane] of sortedEntries(doc.annotations?.lanes)) {
    if (lane.canvas === canvasId && lane.party && lane.nodes.includes(nodeId)) return lane.party;
  }
  return null;
}
