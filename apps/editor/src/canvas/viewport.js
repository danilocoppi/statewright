// How the canvas frames levels.

/** A level shown for the first time is framed whole, never above 100 %. */
export const FIT = { padding: 0.12, maxZoom: 1 };

/** Zoom limits: far enough out for the widest figures, close enough to read the smallest text. */
export const ZOOM = { min: 0.1, max: 4 };

/**
 * The inspector island on the right (spec §6.1): its width — the least it can be, and where it starts — and its margin
 * from the window's edge. The person can widen it up to `max` px or `share` of the window, whichever is less; from the
 * keyboard, by `step` px at a time.
 */
export const INSPECTOR = { width: 340, max: 720, share: 0.6, step: 16, margin: 16 };

/**
 * How narrow and how wide the inspector can be in a window `windowWidth` px wide; never under its own width.
 * @param {number} windowWidth
 * @returns {{ min: number, max: number }}
 */
export function inspectorLimits(windowWidth) {
  const { width, max, share } = INSPECTOR;
  return { min: width, max: Math.max(width, Math.min(max, Math.floor(windowWidth * share))) };
}

/**
 * The inspector's width in a window `windowWidth` px wide: the width asked for, in whole pixels within its limits —
 * 340 px when it is not a width at all (nothing kept yet, or something else in its place).
 * @param {unknown} width
 * @param {number} windowWidth
 * @returns {number}
 */
export function inspectorWidth(width, windowWidth) {
  const { min, max } = inspectorLimits(windowWidth);
  if (typeof width !== "number" || !Number.isFinite(width)) return min;
  return Math.min(max, Math.max(min, Math.round(width)));
}

/**
 * What the inspector takes on the right of the canvas: its width, its margin and some air.
 * @param {number} [width] The inspector's width.
 */
export const inspectorSpace = (width = INSPECTOR.width) => width + INSPECTOR.margin + 24;

/**
 * The stage's room around a level (simulator spec §7.1, mockup 05): above it the scenario's name and the levels down to
 * it, below it the step's card, in pixels.
 */
export const STAGE_ROOM = { top: 112, bottom: 264, side: 64 };

/** What the tool dock takes on the left (its 16 px margin, 40 px and as much air), which a panel leaves free. */
export const DOCK_SPACE = 16 + 40 + 16;

/**
 * How a level is framed whole on a canvas `width` px wide: as FIT, with more room around it where the canvas is narrow,
 * so its left edge stays clear of the tool dock. React Flow leaves `width · padding / (2 · (1 + padding))` on each side
 * of a level as wide as the canvas allows; that is DOCK_SPACE when `padding` is `2 · DOCK_SPACE / (width − 2 · DOCK_SPACE)`.
 * `beside`: the simulation panel is open on the right (simulator spec §6.2) and the tool dock is not shown: the level is
 * framed in the room left of the panel. `stage`: the scenario is presented (simulator spec §7.1): the level is framed
 * between the scenario's name and the step's card, a small one enlarged up to 150 %. `inspector`: the panel's width.
 * @param {number} width The canvas's width in pixels (0 while it is not measured).
 * @param {{ beside?: boolean, stage?: boolean, inspector?: number }} [options]
 */
export function fitFor(width, { beside = false, stage = false, inspector = INSPECTOR.width } = {}) {
  if (stage) {
    const { top, bottom, side } = STAGE_ROOM;
    return {
      ...FIT,
      maxZoom: 1.5,
      padding: { top: `${top}px`, bottom: `${bottom}px`, left: `${side}px`, right: `${side}px` }
    };
  }
  if (beside) {
    return {
      ...FIT,
      padding: { top: FIT.padding, bottom: FIT.padding, left: FIT.padding, right: `${inspectorSpace(inspector)}px` }
    };
  }
  const room = width - 2 * DOCK_SPACE;
  if (room <= 0) return FIT;
  return { ...FIT, padding: Math.max(FIT.padding, (2 * DOCK_SPACE) / room) };
}

/** The air kept on the left when the view slides. */
const AIR = 24;

/**
 * How far the view slides left so a box the inspector shows is not under it (spec §6.1): 0 when it is clear, and never
 * so far that the box's left edge leaves the screen.
 * @param {number} left The box's left edge on the canvas, in screen pixels.
 * @param {number} right Its right edge.
 * @param {number} width The canvas's width.
 * @param {number} [inspector] The inspector's width.
 * @returns {number}
 */
export function clearOfInspector(left, right, width, inspector = INSPECTOR.width) {
  const under = right - (width - inspectorSpace(inspector));
  if (under <= 0) return 0;
  return Math.max(0, Math.min(under, left - AIR));
}
