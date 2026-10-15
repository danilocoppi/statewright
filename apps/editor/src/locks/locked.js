// Don't touch (collaboration spec §8.2): what a batch would add, change or remove that is locked — an element locked
// itself, or anything on a locked level. Such a batch of the agent's is only proposed.

/**
 * @param {any} doc The document as it is (its locks).
 * @param {ReturnType<typeof import("@/proposals/diff").diffOf>} diff
 * @returns {Array<{ id: string, name: string }>}
 */
export function lockedBy(doc, diff) {
  if (!diff.ok) return [];
  const targets = new Set(Object.values(doc.annotations?.locks ?? {}).map(lock => lock.target));
  if (!targets.size) return [];
  const touched = new Map();
  for (const item of [...diff.added, ...diff.changed, ...diff.removed]) {
    if (targets.has(item.id) || (item.level && targets.has(item.level))) {
      touched.set(item.id, { id: item.id, name: item.name });
    }
  }
  return [...touched.values()];
}

/** The lock on an element or level, if any: its ID. */
export const lockOf = (doc, target) =>
  Object.entries(doc?.annotations?.locks ?? {}).find(([, lock]) => lock.target === target)?.[0] ?? null;
