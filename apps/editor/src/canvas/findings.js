// A finding badge's details (Core draws the badge, marked with its element and codes): which findings it shows, and
// where they show beside it. What is shown lives in a store, so Esc can close it before it does anything else.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/**
 * @typedef {{ target: string, codes: string[], rect: { left: number, top: number, right: number, bottom: number } }}
 *   ShownBadge The badge whose findings are shown: its element, its codes and where it is in the window.
 */

export const findingStore = createStore(set => ({
  /** @type {ShownBadge | null} */
  shown: null,
  /** @param {ShownBadge} badge */
  show: badge => set({ shown: badge }),
  close: () => set({ shown: null })
}));

/** Read from the store of the finding badge shown, in a component. */
export const useFindings = selector => useStore(findingStore, selector);

/**
 * The findings a badge shows: those about its element whose codes it lists, in the order Core lists them (by ID).
 * @param {any} doc
 * @param {string} target
 * @param {string[]} codes
 * @returns {Array<{ id: string, code: string, title: string, severity: string, description?: string,
 *   source?: string, evidence?: any[] }>}
 */
export function findingsOn(doc, target, codes) {
  const findings = doc.annotations?.findings ?? {};
  return Object.keys(findings)
    .sort()
    .filter(id => findings[id].targets.includes(target) && codes.includes(findings[id].code))
    .map(id => ({ id, ...findings[id] }));
}

/** Between the badge and its findings, and between them and the edges of the window. */
const GAP = 8;
const MARGIN = 8;
/** From the top of the findings to the middle of their first line, which stands level with the badge. */
const FIRST_LINE = 21;

/**
 * Where a badge's findings show, in the window: on the right of the badge, or on its left near the window's right edge
 * (on the side with more room when neither has enough); down from the badge, or up from it near the bottom edge; and
 * never past an edge.
 * @param {{ left: number, top: number, right: number, bottom: number }} badge
 * @param {{ w: number, h: number }} size
 * @param {{ w: number, h: number }} room
 * @returns {{ left: number, top: number, side: "left" | "right" }}
 */
export function besideBadge(badge, size, room) {
  const clamp = (value, max) => Math.max(MARGIN, Math.min(value, max));
  const right = room.w - MARGIN - (badge.right + GAP);
  const left = badge.left - GAP - MARGIN;
  const side = right >= size.w || right >= left ? "right" : "left";
  const x = side === "right" ? badge.right + GAP : badge.left - GAP - size.w;
  const middle = (badge.top + badge.bottom) / 2;
  const down = middle - FIRST_LINE;
  const y = down + size.h <= room.h - MARGIN ? down : middle + FIRST_LINE - size.h;
  return { left: clamp(x, room.w - MARGIN - size.w), top: clamp(y, room.h - MARGIN - size.h), side };
}
