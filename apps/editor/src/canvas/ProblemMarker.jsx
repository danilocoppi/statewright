import { cn } from "@/lib/cn";
import { useSimulation } from "@/simulate/store";

import { useMarker } from "./useMarker";

const TONE = { error: "bg-danger", warning: "bg-warning", incomplete: "bg-muted" };

/**
 * The small marker on a box with Problems (spec §8.1): red error, amber warning, grey incomplete. Severity is also in
 * the glyph ("!" or "i"), so it never relies on colour alone.
 */
export function ProblemMarker({ element, className }) {
  const severity = useMarker(element);
  // While a run is shown its marks speak for the level; the Problems come back when it stops.
  const running = useSimulation(state => state.mode === "run");
  if (!severity || running) return null;
  return (
    <span
      aria-hidden="true"
      data-severity={severity}
      className={cn(
        "pointer-events-none absolute grid size-4 place-items-center rounded-full font-mono text-[10px] font-semibold leading-none text-canvas ring-2 ring-canvas",
        TONE[severity],
        className
      )}
    >
      {severity === "incomplete" ? "i" : "!"}
    </span>
  );
}
