// What a change of the document touched, level by level (AI interface spec §7.3: "The elements it created or changed"),
// read from its patches: the boxes, edges and regions it added or changed, and the boxes it moved.

/** The elements of a level a patch path names: a node, an edge or a region, or a box's position. */
function touched(path, value) {
  const [root, ...rest] = path;
  if (root === "canvases") {
    const [canvas, part, id] = rest;
    if (part === undefined)
      return { canvas, ids: value ? [...Object.keys(value.nodes ?? {}), ...Object.keys(value.edges ?? {})] : [] };
    if (["nodes", "edges", "regions"].includes(part)) {
      return { canvas, ids: id === undefined ? Object.keys(value ?? {}) : [id] };
    }
    return null;
  }
  if (root === "layout") return placed(rest, value);
  return null;
}

/** The boxes a layout patch placed, by level: a box's position, a level's, or every level's at once. */
function placed([canvases, canvas, part, id], value) {
  if (canvases === undefined) return Object.entries(value?.canvases ?? {}).map(([key, level]) => placedOn(key, level));
  if (canvases !== "canvases") return null;
  if (canvas === undefined) return Object.entries(value ?? {}).map(([key, level]) => placedOn(key, level));
  if (part === undefined) return placedOn(canvas, value);
  if (part !== "nodes") return null;
  return { canvas, ids: id === undefined ? Object.keys(value ?? {}) : [id] };
}

const placedOn = (canvas, level) => ({ canvas, ids: Object.keys(level?.nodes ?? {}) });

/**
 * The elements a change created, changed or moved, by level; those it removed are left out (they are gone), and so is
 * a property it removed from an element still there.
 * @param {Array<{ op: string, path: Array<string | number>, value?: unknown }>} patches Immer's patches of the change.
 * @returns {Record<string, string[]>} Level ID → element IDs, sorted.
 */
export function changedOf(patches) {
  const levels = {};
  for (const patch of patches) {
    if (patch.op === "remove") continue;
    for (const found of [touched(patch.path, patch.value)].flat()) {
      if (!found?.canvas || !found.ids.length) continue;
      levels[found.canvas] ??= new Set();
      for (const id of found.ids) levels[found.canvas].add(String(id));
    }
  }
  return Object.fromEntries(Object.entries(levels).map(([canvas, ids]) => [canvas, [...ids].sort()]));
}
