// Don't touch (collaboration spec §8.2): what a batch would add, change or remove that is locked — an element locked
// itself, anything in a locked region or on a locked level (moves too), or a lock itself. Such a batch of the agent's is
// only proposed.
import { indexOf } from "@/lib/derived";

/** The region a node stands in, in a document. */
const regionOf = (doc, item) => (item.level ? doc?.canvases?.[item.level]?.nodes?.[item.id]?.region : undefined);

/**
 * @param {any} doc The document as it is (its locks).
 * @param {ReturnType<typeof import("@/proposals/diff").diffOf>} diff
 * @returns {Array<{ id: string, name: string }>}
 */
export function lockedBy(doc, diff) {
  if (!diff.ok) return [];
  const locks = { ...(doc.annotations?.locks ?? {}), ...(diff.preview.annotations?.locks ?? {}) };
  const targets = new Set(Object.values(doc.annotations?.locks ?? {}).map(lock => lock.target));
  const nameOf = id => indexOf(doc).get(id)?.value?.name ?? id;
  const touched = new Map();
  for (const item of [...diff.added, ...diff.changed, ...diff.removed, ...(diff.moved ?? [])]) {
    // The locks are the person's own: adding, changing or removing one is only proposed.
    if (item.id.startsWith("lck_")) {
      touched.set(item.id, { id: item.id, name: `the lock on ${nameOf(locks[item.id]?.target)}` });
      continue;
    }
    const held =
      targets.has(item.id) ||
      (item.level && targets.has(item.level)) ||
      targets.has(regionOf(doc, item)) ||
      targets.has(regionOf(diff.preview, item));
    if (held) touched.set(item.id, { id: item.id, name: item.name });
  }
  return [...touched.values()];
}

/** The lock on an element or level, if any: its ID. */
export const lockOf = (doc, target) =>
  Object.entries(doc?.annotations?.locks ?? {}).find(([, lock]) => lock.target === target)?.[0] ?? null;
