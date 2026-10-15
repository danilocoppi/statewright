// Drawing and deleting a role's connector (mixed levels spec §3): a connector is never stored, so drawing one writes the
// field that holds its meaning, and deleting one clears it. What a pair of ends means comes from their kinds; a pair
// that means nothing is refused, in words the Editor can say.
import { homeKind, isGuest } from "./kinds.js";
import { viewOf } from "./typed.js";
import { makeId } from "../ids.js";
import { buildIndex } from "../query/build-index.js";
import { figureCanvases } from "../style/frames.js";

/**
 * @typedef {"noMeaning" | "already" | "notRun" | "nothingToReceive"} RoleRefusal Why drawing a connector changes
 *   nothing: the two ends have no role together; the role is already there; the action chosen is not run there; the
 *   place runs no action anyone could receive.
 */

/** What an ID on a level is: a node with its value, a transition (not a link), or nothing. */
function endOf(canvas, id) {
  if (canvas.nodes[id]) return { type: "node", id, value: canvas.nodes[id] };
  const edge = canvas.edges[id];
  if (edge && edge.kind !== "link") return { type: "edge", id, value: edge };
  return null;
}

/** The actions a state or a transition runs, in order, each once. */
function actionsAt(end) {
  const effects =
    end.type === "edge" ? (end.value.actions ?? []) : [...(end.value.onEntry ?? []), ...(end.value.onExit ?? [])];
  return [...new Set(effects.map(effect => effect.action).filter(Boolean))];
}

/** The command that changes a field of a node or an edge. */
const update = (end, change) => ({
  type: end.type === "edge" ? "edge.update" : "node.update",
  args: { id: end.id, ...change }
});

/** A participant → a transition or an entry: it sends what moves it (R1) — the transition's `by`. */
function sends(participant, target) {
  if (target.value.by === participant.value.party) return { refusal: "already" };
  return { role: "sends", commands: [update(target, { set: { by: participant.value.party } })] };
}

/** A state or a transition → a participant: it receives one of the actions run there (R1) — that action's `party`. */
function receives(doc, place, participant, choice) {
  const actions = actionsAt(place);
  if (!actions.length) return { refusal: "nothingToReceive" };
  let action = choice.action;
  if (action === undefined) {
    if (actions.length > 1) return { needs: "action", actions };
    [action] = actions;
  }
  if (!actions.includes(action)) return { refusal: "notRun" };
  if (doc.catalog.actions[action]?.party === participant.value.party) return { refusal: "already" };
  return {
    role: "receives",
    commands: [{ type: "catalog.update", args: { id: action, set: { party: participant.value.party } } }]
  };
}

/** Embedded steps → a transition or a state: their action runs there (R2) — in its actions, or on entering it. */
function runs(steps, place) {
  const item = steps.value.action;
  if (!item.startsWith("act_")) {
    // An endpoint's or a webhook's steps run where a call to it triggers the transition.
    if (place.type !== "edge") return { refusal: "noMeaning" };
    if (place.value.via === item) return { refusal: "already" };
    return { role: "runs", commands: [update(place, { set: { via: item } })] };
  }
  if (actionsAt(place).includes(item)) return { refusal: "already" };
  const field = place.type === "edge" ? "actions" : "onEntry";
  return {
    role: "runs",
    commands: [update(place, { set: { [field]: [...(place.value[field] ?? []), { action: item }] } })]
  };
}

/** The kind of party a system box acts for when it is given a new one (mixed levels spec §4.3). */
const NEW_PARTY_KIND = { service: "system", store: "system", queue: "system", actor: "human", external: "external" };
/** The party kinds offered first to a box of each kind. */
const OFFERED_FIRST = { system: ["system"], human: ["human", "operator"], external: ["external"] };

/**
 * A system box → a transition of a machine framed on the figure: the box drives it (R3) — the transition's `by` is the
 * box's party; a box without a party asks for one, and gets it in the same change.
 */
function drives(doc, canvasId, box, edgeId, choice) {
  const machine = figureCanvases(doc, canvasId)
    .slice(1)
    .find(id => doc.canvases[id].kind === "machine" && doc.canvases[id].edges[edgeId]);
  const edge = machine && doc.canvases[machine].edges[edgeId];
  if (!edge || edge.kind === "link" || !NEW_PARTY_KIND[box.value.kind]) return { refusal: "noMeaning" };
  const commands = [];
  let party = box.value.party;
  if (!party) {
    const kind = NEW_PARTY_KIND[box.value.kind];
    if (choice.party === undefined) {
      const first = OFFERED_FIRST[kind];
      const parties = Object.entries(doc.catalog.parties)
        .sort(
          ([, a], [, b]) =>
            Number(!first.includes(a.kind)) - Number(!first.includes(b.kind)) || a.name.localeCompare(b.name)
        )
        .map(([id]) => id);
      return { needs: "party", parties };
    }
    if ("id" in choice.party) party = choice.party.id;
    else {
      party = makeId("pty", choice.party.name, buildIndex(doc));
      commands.push({
        type: "catalog.add",
        args: { collection: "parties", id: party, item: { kind, name: choice.party.name } }
      });
    }
    commands.push({ type: "node.update", args: { id: box.id, set: { party } } });
  } else if (edge.by === party) return { refusal: "already" };
  commands.push({ type: "edge.update", args: { id: edgeId, set: { by: party } } });
  return { role: "drives", commands };
}

