// The Levels dialog, the project's map (spec §6.3): whether it is open. The project menu, ⌘K, L and the zoom island's
// button open it.
import { create } from "zustand";

export const levelsStore = create(set => ({
  open: false,
  show: () => set({ open: true }),
  close: () => set({ open: false })
}));
