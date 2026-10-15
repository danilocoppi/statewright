// Whether a value can never change: frozen, and everything in it too (performance spec §3 P3). What Core keeps for a
// value — its index, references, canonical form, file text — is kept only then: an object frozen at its top alone can
// still change inside. Known answers are remembered, so each object is looked at once; a value frozen all the way down
// stays so.
import { isDraft } from "immer";

const deep = new WeakSet();

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isDeepFrozen(value) {
  if (value === null || typeof value !== "object") return true;
  if (deep.has(value)) return true;
  if (!Object.isFrozen(value) || isDraft(value)) return false;
  for (const key of Object.keys(value)) if (!isDeepFrozen(value[key])) return false;
  deep.add(value);
  return true;
}
