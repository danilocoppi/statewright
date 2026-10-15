import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { elementName } from "@/inspector/references";
import { guideHref, ruleAnchor } from "@/guide/links";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { incompleteBecause, problemsOn } from "@/problems/details";
import { sentence } from "@/problems/rows";
import { problemsStore, useProblems } from "@/problems/store";
import { useEditor } from "@/store/editor";

import { CHIP, HoverCard } from "./HoverCard";
import { problemStore } from "./problemDetails";
import { useHoverPopover } from "./useHoverPopover";

/** A box's marker, or an edge's hit area above the edges (FigureEdge): each marked with its element. */
const MARKERS = ".problem-marker";
/** What a marker says: its element. */
const readMarker = marker => ({ target: marker.dataset.target });

/** Each severity's pill, in the marker's colour: red, amber, grey. */
const PILL = {
  error: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  incomplete: "bg-subtle text-sub"
};

/** One Problem: its severity (and, when incomplete, what that means), its rule as a link to the guide, its message. */
function ProblemBlock({ problem }) {
  const { t } = useTranslation(["editor", "common"]);
  const explain = t("problems.explain", { code: problem.code });
  return (
    <li className="px-3.5 py-3">
      <div className="flex items-start gap-2">
        <span data-severity={problem.severity} className={cn(CHIP, "rounded-full px-1.5", PILL[problem.severity])}>
          {t(`problems.severity.${problem.severity}`)}
        </span>
        {/* What the rule means, in the guide (spec §8.1); the editor stays where it is. */}
        <a
          href={guideHref(ruleAnchor(problem.code))}
          target="_blank"
          rel="noreferrer"
          aria-label={`${explain} (${t("common:guide.newTab")})`}
          title={explain}
          className="min-w-0 truncate font-mono text-[11px] font-medium leading-[18px] text-sub underline-offset-2 hover:text-ink hover:underline focus-visible:underline"
        >
          {problem.code}
        </a>
      </div>
      {/* Core's message is English in every interface language (spec §8.1). */}
      <p lang="en" className="mt-1.5 text-ui leading-normal text-ink">
        {sentence(problem.message)}
      </p>
      {problem.severity === "incomplete" && (
        <p className="mt-1 text-label leading-normal text-muted">
          {t(`problems.incomplete.${incompleteBecause(problem.code)}`)}
        </p>
      )}
    </li>
  );
}

/**
 * A Problems marker's details (spec §8.1: the red, amber or grey marker on a box or an edge): once the pointer rests on
 * a marker, the Problems about its element show beside it — each with its severity (what incomplete means, too), its
 * rule, linked to the guide, and its message — and "Show in Problems", which opens the Problems panel on the element.
 * They stay and go as any details of what the pointer rests on (useHoverPopover).
 * @param {{ container: import("react").RefObject<HTMLElement> }} props The canvas, whose markers are watched.
 */
export function ProblemPopover({ container }) {
  const { t } = useTranslation("editor");
  const { shown, ref, hold } = useHoverPopover({ container, store: problemStore, selector: MARKERS, read: readMarker });
  const doc = useEditor(state => state.doc);
  const list = useProblems(state => state.list);

  const problems = shown ? problemsOn(list, shown.target) : [];
  const gone = Boolean(shown) && !problems.length;
  // Its Problems fixed (by a change, an undo, an agent): nothing is left to show.
  useEffect(() => {
    if (gone) problemStore.getState().close();
  }, [gone]);

  if (!shown || !problems.length) return null;
  const entry = indexOf(doc).get(shown.target);
  const name =
    entry ? elementName(doc, entry, kind => t(`inspector:kinds.node.${kind}`, { defaultValue: kind })) : shown.target;
  const showInPanel = () => {
    problemsStore.getState().showElement(shown.target);
    problemStore.getState().close();
  };
  return (
    <HoverCard
      ref={ref}
      hold={hold}
      label={t("problems.on", { name })}
      testId="canvas-problem"
      action={{ label: t("problems.show"), onClick: showInPanel }}
    >
      {problems.map((problem, index) => (
        <ProblemBlock key={`${problem.code}|${problem.message}|${index}`} problem={problem} />
      ))}
    </HoverCard>
  );
}
