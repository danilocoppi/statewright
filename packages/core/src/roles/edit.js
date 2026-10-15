// Drawing and deleting a role's connector (mixed levels spec §3): a connector is never stored, so drawing one writes the
// field that holds its meaning, and deleting one clears it. What a pair of ends means comes from their kinds; a pair
// that means nothing is refused, in words the Editor can say.

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

/**
 * What drawing a connector from one element of a machine level to another means, and the commands that write it.
 * @param {any} doc
 * @param {string} canvasId
 * @param {string} from A node or transition ID on the level.
 * @param {string} to A node or transition ID on the level.
 * @param {{ action?: string }} [choice] The action a participant receives, when the place runs several.
 * @returns {{ role: string, commands: object[] } | { refusal: RoleRefusal } | { needs: "action", actions: string[] }}
 */
export function associate(doc, canvasId, from, to, choice = {}) {
  const canvas = doc.canvases[canvasId];
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
