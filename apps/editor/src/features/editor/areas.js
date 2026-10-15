// F6 and ⇧F6 move the focus between the areas of the editor (spec §9: every action reachable by keyboard), as in a
// desktop app: the islands across the top, the panels on the right, the tools, the level itself and its zoom — without
// passing through every box of the level on the way.

/** The areas, in the order F6 visits them; each is marked `data-area` where it is drawn. */
export const AREAS = [
  "project",
  "levels",
  "actions",
  "problems",
  "simulation",
  "inspector",
  "tools",
  "canvas",
  "zoom",
  "conversation"
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/** Where the focus lands in an area: on the level, its selected box (or its first); elsewhere, the first control. */
function entryOf(area) {
  if (area.dataset.area === "canvas")
    return (
      area.querySelector(".react-flow__node.selected[tabindex='0']") ??
      area.querySelector(".react-flow__node[tabindex='0']")
    );
  return area.querySelector(FOCUSABLE);
}

/**
 * Give the focus to the next area that is shown and has something to focus (the previous one with `back`).
 * @param {boolean} [back]
 * @param {Document} [root]
 * @returns {boolean} whether the focus moved
 */
export function moveToArea(back = false, root = document) {
  // Only the areas shown (a narrow window leaves the levels out), with something to focus.
  const areas = AREAS.flatMap(name => [...root.querySelectorAll(`[data-area="${name}"]`)]).filter(
    area => (area.checkVisibility?.() ?? true) && entryOf(area)
  );
  if (!areas.length) return false;
  // The innermost area holding the focus (the zoom island is drawn inside the level's).
  const active = root.activeElement;
  const here = areas.findIndex(
    area =>
      area.contains(active) && !areas.some(inner => inner !== area && area.contains(inner) && inner.contains(active))
  );
  const step = back ? -1 : 1;
  const next =
    here === -1 ?
      back ? areas.length - 1
      : 0
    : (here + step + areas.length) % areas.length;
  entryOf(areas[next]).focus();
  return true;
}
