import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";
import { summarize, useProblems } from "@/problems/store";

const DOT = { error: "bg-danger", warning: "bg-warning", incomplete: "bg-muted" };

/**
 * The Problems indicator (spec §8.1, actions island): the project's count, its dot coloured by the worst severity.
 * @param {{ open: boolean, onToggle: () => void, ref?: import("react").Ref<HTMLButtonElement> }} props
 */
export function ProblemsButton({ open, onToggle, ref }) {
  const { t } = useTranslation("editor");
  const list = useProblems(state => state.list);
  const checked = useProblems(state => state.version !== null);
  const { total, worst } = useMemo(() => summarize(list), [list]);
  return (
    <button
      ref={ref}
      type="button"
      data-testid="actions-problems"
      aria-expanded={open}
      aria-controls="problems-panel"
      onClick={onToggle}
      className={cn(
        "flex h-8 items-center gap-2 rounded-control px-2.5 text-ui hover:bg-subtle",
        open && "bg-subtle font-medium"
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", worst ? DOT[worst] : "bg-success")} />
      {checked ? t("problems.count", { count: total }) : t("problems.checking")}
    </button>
  );
}
