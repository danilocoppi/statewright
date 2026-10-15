// Fields that name other things (spec §7.4: "Fields that reference the catalog use the same completion as the trigger
// editor, with Create …"): finding catalog items and elements by name, and creating a catalog item in the same change
// as its use.
import { CATALOG_COLLECTIONS, isGuest, stepText, toCamel } from "statewright";

import { eventName } from "@/editing/triggers";
import { idsFor } from "@/editing/ids";
import { indexOf, usageCount } from "@/lib/derived";

import { fieldCommands } from "./apply";

/** A path made from a name: "Refund a payment" → "/refund-a-payment". */
export const pathFrom = name =>
  `/${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

/**
 * The catalog item to create for what is typed, or null when nothing usable is left: an event gets a valid name
 * ("Refund issued" → refundIssued); items whose kind the format requires get the plainest one (a person, an object
 * type, a POST endpoint at a path made from the name, an incoming webhook — an outgoing one for a flow's webhook step).
 * @param {string} collection
 * @param {string} typed
 * @param {{ outgoing?: boolean }} [context]
 * @returns {object | null}
 */
export function newItem(collection, typed, { outgoing = false } = {}) {
  const name = typed.trim();
  if (!name) return null;
  if (collection === "events") {
    const event = eventName(name);
    return event ? { name: event } : null;
  }
  if (collection === "parties") return { kind: "human", name };
  if (collection === "types") return { kind: "object", name };
  if (collection === "endpoints") return { name, method: "POST", path: pathFrom(name) };
  if (collection === "webhooks") return { name, direction: outgoing ? "out" : "in" };
  return { name };
}

/**
 * The command that creates a catalog item, with the ID it will have (named after it, free in the document).
 * @returns {{ id: string, commands: object[] }}
 */
export function createCommands(doc, collection, item, ids = idsFor(doc)) {
  const id = ids.take(CATALOG_COLLECTIONS[collection], toCamel(item.name) || collection);
  return { id, commands: [{ type: "catalog.add", args: { collection, id, item } }] };
}

/**
 * Set a field to a catalog item, creating it first when it is new — one change.
 * @param {{ id: string } | { collection: string, item: object }} pick
 * @param {(itemId: string) => unknown} valueOf The field's value once the item's ID is known (a list adds it).
 */
export function pickCommands(doc, elementId, key, pick, valueOf = itemId => itemId) {
  if ("id" in pick) return fieldCommands(doc, elementId, key, valueOf(pick.id));
  const created = createCommands(doc, pick.collection, pick.item);
  return [...created.commands, ...fieldCommands(doc, elementId, key, valueOf(created.id))];
}

/** How well a name answers a query: starts with it first, then contains it; -1 when it does not. */
function rank(name, text) {
  const at = name.toLowerCase().indexOf(text);
  return (
    at < 0 ? -1
    : at === 0 ? 0
    : 1
  );
}

/**
 * Catalog items of some collections whose names match what is typed, best first, with how often each is used.
 * @returns {Array<{ id: string, name: string, collection: string, uses: number }>}
 */
export function findItems(doc, collections, query, limit = 8) {
  const text = query.trim().toLowerCase();
  return collections
    .flatMap(collection =>
      Object.entries(doc.catalog[collection]).map(([id, item]) => ({ id, name: item.name, collection }))
    )
    .map(item => ({ ...item, rank: rank(item.name, text) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ rank: _, ...item }) => ({ ...item, uses: usageCount(doc, item.id) }));
}

/** What an element is called: its name, a level's name, an edge's ends, a catalog item's name. */
export function elementName(doc, entry, unnamed) {
  const { type, value } = entry;
  if (type === "edge") {
    const nodes = doc.canvases[entry.canvas].nodes;
    const end = id => nodes[id]?.name ?? unnamed(nodes[id]?.kind);
    return value.name ?? `${end(value.from)} → ${end(value.to)}`;
  }
  if (type === "node") {
    if (isGuest(doc.canvases[entry.canvas].kind, value)) return value.label ?? stepText(doc, value);
    return value.name ?? unnamed(value.kind);
  }
  return value.name ?? value.label ?? value.title ?? entry.id;
}

/**
 * Elements whose names match what is typed: levels, boxes and arrows (with the level they are on), reusable parts and
 * catalog items — those of the given index types.
 * @param {string[]} types Index entry types ("canvas", "node", "edge", "definition", "catalog").
 * @param {{ canvas?: string, unnamed: (kind: string) => string, limit?: number }} options `canvas`: only elements of
 *   that level (and not the level itself).
 * @returns {Array<{ id: string, name: string, type: string, canvas?: string, collection?: string }>}
 */
export function findElements(doc, types, query, { canvas, unnamed, limit = 8 }) {
  const text = query.trim().toLowerCase();
  return [...indexOf(doc).entries.values()]
    .filter(entry => types.includes(entry.type) && (!canvas || entry.canvas === canvas))
    .map(entry => ({
      id: entry.id,
      name: elementName(doc, entry, unnamed),
      type: entry.type,
      canvas: entry.canvas,
      collection: entry.collection
    }))
    .map(item => ({ ...item, rank: rank(item.name, text) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ rank: _, ...item }) => item);
}
