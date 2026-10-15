// Reading a mark (collaboration spec §5.2): what the person drew, turned into the elements it means — those a shape or
// a closed stroke surrounds, those its line crosses, the two a stroke joins, the one a label stands by — so the agent
// knows where without guessing. Pure geometry in the level's own coordinates (Core's figure, which the canvas draws).

/** @typedef {{ id: string, name: string, x: number, y: number, width: number, height: number }} Box */
/** @typedef {{ id: string, name: string, points: Array<[number, number]> }} Line */

/** How near a stroke's ends must come to close it, and how far a label reaches. */
const CLOSE = 24;
const NEAR = 48;
/** How near a line must pass to touch an edge. */
const TOUCH = 6;
/** How many points an ellipse's outline is drawn with. */
const ELLIPSE_POINTS = 64;

const named = ({ id, name }) => ({ id, name });
const centreOf = box => [box.x + box.width / 2, box.y + box.height / 2];

/** Whether two segments cross or touch. */
function segmentsMeet([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const side = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = side(cx, cy, dx, dy, ax, ay);
  const d2 = side(cx, cy, dx, dy, bx, by);
  const d3 = side(ax, ay, bx, by, cx, cy);
  const d4 = side(ax, ay, bx, by, dx, dy);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return segmentDistance([ax, ay], [bx, by], [cx, cy], [dx, dy]) < 1e-6;
}

/** The distance from a point to a segment. */
export function pointToSegment([px, py], [ax, ay], [bx, by]) {
  const length = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / length)) : 0;
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

/** The distance between two segments (zero when they cross). */
export function segmentDistance(a, b, c, d) {
  return Math.min(pointToSegment(a, c, d), pointToSegment(b, c, d), pointToSegment(c, a, b), pointToSegment(d, a, b));
}

const inBox = ([x, y], box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;

/** Whether a segment meets a box: an end inside, or crossing a side. */
function segmentMeetsBox(a, b, box) {
  if (inBox(a, box) || inBox(b, box)) return true;
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x + box.width, box.y + box.height],
    [box.x, box.y + box.height]
  ];
  return corners.some((corner, index) => segmentsMeet(a, b, corner, corners[(index + 1) % 4]));
}

/** The segments of a polyline. */
const segmentsOf = points => points.slice(1).map((point, index) => [points[index], point]);

/** Whether a polygon holds a point: nonzero winding, so a scribble's every loop counts. */
function windingHolds(polygon, [x, y]) {
  let winding = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const [ax, ay] = polygon[index];
    const [bx, by] = polygon[(index + 1) % polygon.length];
    const across = (bx - ax) * (y - ay) - (x - ax) * (by - ay);
    if (ay <= y) {
      if (by > y && across > 0) winding += 1;
    } else if (by <= y && across < 0) winding -= 1;
  }
  return winding !== 0;
}

/** Whether a stroke closes: its ends within 24 units, or it turns at least 300° on its way. */
export function closes(points) {
  if (points.length < 3) return false;
  const [first, last] = [points[0], points.at(-1)];
  if (Math.hypot(last[0] - first[0], last[1] - first[1]) <= CLOSE) return true;
  let turned = 0;
  for (let index = 2; index < points.length; index += 1) {
    const [ax, ay] = points[index - 2];
    const [bx, by] = points[index - 1];
    const [cx, cy] = points[index];
    let turn = Math.atan2(cy - by, cx - bx) - Math.atan2(by - ay, bx - ax);
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    turned += turn;
  }
  return Math.abs(turned) >= (300 * Math.PI) / 180;
}

/** An ellipse's outline, as a polygon. */
function ellipseOutline({ x, y, width, height }) {
  const [cx, cy, rx, ry] = [x + width / 2, y + height / 2, width / 2, height / 2];
  return Array.from({ length: ELLIPSE_POINTS }, (_, index) => {
    const angle = (2 * Math.PI * index) / ELLIPSE_POINTS;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
  });
}

