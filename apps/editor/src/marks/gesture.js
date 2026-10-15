// Drawing and erasing marks (collaboration spec §5.1), in the level's coordinates: a pencil stroke through the points
// the pointer passed, a rectangle or an ellipse dragged (Shift: a square or a circle), a mark taken away by a click
// on it or by a drag across it. The canvas's layer turns pointer events into these calls.
import { pointToSegment, segmentDistance } from "./read";

/** The least a pencil moves before a new point is kept, and the smallest shape kept. */
const STEP = 2;
const SMALLEST = 4;
/** A label's box, roughly: characters this wide, this tall above its baseline. */
const CHARACTER = 7;
const LINE = 18;

/** A shape's box from two corners; with `square`, as wide as it is high. */
function boxFrom([x1, y1], [x2, y2], square) {
  let width = Math.abs(x2 - x1);
  let height = Math.abs(y2 - y1);
  if (square) width = height = Math.max(width, height);
  return { x: x2 < x1 ? x1 - width : x1, y: y2 < y1 ? y1 - height : y1, width, height };
}

/**
 * Begin drawing with the tool in hand at a point of the level.
 * @param {import("zustand/vanilla").StoreApi<any>} store
 * @param {string} level
 * @param {[number, number]} start
 * @param {{ step?: number }} [options] `step`: the least a pencil moves between points (2 screen pixels, in the level's
 *   units at the zoom shown).
 */
export function beginGesture(store, level, start, { step = STEP } = {}) {
  const { tool, colour } = store.getState();
  const points = [start];
  let corner = start;
  let square = false;
  const draft = () =>
    tool === "pencil" ?
      { level, kind: "stroke", colour, points: [...points] }
    : { level, kind: tool, colour, rect: boxFrom(start, corner, square) };
  return {
    /** The pointer moved: `shift` makes a square or a circle. */
    move(point, { shift = false } = {}) {
      if (tool === "pencil") {
        const [lx, ly] = points.at(-1);
        if (Math.hypot(point[0] - lx, point[1] - ly) >= step) points.push(point);
        return;
      }
      corner = point;
      square = shift;
    },
    draft,
    /** The pointer let go: the mark is kept, unless it is too small to mean anything. Its ID, or null. */
    end() {
      const mark = draft();
      if (mark.kind === "stroke" ? mark.points.length < 2 : mark.rect.width < SMALLEST && mark.rect.height < SMALLEST) {
        return null;
      }
      return store.getState().add(mark);
    }
  };
}

/** A label's box. */
const labelBox = ({ at: [x, y], text }) => ({ x, y: y - LINE + 4, width: text.length * CHARACTER, height: LINE });

/** Whether a point is on a mark, within `tolerance`. */
function hits(mark, [px, py], tolerance) {
  if (mark.kind === "stroke") {
    return mark.points
      .slice(1)
      .some((point, index) => pointToSegment([px, py], mark.points[index], point) <= tolerance);
  }
  const box = mark.kind === "label" ? labelBox(mark) : mark.rect;
  if (mark.kind === "ellipse") {
    const [cx, cy, rx, ry] = [
      box.x + box.width / 2,
      box.y + box.height / 2,
      box.width / 2 + tolerance,
      box.height / 2 + tolerance
    ];
    return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
  }
  return (
    px >= box.x - tolerance &&
    px <= box.x + box.width + tolerance &&
    py >= box.y - tolerance &&
    py <= box.y + box.height + tolerance
  );
}

/** Whether a segment crosses a mark, within `tolerance`. */
function crosses(mark, from, to, tolerance) {
  if (mark.kind === "stroke") {
    return mark.points
      .slice(1)
      .some((point, index) => segmentDistance(from, to, mark.points[index], point) <= tolerance);
  }
  if (hits(mark, from, tolerance) || hits(mark, to, tolerance)) return true;
  const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / Math.max(tolerance, 1)));
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    if (hits(mark, [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t], tolerance)) return true;
  }
  return false;
}

/** Erase the mark of this level under a point (the last drawn first): its ID, or null. */
export function eraseAt(store, level, point, tolerance) {
  const hit = [...store.getState().marks].reverse().find(mark => mark.level === level && hits(mark, point, tolerance));
  if (!hit) return null;
  store.getState().remove(hit.id);
  return hit.id;
}

/** Erase every mark of this level a drag from `from` to `to` crosses: their IDs. */
export function eraseAlong(store, level, from, to, tolerance) {
  const crossed = store
    .getState()
    .marks.filter(mark => mark.level === level && crosses(mark, from, to, tolerance))
    .map(mark => mark.id);
  for (const id of crossed) store.getState().remove(id);
  return crossed;
}
