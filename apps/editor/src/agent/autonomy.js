// Working without asking (collaboration spec §7): the person lets the agent change the design without stopping to
// confirm — what it proposes or removes is applied, each change still the agent's and undone in one Undo, and what the
// person locked still only proposed. Their choice, kept in this browser across pairings.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { APP } from "@/config/app";

/** Where the choice is kept. */
export const AUTONOMY_KEY = `${APP.storagePrefix}:autonomous`;

/**
 * @param {{ storage?: Storage }} [options]
 */
export function createAutonomy({ storage = globalThis.localStorage } = {}) {
  const kept = (() => {
    try {
      return storage?.getItem(AUTONOMY_KEY) === "on";
    } catch {
      return false;
    }
  })();
  return createStore(set => ({
    on: kept,
    /** Turn it on or off, and keep it so. */
    set(on) {
      set({ on });
      try {
        storage?.setItem(AUTONOMY_KEY, on ? "on" : "off");
      } catch {
        // A browser that keeps no site data works without asking all the same, for this visit.
      }
    }
  }));
}

export const autonomyStore = createAutonomy();

/** Whether the agent works without asking, in a component. */
export const useAutonomous = () => useStore(autonomyStore, state => state.on);

/** Whether the agent works without asking, now. */
export const autonomous = () => autonomyStore.getState().on;
