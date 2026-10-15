import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { guideHref, ruleAnchor } from "@/guide/links";
import { sentence } from "@/problems/rows";
import { useProblems } from "@/problems/store";

import { elementOf } from "./words";

/**
 * A run that cannot go on (simulator spec §6.2, §9): what happened in plain words, the engine's own message, and the
 * Problem about the same element when there is one, with its rule's explanation in the guide.
 * @param {{ failure: { code: string, message: string, details?: object } }} props
 */
export function Failure({ failure }) {
  const { t } = useTranslation(["simulate", "editor", "common"]);
  const element = elementOf(failure.details);
  const problem = useProblems(state => (element ? state.list.find(item => item.target === element) : undefined));
  return (
    <div role="alert" className="grid gap-1.5 rounded-control border border-danger/25 bg-danger-soft px-3 py-2.5">
      <p className="flex items-center gap-2 text-ui font-medium text-danger">
        <Icon name="alert" size={14} className="shrink-0" />
        {t(`errors.${failure.code}`, { defaultValue: t("errors.internal") })}
      </p>
      {/* The engine's words are English in every interface language, as Problems are (Editor spec §8.1). */}
      <p lang="en" className="text-ui text-ink">
        {sentence(failure.message)}
      </p>
      {problem && (
        <p className="flex items-start gap-2 border-t border-danger/15 pt-1.5 text-label text-sub">
          <span className="min-w-0 flex-1">
            {t("errors.problem")}{" "}
            <span lang="en" className="text-ink">
              {sentence(problem.message)}
            </span>
          </span>
          <a
            href={guideHref(ruleAnchor(problem.code))}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-mono text-[10.5px] text-sub underline-offset-2 hover:text-ink hover:underline"
          >
            {problem.code}
            <span className="sr-only"> ({t("common:guide.newTab")})</span>
          </a>
        </p>
      )}
    </div>
  );
}
