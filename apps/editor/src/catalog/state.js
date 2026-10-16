// The catalog sheet (spec §7.5): whether it is open, and which collection and item it shows.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** The collections in the order the sheet lists them (mockup 10). */
export const COLLECTIONS = [
  "events",
  "actions",
  "guards",
  "types",
  "endpoints",
  "webhooks",
  "timers",
  "statuses",
  "parties",
  "highlights"
];

/** The sheet's list of reusable parts (spec §7.6), after the collections. */
export const PARTS = "definitions";

export const catalogStore = createStore(set => ({
  open: false,
  collection: COLLECTIONS[0],
  /** @type {string | null} */
  item: null,
  /** Open the sheet, on a collection and an item when given. */
  show: ({ collection, item } = {}) =>
    set(state => ({ open: true, collection: collection ?? state.collection, item: item ?? null })),
  /** Show a collection, or an item of the one shown. */
  choose: ({ collection, item = null }) => set(state => ({ collection: collection ?? state.collection, item })),
  close: () => set({ open: false })
}));

/** Read from the catalog sheet's store in a component. */
export const useCatalog = selector => useStore(catalogStore, selector);
