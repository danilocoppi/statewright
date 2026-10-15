import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the design tokens' scales (globals.css); otherwise `text-ui` (a size) and `text-ink`
// (a colour) would look like two colours and one would be dropped.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["label", "ui", "read", "title", "heading", "page"],
      radius: ["chip", "control", "island", "dialog"],
      shadow: ["island", "dialog"]
    }
  }
});

/** Join Tailwind classes, resolving conflicts: cn("px-2", active && "px-4") → "px-4". */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
