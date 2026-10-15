// What `/` can insert on a level (spec §7.2: "a search of everything insertable — tools, definitions, catalog-backed
// steps such as Emit psp.refund"): the level's tools, the flow steps the dock leaves out, one step per catalog item
// that a flow step can use, and the project's reusable parts that fit here.
import { toolsFor } from "./tools";

/** The box that holds an instance of a definition, by kind of level, and the kinds of definition it may hold. */
const CONTAINER = {
  system: { kind: "service", holds: ["system", "machine", "flow"] },
  machine: { kind: "state", holds: ["machine"] },
  flow: { kind: "subflow", holds: ["flow"] }
};

/** Flow steps with no tool of their own. */
const MORE_STEPS = ["start", "forEach", "join", "assign", "subflow", "call"];

/**
 * @typedef {{ id: string, label: string, meta: string, tool?: import("./tools").Tool, node?: object }} Insertable
 *   A tool (placed as the dock places it) or a node ready to add.
 */

/**
 * Everything insertable on a level, in the order offered: tools, then steps, then reusable parts.
 * @param {(key: string, values?: object) => string} t The `editor` texts.
 * @returns {Insertable[]}
 */
export function insertables(doc, canvasId, t) {
  const kind = doc.canvases[canvasId].kind;
  const tools = toolsFor(kind)
    .filter(tool => tool.id !== "select")
    .map(tool => ({ id: `tool:${tool.id}`, label: t(`tools.${tool.id}`), meta: t("insert.tool"), tool }));
  const named = (collection, prefix, label, meta, node) =>
    Object.entries(doc.catalog[collection]).map(([id, item]) => ({
      id: `${prefix}:${id}`,
      label: t(label, { name: item.name }),
      meta: t(meta),
      node: node(id)
    }));
  const steps =
    kind === "flow" ?
      [
        ...MORE_STEPS.map(step => ({
          id: `step:${step}`,
          label: t(`insert.steps.${step}`),
          meta: t("insert.step"),
          node: { kind: step }
        })),
        ...named("events", "emit", "insert.emit", "insert.event", event => ({ kind: "emit", event })),
        ...named("actions", "action", "insert.action", "insert.actionMeta", action => ({ kind: "action", action })),
        ...named("endpoints", "call", "insert.call", "insert.endpoint", endpoint => ({ kind: "call", endpoint })),
        ...named("webhooks", "webhook", "insert.webhook", "insert.webhookMeta", webhook => ({
          kind: "webhook",
          webhook
        }))
      ]
    : [];
  const container = CONTAINER[kind];
  const reuse = Object.entries(doc.definitions)
    .filter(([, definition]) => container.holds.includes(definition.kind))
    .map(([id, definition]) => ({
      id: `definition:${id}`,
      label: definition.name,
      meta: t("insert.definition"),
      node: { kind: container.kind, name: definition.name, inner: { definition: id } }
    }));
  return [...tools, ...steps, ...reuse];
}

/**
 * The insertables whose label contains what is typed — those that start with it first, in their order otherwise.
 * @param {Insertable[]} items
 */
export function findInsertables(items, query, limit = 8) {
  const typed = query.trim().toLowerCase();
  if (!typed) return items.slice(0, limit);
  return items
    .map((item, order) => ({ item, order, at: item.label.toLowerCase().indexOf(typed) }))
    .filter(entry => entry.at >= 0)
    .sort((a, b) => Number(b.at === 0) - Number(a.at === 0) || a.order - b.order)
    .slice(0, limit)
    .map(entry => entry.item);
}
