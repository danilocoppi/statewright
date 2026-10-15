// Edits from the inspector as Core commands (spec §4.2): one field is one `<type>.update { id, set, unset }` (a finding
// is written whole with `finding.upsert`); a value that says nothing leaves the key out. A kind changes with the keys
// the new kind does not take left out, so the change is one that Core accepts.
import { indexOf } from "@/lib/derived";

import { keysOf, schemaFor } from "./schema";

/** Whether a value says nothing: empty text, an empty list or an empty object (`null` says "none" and is kept). */
export function isEmpty(value) {
  if (value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return value !== null && typeof value === "object" && Object.keys(value).length === 0;
}

/**
 * The command that sets and leaves out keys of an element.
 * @param {{ type: string, id: string, value: any }} entry Core's index entry.
 * @param {Record<string, unknown>} [set]
 * @param {string[]} [unset]
 */
export function updateCommand(entry, set = {}, unset = []) {
  const args = { ...(Object.keys(set).length && { set }), ...(unset.length && { unset }) };
  if (entry.type === "project") return { type: "project.update", args };
  if (entry.type === "finding") {
    const finding = { ...entry.value, ...set };
    for (const key of unset) delete finding[key];
    return { type: "finding.upsert", args: { id: entry.id, finding } };
  }
  return { type: `${entry.type}.update`, args: { id: entry.id, ...args } };
}

/** The type keys each kind of type owns. */
const TYPE_KEYS = { object: "fields", enum: "values", alias: "of" };

/** The next case number out of a switch, for an edge that becomes a case. */
function nextCase(doc, entry) {
  const taken = new Set(
    Object.values(doc.canvases[entry.canvas].edges)
      .filter(edge => edge.from === entry.value.from && edge.kind === "case")
      .map(edge => String(edge.case))
  );
  let number = 1;
  while (taken.has(String(number))) number += 1;
  return number;
}

/**
 * Change an element's kind, leaving out what the new kind does not take: a node's or an edge's keys outside its new
 * schema, a type's fields, values or alias, an edge's case when it stops being one (and a new case number when it
 * becomes one).
 * @returns {Array<{ type: string, args: object }>}
 */
export function kindCommands(doc, id, kind) {
  const entry = indexOf(doc).get(id);
  if (!entry) return [];
  const { type, value } = entry;
  if (type === "catalog" && entry.collection === "types") {
    const unset = Object.entries(TYPE_KEYS)
      .filter(([owner, key]) => owner !== kind && value[key] !== undefined)
      .map(([, key]) => key);
    return [updateCommand(entry, { kind }, unset)];
  }
  if (type !== "node" && type !== "edge") return [updateCommand(entry, { kind })];
  const canvasKind = doc.canvases[entry.canvas].kind;
  const allowed = new Set(keysOf(schemaFor(type, canvasKind, kind)));
  if (type === "edge" && kind !== "case") allowed.delete("case");
  const unset = Object.keys(value).filter(key => !allowed.has(key) && !key.startsWith("x-"));
  const set =
    type === "edge" && kind === "case" && value.kind !== "case" ? { kind, case: nextCase(doc, entry) } : { kind };
  return [updateCommand(entry, set, unset)];
}

/**
 * Set one field of an element: an empty value leaves the key out; a kind changes through `kindCommands`.
 * @returns {Array<{ type: string, args: object }>}
 */
export function fieldCommands(doc, id, key, value) {
  if (key === "kind" && !isEmpty(value)) return kindCommands(doc, id, value);
  const entry = indexOf(doc).get(id);
  if (!entry) return [];
  if (isEmpty(value)) {
    // An edge without a kind is a plain step: it is no longer a case either.
    const also = key === "kind" && entry.value.case !== undefined ? ["case"] : [];
    return [updateCommand(entry, {}, [key, ...also])];
  }
  return [updateCommand(entry, { [key]: value })];
}
