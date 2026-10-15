import { isDeepFrozen } from "../frozen.js";

/**
 * RFC 8785 (JSON Canonicalization Scheme) form of a JSON value: no whitespace, object keys sorted by
 * UTF-16 code units, numbers and strings serialized as ECMAScript JSON.stringify does.
 * Object properties whose value is `undefined` are skipped, as JSON.stringify does.
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalize(value) {
  if (value !== null && typeof value === "object") {
    const known = kept.get(value);
    if (known !== undefined) return known;
    const text = canonicalOf(value);
    if (isDeepFrozen(value)) kept.set(value, text);
    return text;
  }
  return canonicalOf(value);
}

/**
 * Canonical forms of objects frozen all the way down (what applyBatch returns), kept with them: hashing an edited document revisits
 * only the parts it changed (performance spec §3 P3).
 */
const kept = new WeakMap();

function canonicalOf(value) {
  if (value === null || typeof value !== "object") {
    if (value === undefined || typeof value === "function" || typeof value === "symbol") {
      throw new TypeError(`Cannot canonicalize a value of type ${typeof value}`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new TypeError(`Cannot canonicalize the non-finite number ${value}`);
    }
    if (typeof value === "bigint") throw new TypeError("Cannot canonicalize a bigint");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => (item === undefined ? "null" : canonicalize(item))).join(",")}]`;
  }
  const keys = Object.keys(value)
    .filter(key => value[key] !== undefined)
    .sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}
