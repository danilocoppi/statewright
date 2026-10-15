// Values typed by a person for a run (simulator spec §6.2): starting context, a flow's input, an event's payload. A
// catalog type becomes fields — one per field of an object type, nested objects as groups — each read from what was
// typed into the JSON value the engine is given. What cannot be read is said, and the value is not used.
import { parseDuration } from "@/editing/triggers";

/** How deep nested object types are drawn; past it, a field takes JSON. */
const DEPTH = 4;

/**
 * @typedef {{ name: string, kind: "text" | "number" | "integer" | "boolean" | "date" | "datetime" | "duration" |
 *   "choice" | "json" | "group", required: boolean, description?: string, options?: string[], fields?: Field[] }} Field
 */

/** The type a type ID or primitive name stands for, aliases followed. */
function resolve(doc, ref, seen = new Set()) {
  const type = doc.catalog.types[ref];
  if (!type || seen.has(ref)) return { primitive: type ? "json" : ref };
  if (type.kind === "alias" && type.of) return resolve(doc, type.of, new Set([...seen, ref]));
  return { type };
}

const PRIMITIVE = {
  string: "text",
  uuid: "text",
  email: "text",
  url: "text",
  integer: "integer",
  number: "number",
  decimal: "number",
  boolean: "boolean",
  date: "date",
  datetime: "datetime",
  duration: "duration",
  json: "json"
};

/**
 * The fields of an object type, or null when the type is not one a form can show (no fields, an enum, a raw JSON
 * Schema): then the value is typed as JSON.
 * @param {any} doc
 * @param {string | null | undefined} ref A type ID.
 * @returns {Field[] | null}
 */
export function fieldsOf(doc, ref, depth = 0) {
  if (!ref) return null;
  const { type } = resolve(doc, ref);
  if (!type || type.kind !== "object" || type.jsonSchema !== undefined || !type.fields?.length) return null;
  return type.fields.map(field => fieldOf(doc, field, depth));
}

function fieldOf(doc, field, depth) {
  const base = {
    name: field.name,
    required: Boolean(field.required),
    ...(field.description ? { description: field.description } : {})
  };
  if (field.list) return { ...base, kind: "json" };
  const { type, primitive } = resolve(doc, field.type);
  if (primitive) return { ...base, kind: PRIMITIVE[primitive] ?? "json" };
  if (type.kind === "enum" && type.values?.length) {
    return { ...base, kind: "choice", options: type.values.map(item => item.value) };
  }
  const nested = depth < DEPTH ? fieldsOf(doc, field.type, depth + 1) : null;
  return nested ? { ...base, kind: "group", fields: nested } : { ...base, kind: "json" };
}

const DATE = /^(\d{4}-\d{2}-\d{2})$/;
const DATETIME = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(?:\.\d+)?Z?$/;

/** A date and time typed as `2026-01-05 09:00` (UTC), as the format writes it (`2026-01-05T09:00:00Z`); null if not one. */
export function parseInstant(text) {
  const match = DATETIME.exec(text.trim());
  if (!match) return null;
  const iso = `${match[1]}T${match[2]}${match[3] ?? ":00"}Z`;
  return Number.isNaN(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 19) !== iso.slice(0, 19) ? null : iso;
}

/** An instant as it is typed: `2026-01-05 09:00` (seconds only when there are some). */
export function instantText(iso) {
  const [date, time] = iso.replace(/Z$/, "").split("T");
  return `${date} ${time.endsWith(":00") ? time.slice(0, 5) : time}`;
}

/** When a run starts by default (spec §6.2): now, rounded to the hour, in UTC. */
export function defaultStart(now = Date.now()) {
  const hour = 3_600_000;
  return new Date(Math.round(now / hour) * hour).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * What a field's text gives: its value, nothing (empty: not set), or what is wrong with it.
 * @param {Field} field
 * @param {string} text
 * @returns {{ ok: true, value?: unknown } | { ok: false, error: "number" | "integer" | "date" | "datetime" |
 *   "duration" | "json" }}
 */
export function readField(field, text) {
  const typed = text.trim();
  if (typed === "") return { ok: true };
  switch (field.kind) {
    case "text":
    case "choice":
      return { ok: true, value: text };
    case "boolean":
      return { ok: true, value: typed === "true" };
    case "number":
    case "integer": {
      const value = Number(typed);
      if (!Number.isFinite(value)) return { ok: false, error: "number" };
      if (field.kind === "integer" && !Number.isInteger(value)) return { ok: false, error: "integer" };
      return { ok: true, value };
    }
    case "date":
      return DATE.test(typed) && parseInstant(`${typed} 00:00`) ?
          { ok: true, value: typed }
        : { ok: false, error: "date" };
    case "datetime": {
      const value = parseInstant(typed);
      return value ? { ok: true, value } : { ok: false, error: "datetime" };
    }
    case "duration": {
      const value = parseDuration(typed);
      return value ? { ok: true, value } : { ok: false, error: "duration" };
    }
    default:
      try {
        return { ok: true, value: JSON.parse(typed) };
      } catch {
        return { ok: false, error: "json" };
      }
  }
}

/**
 * The value of a form: an object with the fields that were set, and the errors by field path (`address.city`).
 * @param {Field[]} fields
 * @param {Record<string, string>} texts What was typed, by field path.
 * @returns {{ value: object, errors: Record<string, string> }}
 */
export function readForm(fields, texts, prefix = "") {
  const value = {};
  const errors = {};
  for (const field of fields) {
    const path = `${prefix}${field.name}`;
    if (field.kind === "group") {
      const inner = readForm(field.fields, texts, `${path}.`);
      if (Object.keys(inner.value).length) value[field.name] = inner.value;
      Object.assign(errors, inner.errors);
      continue;
    }
    const read = readField(field, texts[path] ?? "");
    if (!read.ok) errors[path] = read.error;
    else if (read.value !== undefined) value[field.name] = read.value;
  }
  return { value, errors };
}
