// The trigger editor's model (spec §7.2, mockup 07): find catalog items by what is typed, name new ones the way the
// format wants them, and turn the person's choice into commands — creating a missing event, guard or timer in the same
// change, so nobody has to open the catalog first.
import { buildIndex, EVENT_NAME_PATTERN, toCamel, usagesOf } from "statewright";

import { indexOf } from "@/lib/derived";

import { idsFor } from "./ids";

/** ID prefixes of the collections the trigger editor reads and adds to. */
const PREFIX = { events: "evt", guards: "grd", timers: "tmr", actions: "act" };

/**
 * Catalog items whose name contains what is typed — names that start with it first — with how often each is used.
 * @param {"events" | "guards" | "timers" | "actions"} collection
 * @returns {Array<{ id: string, name: string, uses: number }>}
 */
export function matches(doc, collection, query, limit = 6) {
  const text = query.trim().toLowerCase();
  return Object.entries(doc.catalog[collection])
    .map(([id, item]) => ({ id, name: item.name, at: item.name.toLowerCase().indexOf(text) }))
    .filter(item => item.at >= 0)
    .sort((a, b) => Number(b.at === 0) - Number(a.at === 0) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name, uses: usagesOf(doc, id).length }));
}

/**
 * The event name for what is typed: as typed when the format accepts it ("psp.refund"), otherwise each dotted part in
 * lower camel case ("Refund issued" → "refundIssued"); null when nothing usable is left.
 */
export function eventName(text) {
  const typed = text.trim();
  if (EVENT_NAME_PATTERN.test(typed)) return typed;
  const name = typed
    .split(".")
    .map(part => toCamel(part))
    .filter(Boolean)
    .join(".");
  return EVENT_NAME_PATTERN.test(name) ? name : null;
}

/** ISO 8601 durations, as the format checks them. */
const ISO_DURATION = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

/** Units a person may type (English, Portuguese, Spanish), with their ISO letter; hours and less go after a T. */
const UNITS = [
  [/^(s|secs?|seconds?|segs?|segundos?)$/, "T", "S"],
  [/^(m|mins?|minutes?|minutos?)$/, "T", "M"],
  [/^(h|hrs?|hours?|horas?)$/, "T", "H"],
  [/^(d|days?|dias?|días?)$/, "", "D"],
  [/^(w|wks?|weeks?|semanas?)$/, "", "W"]
];

/**
 * An ISO 8601 duration from what a person types ("30 min", "2 hours", "3 dias", "PT45S"), or null.
 * @returns {string | null}
 */
export function parseDuration(text) {
  const typed = text.trim();
  if (ISO_DURATION.test(typed)) return typed;
  const match = /^(\d+)\s*([a-zí]+)$/i.exec(typed);
  const unit = match && UNITS.find(([pattern]) => pattern.test(match[2].toLowerCase()));
  return unit ? `P${unit[1]}${match[1]}${unit[2]}` : null;
}

/**
 * A catalog item chosen in the editor: one that exists, or one to create with the given name.
 * @typedef {{ id: string } | { name: string }} Pick
 */

/** The ID of a picked item, and the command that creates it when it is new. */
function picked(collection, pick, ids, extra = {}) {
  if ("id" in pick) return { id: pick.id, commands: [] };
  const id = ids.take(PREFIX[collection], pick.name);
  return { id, commands: [{ type: "catalog.add", args: { collection, id, item: { name: pick.name, ...extra } } }] };
}

/**
 * Set what makes a transition happen: an event, a timer, or nothing (spec §7.2). An event is added to those the
 * transition already happens on (each once; spec §7.4 lists several), `without` takes one out; the other triggers are
 * cleared.
 * @param {{ on: Pick } | { without: string } | { after: Pick } | { none: true }} choice A new timer's name is also read
 *   as its duration when it says one ("30 min").
 * @returns {Array<{ type: string, args: object }>}
 */
export function triggerCommands(doc, edgeId, choice, ids = idsFor(doc)) {
  const clear = ["on", "onMatch", "after", "always"];
  const entry = indexOf(doc).get(edgeId);
  const events = (entry && doc.canvases[entry.canvas]?.edges[edgeId]?.on) ?? [];
  if ("on" in choice) {
    const event = picked("events", choice.on, ids);
    const unset = clear.filter(key => key !== "on");
    const on = [...new Set([...events, event.id])];
    return [...event.commands, { type: "edge.update", args: { id: edgeId, set: { on }, unset } }];
  }
  if ("without" in choice) {
    const on = events.filter(id => id !== choice.without);
    return [{ type: "edge.update", args: { id: edgeId, ...(on.length ? { set: { on } } : { unset: ["on"] }) } }];
  }
  if ("after" in choice) {
    const duration = "name" in choice.after ? parseDuration(choice.after.name) : null;
    const timer = picked("timers", choice.after, ids, duration ? { duration } : {});
    const unset = clear.filter(key => key !== "after");
    return [...timer.commands, { type: "edge.update", args: { id: edgeId, set: { after: timer.id }, unset } }];
  }
  return [{ type: "edge.update", args: { id: edgeId, unset: clear } }];
}

/**
 * Set or remove the condition a transition waits for: a guard from the catalog (new or not), or a condition written
 * in plain words.
 * @param {{ guard: Pick } | { text: string } | null} condition
 * @returns {Array<{ type: string, args: object }>}
 */
export function guardCommands(doc, edgeId, condition, ids = idsFor(doc)) {
  if (!condition) return [{ type: "edge.update", args: { id: edgeId, unset: ["guard"] } }];
  if ("text" in condition) {
    return [{ type: "edge.update", args: { id: edgeId, set: { guard: { text: condition.text.trim() } } } }];
  }
  const guard = picked("guards", condition.guard, ids);
  return [...guard.commands, { type: "edge.update", args: { id: edgeId, set: { guard: { guard: guard.id } } } }];
}

/** Whether an edge of a level has something to choose in the trigger editor (links do not). */
export const hasTrigger = (doc, canvasId, edgeId) => {
  const edge = doc.canvases[canvasId]?.edges[edgeId];
  return Boolean(edge) && edge.kind !== "link";
};

/** The kinds a system connection can carry (spec §7.2). */
export const SYSTEM_KINDS = ["command", "event", "webhook", "stream", "data"];

/**
 * Set the kind of a system connection, or the branch a flow edge is: true or false out of an if, a case (with its
 * value) or the default out of a switch.
 * @param {string} kind
 * @param {string} [caseValue] For "case".
 * @returns {Array<{ type: string, args: object }>}
 */
export function kindCommands(doc, edgeId, kind, caseValue) {
  if (kind === "case") {
    return [{ type: "edge.update", args: { id: edgeId, set: { kind, case: caseValue.trim() } } }];
  }
  const flow = doc.canvases[buildIndex(doc).get(edgeId).canvas].kind === "flow";
  return [{ type: "edge.update", args: { id: edgeId, set: { kind }, ...(flow && { unset: ["case"] }) } }];
}
