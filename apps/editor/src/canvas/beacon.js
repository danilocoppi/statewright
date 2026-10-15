// The beacon: what a link leads to, or what an agent shows (view.reveal, view.point), rings in the accent colour for
// 2 s once it is in view — a pulse, or a still ring for someone who asks for less motion. Asked for a level, it waits
// for the canvas to show that level (it may still be opening, or being arranged), so the 2 s are all seen.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** How long the beacon lasts once lit. */
export const BEACON_MS = 2000;

/**
 * @typedef {{ canvasId: string, ids: string[] }} Asked What to light once its level is shown.
 * @typedef {{ canvasId: string, ids: string[], key: number }} Lit What rings now; `key` changes each time it is lit.
 */
export const beaconStore = createStore(() => ({
  /** @type {Asked | null} */
  asked: null,
  /** @type {Lit | null} */
  lit: null
}));

/** Read the beacon in a component: `useBeacon(state => state.lit)`. */
export const useBeacon = selector => useStore(beaconStore, selector);

let out = null;
let key = 0;

/** Light these elements of a level once the canvas shows it. */
export function beacon(canvasId, ids) {
  beaconStore.setState({ asked: { canvasId, ids } });
}

/** The canvas shows this level, in its place: what was asked for it rings now, for BEACON_MS. */
export function lightBeacon(canvasId) {
  const { asked } = beaconStore.getState();
  if (asked?.canvasId !== canvasId) return;
  clearTimeout(out);
  key += 1;
  beaconStore.setState({ asked: null, lit: { ...asked, key } });
  out = setTimeout(() => beaconStore.setState({ lit: null }), BEACON_MS);
}
