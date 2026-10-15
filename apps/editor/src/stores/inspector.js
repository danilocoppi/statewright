// The inspector's width (spec §6.1): the person widens it from its left edge, and it is remembered in this browser for
// every project, like the theme. What is shown stays within the window's limits (viewport.js), and so do the panels and
// the canvas that make room for it: the simulation panel in its place, the Problems panel beside it.
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { inspectorWidth, INSPECTOR } from "@/canvas/viewport";
import { APP } from "@/config/app";

export const inspectorWidthStore = create()(
  persist(
    set => ({
      width: INSPECTOR.width,
      /** Widen or narrow the inspector, within the window's limits. @param {number} width */
      setWidth: width => set({ width: inspectorWidth(width, window.innerWidth) })
    }),
    { name: `${APP.storagePrefix}:inspector`, partialize: state => ({ width: state.width }) }
  )
);

const onResize = notify => {
  window.addEventListener("resize", notify);
  return () => window.removeEventListener("resize", notify);
};

/** The inspector's width now, outside React (the canvas framing a level, sliding a box clear of it). */
export const currentInspectorWidth = () => inspectorWidth(inspectorWidthStore.getState().width, window.innerWidth);

/** The window's width, followed as it is resized. */
export const useWindowWidth = () => useSyncExternalStore(onResize, () => window.innerWidth);

/** The inspector's width, as shown in this window: narrower while the window is too narrow for the one kept. */
export function useInspectorWidth() {
  const kept = inspectorWidthStore(state => state.width);
  return inspectorWidth(kept, useWindowWidth());
}
