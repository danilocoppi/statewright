// What keeps an edit fast on a level of hundreds of boxes (spec §9: an edit on the canvas within 50 ms): each
// projection makes new objects for every part, but React Flow redraws a node or an edge only when its object changes —
// so a part that did not change keeps the object it had, as `lib/derived.js` keeps what is worked out per document.

/** Whether two values are the same, all the way down (parts are plain data: numbers, strings, arrays, objects). */
export function same(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => same(a[key], b[key]));
}

/**
 * A keeper of parts: given the parts of a projection, it gives each back as the object it gave last time when nothing
 * about the part changed. It holds only what it gave back last, so a canvas keeps one for its boxes and one for its
 * arrows, and what was shown on another level (or of another document) is let go.
 * @returns {<T extends { id: string }>(parts: T[]) => T[]}
 */
export function steadier() {
  let shown = new Map();
  return parts => {
    const now = new Map();
    const kept = parts.map(part => {
      const before = shown.get(part.id);
      const keep = before && same(before, part) ? before : part;
      now.set(part.id, keep);
      return keep;
    });
    shown = now;
    return kept;
  };
}

/** Each node as shown now (selected, moved, a connection's start or end), by the node it is made from. */
const dressed = new WeakMap();

/**
 * The node as shown now, made once for each state it is in.
 * @param {object} node
 * @param {string} state What the shown node depends on, as a key.
 * @param {() => object} dress Makes the shown node.
 */
export function dressedAs(node, state, dress) {
  const kept = dressed.get(node);
  if (kept?.state === state) return kept.node;
  const made = dress();
  dressed.set(node, { state, node: made });
  return made;
}