/** The events whose transitions bring a machine into a state (mixed levels spec §4.4), sorted. */
function eventsInto(doc, stateId) {
  const machine = Object.values(doc.canvases).find(
    canvas => canvas.kind === "machine" && canvas.nodes[stateId]?.kind === "state"
  );
  const events = new Set();
  for (const edge of Object.values(machine?.edges ?? {})) {
    if (edge.kind !== "link" && edge.to === stateId) for (const event of edge.on ?? []) events.add(event);
  }
  return [...events].sort();
}

/**
 * The levels, other than this one, a catalog item's party also speaks for: flows whose steps use it, and, for an
 * action, machines that run it (there its party is who receives it).
 */
function otherFlowsUsing(doc, canvasId, kind, field, itemId) {
  const runs = effects => (effects ?? []).some(effect => effect.action === itemId);
  return Object.keys(doc.canvases)
    .filter(id => id !== canvasId)
    .filter(id => {
      const canvas = doc.canvases[id];
      if (canvas.kind === "flow") {
        return Object.values(canvas.nodes).some(node => node.kind === kind && node[field] === itemId);
      }
      if (canvas.kind !== "machine" || kind !== "action") return false;
      return (
        Object.values(canvas.edges).some(edge => runs(edge.actions)) ||
        Object.values(canvas.nodes).some(node => runs(node.onEntry) || runs(node.onExit))
      );
    })
    .sort();
}

/**
 * On a flow (mixed levels spec §4.4): an emit step onto a state guest leads there (R4) — its event becomes one that
 * moves the machine into that state; a call, webhook or action step onto a participant is performed by its party (R1).
 */
function flowRole(doc, canvasId, from, to, choice) {
  const canvas = doc.canvases[canvasId];
  const step = canvas.nodes[from];
  const target = canvas.nodes[to];
  if (!step || !target || isGuest("flow", step)) return { refusal: "noMeaning" };
  if (target.kind === "state") {
    if (step.kind !== "emit") return { refusal: "noMeaning" };
    const events = eventsInto(doc, target.target);
    if (!events.length) return { refusal: "noLeadingEvent" };
    // A step that already emits an event leading there already leads there.
    if (choice.event === undefined && events.includes(step.event)) return { refusal: "already" };
    const event = choice.event ?? (events.length === 1 ? events[0] : undefined);
    if (event === undefined) return { needs: "event", events };
    if (!events.includes(event)) return { refusal: "noLeadingEvent" };
    if (step.event === event) return { refusal: "already" };
    return { role: "leadsTo", commands: [{ type: "node.update", args: { id: from, set: { event } } }] };
  }
  if (target.kind !== "participant") return { refusal: "noMeaning" };
  const party = target.party;
  if (step.kind === "call") {
    if (step.party === party) return { refusal: "already" };
    return { role: "performs", commands: [{ type: "node.update", args: { id: from, set: { party } } }] };
  }
  const [collection, field] =
    step.kind === "webhook" ? ["webhooks", "webhook"]
    : step.kind === "action" ? ["actions", "action"]
    : [];
  const item = collection && doc.catalog[collection][step[field]];
  if (!item) return { refusal: "noMeaning" };
  if (item.party === party) return { refusal: "already" };
  return {
    role: "performs",
    commands: [{ type: "catalog.update", args: { id: step[field], set: { party } } }],
    alsoChanges: otherFlowsUsing(doc, canvasId, step.kind, field, step[field])
  };
}

/**
 * On a mixed level (mixed levels spec §4.5), a gesture means what it means on the level its ends belong to: between a
 * flow's step and a participant or a state guest, a flow's role; otherwise a machine's, a system's box with a party
 * standing for a participant.
 */
function mixedRole(doc, canvasId, from, to, choice) {
  const canvas = doc.canvases[canvasId];
  const source = canvas.nodes[from];
  const home = homeKind("mixed", source);
  const withView = view => ({ ...doc, canvases: { ...doc.canvases, [canvasId]: view } });
  if (home === "flow") return flowRole(withView(viewOf(canvas, "flow")), canvasId, from, to, choice);
  const machine = viewOf(canvas, "machine");
  for (const [id, node] of Object.entries(canvas.nodes)) {
    if (homeKind("mixed", node) === "system" && node.party)
      machine.nodes[id] = { kind: "participant", party: node.party };
  }
  if (!machine.nodes[from] || !(machine.nodes[to] || machine.edges[to])) return { refusal: "noMeaning" };
  return associate(withView(machine), canvasId, from, to, choice);
}

