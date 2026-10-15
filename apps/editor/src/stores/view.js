// What the canvas shows besides the diagram (spec §6.1, §8.1: the View section of the project menu), remembered in
// this browser like the theme.
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { APP } from "@/config/app";

/**
 * The settings, and whether each is on until the person changes it. `insertHint`: the "Press / to insert" hint, shown
 * until `/` is first used; `inspectorDetails`: the inspector shows Details rather than Basics (spec §7.4); `findings`,
 * `notes`, `focus`, `lanes`: the annotation layers drawn (spec §7.7).
 */
export const VIEW_DEFAULTS = {
  legend: false,
  minimap: false,
  incomplete: true,
  insertHint: true,
  inspectorDetails: false,
  findings: true,
  notes: true,
  focus: true,
  lanes: true
};

export const useView = create()(
  persist(
    set => ({
      ...VIEW_DEFAULTS,
      /** Turn one setting on or off. @param {keyof VIEW_DEFAULTS} key */
      toggle: key => set(state => ({ [key]: !state[key] }))
    }),
    { name: `${APP.storagePrefix}:view` }
  )
);
