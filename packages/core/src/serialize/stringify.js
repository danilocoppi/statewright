import { documentSchema } from "../schema/document.js";

const WRAPPERS = new Set(["optional", "nullable", "default", "readonly", "nonoptional"]);

function unwrap(schema) {
  let current = schema;
  while (WRAPPERS.has(current.def.type)) current = current.def.innerType;
  return current;
}

/** Free JSON (expressions, raw JSON Schema, x- values): keys sorted alphabetically. */
function sortJson(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortJson);
  const out = {};
  for (const key of Object.keys(value).sort()) if (value[key] !== undefined) out[key] = sortJson(value[key]);
  return out;
}

function pickOption(schema, value) {
  const { options, discriminator } = schema.def;
  if (discriminator) {
    return options.find(option => unwrap(option).def.shape[discriminator].def.values.includes(value[discriminator]));
  }
  return options.find(option => option.safeParse(value).success);
}

/**
 * Rebuild `value` with keys in schema order (spec §8.3): object keys in declared order, then x- keys sorted;
 * ID-keyed maps sorted by key; arrays keep their order; free JSON sorted alphabetically.
 */
function order(schema, value) {
  if (value === null || typeof value !== "object") return value;
  const target = unwrap(schema);
  switch (target.def.type) {
    case "array":
      return value.map(item => order(target.def.element, item));
    case "tuple":
      return value.map((item, index) => order(target.def.items[index] ?? target.def.rest, item));
    case "record": {
      // Integer-like keys (HTTP status codes) are always enumerated first by JavaScript; that is still deterministic.
      const out = {};
      for (const key of Object.keys(value).sort()) out[key] = order(target.def.valueType, value[key]);
      return out;
    }
    case "object": {
      const shape = target.def.shape;
      const out = {};
      for (const key of Object.keys(shape)) {
        if (value[key] !== undefined) out[key] = order(shape[key], value[key]);
      }
      for (const key of Object.keys(value)
        .filter(key => !Object.hasOwn(shape, key))
        .sort()) {
        if (value[key] !== undefined) out[key] = sortJson(value[key]);
      }
      return out;
    }
    case "union": {
      const option = pickOption(target, value);
      return option ? order(option, value) : sortJson(value);
    }
    default:
      return sortJson(value);
  }
}

/** JSON text of free JSON at a depth: as JSON.stringify with a 2-space indent would write it there. */
const freeText = (value, depth) => JSON.stringify(sortJson(value), null, 2).replaceAll("\n", `\n${"  ".repeat(depth)}`);

/** Whether a key is an array index, which JavaScript enumerates first, in numeric order. */
const isIndex = key => String(Number(key) >>> 0) === key && key !== "4294967295";

/** Keys in the order an object built by inserting them would enumerate them. */
const enumerated = keys => [
  ...keys.filter(isIndex).sort((a, b) => Number(a) - Number(b)),
  ...keys.filter(key => !isIndex(key))
];

/** `{ … }` or `[ … ]` of entries at a depth, as JSON.stringify with a 2-space indent writes them. */
function block(open, close, entries, depth) {
  if (!entries.length) return `${open}${close}`;
  const inner = "  ".repeat(depth + 1);
  return `${open}\n${inner}${entries.join(`,\n${inner}`)}\n${"  ".repeat(depth)}${close}`;
}

/**
 * Texts of frozen values, kept per schema and depth: writing an edited document revisits only the parts it changed
 * (performance spec §3 P3). The text is `JSON.stringify(order(schema, value), null, 2)` at that depth.
 */
const keptText = new WeakMap();

function write(schema, value, depth) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (!Object.isFrozen(value)) return writeFresh(schema, value, depth);
  let bySchema = keptText.get(value);
  if (!bySchema) keptText.set(value, (bySchema = new Map()));
  let byDepth = bySchema.get(schema);
  if (!byDepth) bySchema.set(schema, (byDepth = new Map()));
  let text = byDepth.get(depth);
  if (text === undefined) byDepth.set(depth, (text = writeFresh(schema, value, depth)));
  return text;
}

function writeFresh(schema, value, depth) {
  const target = unwrap(schema);
  switch (target.def.type) {
    case "array":
      return block(
        "[",
        "]",
        value.map(item => write(target.def.element, item, depth + 1)),
        depth
      );
    case "tuple":
      return block(
        "[",
        "]",
        value.map((item, index) => write(target.def.items[index] ?? target.def.rest, item, depth + 1)),
        depth
      );
    case "record": {
      const keys = enumerated(Object.keys(value).sort());
      const entries = keys
        .filter(key => value[key] !== undefined)
        .map(key => `${JSON.stringify(key)}: ${write(target.def.valueType, value[key], depth + 1)}`);
      return block("{", "}", entries, depth);
    }
    case "object": {
      const shape = target.def.shape;
      const declared = Object.keys(shape).filter(key => value[key] !== undefined);
      const extra = Object.keys(value)
        .filter(key => !Object.hasOwn(shape, key) && value[key] !== undefined)
        .sort();
      const entries = enumerated([...declared, ...extra]).map(key =>
        Object.hasOwn(shape, key) ?
          `${JSON.stringify(key)}: ${write(shape[key], value[key], depth + 1)}`
        : `${JSON.stringify(key)}: ${freeText(value[key], depth + 1)}`
      );
      return block("{", "}", entries, depth);
    }
    case "union": {
      const option = pickOption(target, value);
      return option ? write(option, value, depth) : freeText(value, depth);
    }
    default:
      return freeText(value, depth);
  }
}

/**
 * Deterministic file form of a document: schema key order, 2-space indent, trailing newline.
 * @param {object} doc A valid document.
 * @returns {string}
 */
export function stringify(doc) {
  return `${write(documentSchema, doc, 0)}\n`;
}

/** The file form as built before parts were kept (tests compare the two). */
export function stringifyWhole(doc) {
  return `${JSON.stringify(order(documentSchema, doc), null, 2)}\n`;
}