/**
 * What drawing a connector from one element of a level to another means, and the commands that write it: on a machine,
 * sends, receives and runs; on a system, a box driving a transition of a lifecycle framed there.
 * @param {any} doc
 * @param {string} canvasId
 * @param {string} from A node or transition ID on the level.
 * @param {string} to A node or transition ID on the level.
 * @param {{ action?: string, party?: { id: string } | { name: string } }} [choice] The action a participant receives,
 *   when the place runs several; the party a system box acts for, when it has none.
 * @returns {{ role: string, commands: object[] } | { refusal: RoleRefusal } | { needs: "action", actions: string[] }
 *   | { needs: "party", parties: string[] }}
 */
export function associate(doc, canvasId, from, to, choice = {}) {
  const canvas = doc.canvases[canvasId];
  if (canvas?.kind === "mixed") return mixedRole(doc, canvasId, from, to, choice);
  if (canvas?.kind === "flow") return flowRole(doc, canvasId, from, to, choice);
  if (canvas?.kind === "system") {
    const box = canvas.nodes[from];
    return box ? drives(doc, canvasId, { id: from, value: box }, to, choice) : { refusal: "noMeaning" };
  }
  const source = canvas && endOf(canvas, from);
  const target = canvas && endOf(canvas, to);
  if (!source || !target || canvas.kind !== "machine") return { refusal: "noMeaning" };
  const kind = end => (end.type === "edge" ? "transition" : end.value.kind);
  const pair = `${kind(source)}→${kind(target)}`;
  if (pair === "participant→transition" || pair === "participant→entry") return sends(source, target);
  if (pair === "state→participant" || pair === "transition→participant") return receives(doc, source, target, choice);
  if (pair === "steps→transition" || pair === "steps→state") return runs(source, target);
  return { refusal: "noMeaning" };
}

/**
 * Why drawing a connector between two elements changes nothing, or null when it would (or asks which action first).
 * @returns {RoleRefusal | null}
 */
export function associationRefusal(doc, canvasId, from, to) {
  return associate(doc, canvasId, from, to).refusal ?? null;
}

/** The transitions and entries anywhere in the document whose sender is an event's source (they have no `by`). */
function sentBySource(doc, eventId) {
  const found = [];
  for (const canvas of Object.values(doc.canvases)) {
    if (canvas.kind !== "machine") continue;
    for (const [id, element] of [...Object.entries(canvas.edges), ...Object.entries(canvas.nodes)]) {
      if (element.kind === "link" || element.by) continue;
      const first = (element.on ?? []).find(event => {
        const source = doc.catalog.events[event]?.source;
        return source && source !== "internal";
      });
      if (first === eventId) found.push(id);
    }
  }
  return found.sort();
}

/** The element an ID names on any machine level: a node or a transition. */
function elementOf(doc, id) {
  for (const canvas of Object.values(doc.canvases)) {
    const end = endOf(canvas, id);
    if (end) return end;
  }
  return null;
}

/**
 * What deleting a connector clears (spec §3), and the other transitions that lose their sender with it (a sender read
 * from an event's source goes from every transition that event triggers).
 * @param {any} doc
 * @param {import("./index.js").Association} association
 * @returns {{ commands: object[], alsoLoses: string[] }}
 */
export function dissociateCommands(doc, association) {
  const { role, field, owners } = association;
  if ((role === "sends" || role === "drives") && field === "source") {
    const [eventId] = owners;
    const lose = sentBySource(doc, eventId).filter(id => id !== association.to);
    return { commands: [{ type: "catalog.update", args: { id: eventId, unset: ["source"] } }], alsoLoses: lose };
  }
  if ((role === "sends" || role === "drives") && field === "by") {
    return { commands: owners.map(id => update(elementOf(doc, id), { unset: ["by"] })), alsoLoses: [] };
  }
  if (role === "receives") {
    return { commands: owners.map(id => ({ type: "catalog.update", args: { id, unset: ["party"] } })), alsoLoses: [] };
  }
  // A step's event is what the step is: its leads-to connector goes when the step or the state guest goes.
  if (role === "leadsTo") return { commands: [], alsoLoses: [], refusal: "isTheStep" };
  if (role === "performs") {
    const commands = owners.map(id => {
      const node = elementOf(doc, id);
      return node ?
          { type: "node.update", args: { id, unset: ["party"] } }
        : { type: "catalog.update", args: { id, unset: ["party"] } };
    });
    return { commands, alsoLoses: [] };
  }
  if (role === "runs") {
    const place = elementOf(doc, association.from);
    const steps = elementOf(doc, association.to);
    if (field === "via") return { commands: [update(place, { unset: ["via"] })], alsoLoses: [] };
    const kept = (place.value[field] ?? []).filter(effect => effect.action !== steps.value.action);
    const change = kept.length ? { set: { [field]: kept } } : { unset: [field] };
    return { commands: [update(place, change)], alsoLoses: [] };
  }
  return { commands: [], alsoLoses: [] };
}
