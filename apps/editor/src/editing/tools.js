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
 * @property {"action" | "level"} [needs] What is chosen first: the catalog action a flow step performs, or the level a
 *   link leads to.
 */

const SELECT = { id: "select", key: "V", icon: "pointer" };
const NOTE = { id: "note", key: "N", icon: "note" };
const LINK = { id: "link", key: "L", icon: "link", node: { kind: "ref" }, needs: "level" };

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

/** Kinds whose name the format requires (an empty name keeps the old one). */
export const NAME_REQUIRED = new Set(["state", "entry"]);

/** @param {"system" | "machine" | "flow"} kind */
export const toolsFor = kind => TOOLS[kind];

/**
 * The tool a key picks on a canvas of this kind, or null.
 * @param {"system" | "machine" | "flow"} kind
 * @param {string} key As `KeyboardEvent.key` gives it.
 */
export const toolForKey = (kind, key) => TOOLS[kind].find(tool => tool.key === key.toUpperCase()) ?? null;
