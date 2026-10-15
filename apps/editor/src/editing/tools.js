// The tools of each kind of canvas (spec §7.1, mockup 08): what each one creates, its key and its icon. Select and
// Note are on every canvas; on machines, regions are made from selected states with R, not with a tool. Flow steps
// that need a catalog item first (emit, call, webhook) and the rarer ones (assign, subflow, start) are inserted by name
// with `/`.

/**
 * @typedef {object} Tool
 * @property {string} id Also the key of its name in the `editor:tools` texts.
 * @property {string} key The key that picks it (spec §7.1).
 * @property {string} icon An `Icon` name.
 * @property {object} [node] The node it creates: its kind and fixed fields.
 * @property {boolean} [named] The new box is named before it is added (its name is typed in place).
 * @property {"action" | "level" | "party" | "state"} [needs] What is chosen first: the catalog action a flow step
 *   performs (or embedded steps show), the level a link leads to, the party a participant is, the state a state guest
 *   stands for.
 * @property {"human" | "system" | "external"} [partyKind] The kind of party a participant tool makes or picks.
 * @property {"machine" | "flow"} [interior] The level a guest box gets inside, shown as a frame.
 */

const SELECT = { id: "select", key: "V", icon: "pointer" };
const NOTE = { id: "note", key: "N", icon: "note" };
const LINK = { id: "link", key: "K", icon: "link", node: { kind: "ref" }, needs: "level" };

/** @type {Record<"system" | "machine" | "flow", Tool[]>} */
export const TOOLS = {
  system: [
    SELECT,
    { id: "service", key: "S", icon: "service", node: { kind: "service" }, named: true },
    { id: "actor", key: "A", icon: "actor", node: { kind: "actor" }, named: true },
    { id: "store", key: "D", icon: "store", node: { kind: "store" }, named: true },
    { id: "queue", key: "Q", icon: "queue", node: { kind: "queue" }, named: true },
    { id: "external", key: "X", icon: "external", node: { kind: "external" }, named: true },
    LINK,
    NOTE
  ],
  machine: [
    SELECT,
    { id: "state", key: "S", icon: "state", node: { kind: "state" }, named: true },
    { id: "initial", key: "I", icon: "initial", node: { kind: "initial" } },
    { id: "choice", key: "C", icon: "choice", node: { kind: "choice" } },
    { id: "history", key: "H", icon: "history", node: { kind: "history" } },
    { id: "any", key: "Y", icon: "any", node: { kind: "any" } },
    { id: "entry", key: "E", icon: "entry", node: { kind: "entry" }, named: true },
    LINK,
    NOTE
  ],
  flow: [
    SELECT,
    { id: "action", key: "A", icon: "action", node: { kind: "action" }, needs: "action" },
    { id: "if", key: "F", icon: "choice", node: { kind: "if" }, named: true },
    { id: "switch", key: "W", icon: "switch", node: { kind: "switch" }, named: true },
    { id: "while", key: "O", icon: "loop", node: { kind: "while" }, named: true },
    { id: "wait", key: "T", icon: "wait", node: { kind: "wait" } },
    { id: "parallel", key: "P", icon: "parallel", node: { kind: "parallel" } },
    { id: "end", key: "E", icon: "end", node: { kind: "end" }, named: true },
    NOTE
  ]
};

/** The dock's tabs (mixed levels spec §6): one per kind of level, in this order. */
export const DOCK_TABS = ["system", "machine", "flow"];

/** Participants (role R1): a party drawn on a machine or a flow, in the look of its kind. */
const PARTICIPANTS = [
  { id: "participantActor", icon: "actor", node: { kind: "participant" }, needs: "party", partyKind: "human" },
  { id: "participantService", icon: "service", node: { kind: "participant" }, needs: "party", partyKind: "system" },
  { id: "participantExternal", icon: "external", node: { kind: "participant" }, needs: "party", partyKind: "external" }
];

/**
 * The guests each kind of level takes from the other kinds' tabs (mixed levels spec §3, §6). They have no letter key:
 * the letters stay the level's own.
 * @type {Record<"system" | "machine" | "flow", Partial<Record<"system" | "machine" | "flow", Tool[]>>>}
 */
const GUESTS = {
  system: {
    machine: [{ id: "lifecycle", icon: "state", node: { kind: "store" }, named: true, interior: "machine" }],
    flow: [{ id: "procedure", icon: "action", node: { kind: "service" }, named: true, interior: "flow" }]
  },
  machine: {
    system: PARTICIPANTS,
    flow: [{ id: "steps", icon: "action", node: { kind: "steps" }, needs: "action" }]
  },
  flow: {
    system: PARTICIPANTS,
    machine: [{ id: "stateGuest", icon: "state", node: { kind: "state" }, needs: "state" }]
  }
};

/** Kinds whose name the format requires (an empty name keeps the old one). */
export const NAME_REQUIRED = new Set(["state", "entry"]);

/**
 * The tools a tab of the dock shows on a level of this kind: the level's own on its own tab; on the others, Select,
 * that kind's guests, and Note.
 * @param {"system" | "machine" | "flow"} kind
 * @param {"system" | "machine" | "flow"} [tab]
 */
export const toolsFor = (kind, tab = defaultTab(kind)) => {
  // On a mixed level the tabs are peers (mixed levels spec §6): each kind's tools, with the guests that live there.
  if (kind === "mixed") return [...TOOLS[tab].slice(0, -1), ...MIXED_GUESTS[tab], NOTE];
  return tab === kind ? TOOLS[kind] : [SELECT, ...GUESTS[kind][tab], NOTE];
};

/** The tab a level opens on: its own kind's, or, on a mixed level, the machine's. */
export const defaultTab = kind => (kind === "mixed" ? "machine" : kind);

/** The guests a mixed level's tabs add to their kind's tools: participants and steps with states, state guests with steps. */
const MIXED_GUESTS = {
  system: [],
  machine: [...PARTICIPANTS, { id: "steps", icon: "action", node: { kind: "steps" }, needs: "action" }],
  flow: [{ id: "stateGuest", icon: "state", node: { kind: "state" }, needs: "state" }]
};

/**
 * A tool of a level of this kind, on any of its tabs, by ID; null when there is none.
 * @param {"system" | "machine" | "flow"} kind
 * @param {string} id
 */
export const toolById = (kind, id) =>
  DOCK_TABS.flatMap(tab => toolsFor(kind, tab)).find(tool => tool.id === id) ?? null;

/**
 * The tool a key picks on a canvas of this kind, or null.
 * @param {"system" | "machine" | "flow"} kind
 * @param {string} key As `KeyboardEvent.key` gives it.
 */
export const toolForKey = (kind, key, tab = defaultTab(kind)) =>
  (kind === "mixed" ? toolsFor(kind, tab) : TOOLS[kind]).find(tool => tool.key === key.toUpperCase()) ?? null;
