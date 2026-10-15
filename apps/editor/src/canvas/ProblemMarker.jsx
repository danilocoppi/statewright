import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";
import { useSimulation } from "@/simulate/store";

import { useMarker } from "./useMarker";

const TONE = { error: "bg-danger", warning: "bg-warning", incomplete: "bg-muted" };

/**
 * The small marker on a box with Problems (spec §8.1): red error, amber warning, grey incomplete. Severity is also in
 * the glyph ("!" or "i") and in its name, so it never relies on colour alone. Resting the pointer on it shows the box's
 * Problems (ProblemPopover, which finds it by its class and element).
 */
export function ProblemMarker({ element, className }) {
  const { t } = useTranslation("editor");
  const severity = useMarker(element);
  // While a run is shown its marks speak for the level; the Problems come back when it stops.
  const running = useSimulation(state => state.mode === "run");
  if (!severity || running) return null;
  return (
    <span
      role="img"
      aria-label={t("problems.marker", { severity: t(`problems.severity.${severity}`) })}
      data-target={element}
      data-severity={severity}
      className={cn(
        "problem-marker absolute grid size-4 place-items-center rounded-full font-mono text-[10px] font-semibold leading-none text-canvas ring-2 ring-canvas",
        TONE[severity],
        className
      )}
    >
      <span aria-hidden="true">{severity === "incomplete" ? "i" : "!"}</span>
    </span>
  );
}
