// The details of what the pointer rests on, over the canvas (a finding badge, a Problems marker): what is shown, each
// kind in a store of its own, so Esc can close them before it does anything else; and where they show beside it.
import { createStore } from "zustand/vanilla";

/**
 * @typedef {{ target: string, rect: { left: number, top: number, right: number, bottom: number } } & object}
 *   Shown What the pointer rests on: its element, where it is in the window, and what else its markup says.
 */

/** Every store of details, to know whether any is shown. */
const stores = new Set();

/** A store of the details of one kind of target: which one is shown, if any. */
export function createHoverStore() {
  const store = createStore(set => ({
    /** @type {Shown | null} */
    shown: null,
    /** @param {Shown} target */
    show: target => set({ shown: target }),
    close: () => set({ shown: null })
  }));
  stores.add(store);
  return store;
}

/** Whether the details of anything the pointer rests on are shown: Esc is theirs (EditorPage leaves it to them). */
export const hoverShown = () => [...stores].some(store => store.getState().shown !== null);

/** Between the target and its details, and between them and the edges of the window. */
const GAP = 8;
const MARGIN = 8;
/** From the top of the details to the middle of their first line, which stands level with the target. */
const FIRST_LINE = 21;

/**
 * Where the details show, in the window: on the right of their target, or on its left near the window's right edge (on
 * the side with more room when neither has enough); down from the target, or up from it near the bottom edge; and
 * never past an edge.
 * @param {{ left: number, top: number, right: number, bottom: number }} target
 * @param {{ w: number, h: number }} size
 * @param {{ w: number, h: number }} room
 * @returns {{ left: number, top: number, side: "left" | "right" }}
 */
export function besideTarget(target, size, room) {
  const clamp = (value, max) => Math.max(MARGIN, Math.min(value, max));
  const right = room.w - MARGIN - (target.right + GAP);
  const left = target.left - GAP - MARGIN;
  const side = right >= size.w || right >= left ? "right" : "left";
  const x = side === "right" ? target.right + GAP : target.left - GAP - size.w;
  const middle = (target.top + target.bottom) / 2;
  const down = middle - FIRST_LINE;
  const y = down + size.h <= room.h - MARGIN ? down : middle + FIRST_LINE - size.h;
  return { left: clamp(x, room.w - MARGIN - size.w), top: clamp(y, room.h - MARGIN - size.h), side };
}
