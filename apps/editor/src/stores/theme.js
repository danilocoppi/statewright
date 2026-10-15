// Theme: "system" | "light" | "dark". The `dark` class on <html> switches the tokens (globals.css). index.html applies
// the saved theme before the app loads — it reads the same storage key.
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { APP } from "@/config/app";

export const THEMES = ["system", "light", "dark"];

const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");

function apply(theme) {
  const dark = theme === "dark" || (theme === "system" && systemQuery.matches);
  document.documentElement.classList.toggle("dark", dark);
}

export const useTheme = create()(
  persist(
    set => ({
      theme: "system",
      setTheme: theme => {
        apply(theme);
        set({ theme });
      }
    }),
    { name: `${APP.storagePrefix}:theme` }
  )
);

// In "system" mode, follow the operating system while the app is open.
systemQuery.addEventListener("change", () => apply(useTheme.getState().theme));
