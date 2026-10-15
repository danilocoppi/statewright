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

/**
 * Deterministic file form of a document: schema key order, 2-space indent, trailing newline.
 * @param {object} doc A valid document.
 * @returns {string}
 */
export function stringify(doc) {
  return `${JSON.stringify(order(documentSchema, doc), null, 2)}\n`;
}