const rectOutline = ({ x, y, width, height }) => [
  [x, y],
  [x + width, y],
  [x + width, y + height],
  [x, y + height]
];

/**
 * What a closed outline means: the boxes whose centres and the edges whose every point it holds; the others its
 * outline crosses.
 */
function readOutline(outline, holds, { boxes, lines }) {
  const ring = [...outline, outline[0]];
  const sides = segmentsOf(ring);
  const encloses = [];
  const touches = [];
  for (const box of boxes) {
    if (holds(centreOf(box))) encloses.push(named(box));
    else if (sides.some(([a, b]) => segmentMeetsBox(a, b, box))) touches.push(named(box));
  }
  for (const line of lines) {
    if (line.points.every(point => holds(point))) encloses.push(named(line));
    else if (sides.some(([a, b]) => segmentsOf(line.points).some(([c, d]) => segmentsMeet(a, b, c, d)))) {
      touches.push(named(line));
    }
  }
  return { encloses, touches };
}

/** What an open line crosses: boxes it passes through, edges it passes within 6 units of. */
function readLine(points, { boxes, lines }, leave = new Set()) {
  const segments = segmentsOf(points);
  const touches = [];
  for (const box of boxes) {
    if (!leave.has(box.id) && segments.some(([a, b]) => segmentMeetsBox(a, b, box))) touches.push(named(box));
  }
  for (const line of lines) {
    const near = segments.some(([a, b]) =>
      segmentsOf(line.points).some(([c, d]) => segmentDistance(a, b, c, d) <= TOUCH)
    );
    if (near) touches.push(named(line));
  }
  return touches;
}

/** Drop what is empty, so a mark over nothing reads `{}`. */
const filled = read =>
  Object.fromEntries(Object.entries(read).filter(([, value]) => (Array.isArray(value) ? value.length : value)));

/**
 * @param {{ kind: "rectangle" | "ellipse", rect: { x: number, y: number, width: number, height: number } } |
 *   { kind: "stroke", points: Array<[number, number]> } | { kind: "label", at: [number, number], text: string }} mark
 * @param {{ boxes: Box[], lines: Line[] }} geometry The level's boxes and edges.
 * @returns {{ encloses?: Array<{ id: string, name: string }>, touches?: Array<{ id: string, name: string }>,
 *   from?: { id: string, name: string }, to?: { id: string, name: string }, near?: { id: string, name: string } }}
 */
export function readMark(mark, geometry) {
  if (mark.kind === "rectangle") {
    const { rect } = mark;
    return filled(readOutline(rectOutline(rect), point => inBox(point, rect), geometry));
  }
  if (mark.kind === "ellipse") {
    const { x, y, width, height } = mark.rect;
    const [cx, cy, rx, ry] = [x + width / 2, y + height / 2, width / 2, height / 2];
    const holds = ([px, py]) => rx > 0 && ry > 0 && ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
    return filled(readOutline(ellipseOutline(mark.rect), holds, geometry));
  }
  if (mark.kind === "label") {
    let best = null;
    for (const box of geometry.boxes) {
      const [px, py] = mark.at;
      const dx = Math.max(box.x - px, 0, px - (box.x + box.width));
      const dy = Math.max(box.y - py, 0, py - (box.y + box.height));
      const distance = Math.hypot(dx, dy);
      if (distance <= NEAR && (!best || distance < best.distance)) best = { box, distance };
    }
    return best ? { near: named(best.box) } : {};
  }
  const { points } = mark;
  if (closes(points)) return filled(readOutline(points, point => windingHolds(points, point), geometry));
  const from = geometry.boxes.find(box => inBox(points[0], box));
  const to = geometry.boxes.find(box => inBox(points.at(-1), box));
  if (from && to && from.id !== to.id) {
    const touches = readLine(points, geometry, new Set([from.id, to.id]));
    return filled({ from: named(from), to: named(to), touches });
  }
  return filled({ touches: readLine(points, geometry) });
}
