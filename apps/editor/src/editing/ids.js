// New IDs for the commands of one change. Core names elements itself (prefix + camelCase name), but a change that
// creates an element and refers to it in the same batch (a state and the transition into it, an event and its use)
// must name it first.
import { buildIndex, makeId } from "statewright";

/**
 * @param {any} doc
 * @returns {{ take: (prefix: string, base: string) => string }} `take` never gives an ID the document uses, nor one
 *   it gave before.
 */
export function idsFor(doc) {
  const taken = new Set(buildIndex(doc).entries.keys());
  return {
    take(prefix, base) {
      const id = makeId(prefix, base, taken);
      taken.add(id);
      return id;
    }
  };
}
