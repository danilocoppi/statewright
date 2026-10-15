import { ID_PREFIXES } from "./constants.js";

const PREFIXES = Object.values(ID_PREFIXES);

/** Matches any Statewright ID (spec §8.2). */
export const ID_PATTERN = new RegExp(`^(${PREFIXES.join("|")})_[A-Za-z0-9]+$`);

/**
 * Regular expression matching IDs with one of the given prefixes.
 * @param {...string} prefixes
 */
export function idPatternFor(...prefixes) {
  return new RegExp(`^(${prefixes.join("|")})_[A-Za-z0-9]+$`);
}

/** @param {unknown} value */
export function isId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/**
 * Prefix of an ID (`"evt"` for `"evt_payinConfirmed"`), or null when the value is not an ID.
 * @param {unknown} value
 */
export function prefixOf(value) {
  if (typeof value !== "string") return null;
  const match = ID_PATTERN.exec(value);
  return match ? match[1] : null;
}

/**
 * camelCase of the ASCII-folded words of a name: "payin.confirmed" → "payinConfirmed",
 * "POST /orders" → "postOrders", "Expiry clock" → "expiryClock", "FORWARD RAIL" → "forwardRail".
 * @param {string} name
 */
export function toCamel(name) {
  const ascii = String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  const words = ascii.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words
    .map((word, index) => {
      // Words written in capitals ("POST", "RAIL") are treated as ordinary words.
      const plain = word === word.toUpperCase() ? word.toLowerCase() : word;
      return index === 0 ? plain[0].toLowerCase() + plain.slice(1) : plain[0].toUpperCase() + plain.slice(1);
    })
    .join("");
}

/**
 * New ID for an element: prefix + camelCase(base), with a numeric suffix on collision.
 * @param {string} prefix One of ID_PREFIXES.
 * @param {string} base Usually the element name; falls back to "item".
 * @param {{ has(id: string): boolean }} taken IDs already in use.
 */
export function makeId(prefix, base, taken) {
  const root = `${prefix}_${toCamel(base) || "item"}`;
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
