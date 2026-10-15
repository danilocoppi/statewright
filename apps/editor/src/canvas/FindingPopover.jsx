import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BADGE, TONES } from "statewright";

import { elementName } from "@/inspector/references";
import { inspectorStore } from "@/inspector/state";
import { evidenceSummary } from "@/inspector/values";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { useSimulation } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";

import { findingStore, findingsOn } from "./findings";
import { CHIP, HoverCard } from "./HoverCard";
import { paint } from "./palette";
import { useHoverPopover } from "./useHoverPopover";

/** A box's badge is Core's markup; an edge's is reached through the hit area above the edges (FigureEdge). */
const BADGES = ".badge, .badge-hit";
/** What a badge says: its element and the codes of the findings it shows. */
const readBadge = badge => ({ target: badge.dataset.target, codes: badge.dataset.codes.split(" ") });

/** Each severity in a tone of the diagram's palette, the most severe in the badge's own colours. */
const SEVERITY = {
  critical: BADGE,
  high: TONES.danger,
  medium: TONES.warning,
  low: TONES.info,
  info: TONES.neutral
};

/** A piece of evidence, or the source of a finding: a code chip. */
function CodeChip({ children, more }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-baseline gap-1.5 rounded-chip bg-subtle px-1.5 py-px font-mono text-[11px] leading-4">
      <span className="truncate text-ink">{children}</span>
      {more && <span className="truncate text-muted">{more}</span>}
    </span>
  );
}

/** One finding: its severity, code and title, what it says, and where it comes from. */
function FindingBlock({ finding }) {
  const { t } = useTranslation(["editor", "inspector"]);
  const tone = SEVERITY[finding.severity];
  const evidence = (finding.evidence ?? []).map(evidenceSummary);
  return (
    <li className="px-3.5 py-3">
      <div className="flex items-start gap-2">
        <span
          className={cn(CHIP, "rounded-full px-1.5")}
          style={{ background: paint(tone.fill), color: paint(tone.color) }}
        >
          {t(`inspector:choices.severity.${finding.severity}`)}
        </span>
        <span className="shrink-0 font-mono text-[11px] font-medium leading-[18px] text-sub">{finding.code}</span>
        <h3 className="min-w-0 text-ui font-semibold leading-[18px] text-ink">{finding.title}</h3>
      </div>
      {finding.description && <p className="mt-1.5 text-ui leading-normal text-sub">{finding.description}</p>}
      {(finding.source || evidence.length > 0) && (
        <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1.5">
          {finding.source && (
            <>
              <dt className="text-label text-muted">{t("inspector:fields.source")}</dt>
              <dd className="flex min-w-0">
                <CodeChip>{finding.source}</CodeChip>
              </dd>
            </>
          )}
          {evidence.length > 0 && (
            <>
              <dt className="text-label text-muted">{t("findings.where")}</dt>
              <dd className="flex min-w-0 flex-wrap gap-1">
                {evidence.map((line, index) => (
                  <CodeChip key={index} more={line.more}>
                    {line.main}
                  </CodeChip>
                ))}
              </dd>
            </>
          )}
        </dl>
      )}
    </li>
  );
}

/**
 * A finding badge's details (Core draws the badge, marked with its element and codes): once the pointer rests on a
 * badge, its findings show beside it — each with its severity, code and title, its description, its source and where
 * it was seen — and "Show in the inspector". They stay and go as any details of what the pointer rests on
 * (useHoverPopover).
 * @param {{ container: import("react").RefObject<HTMLElement> }} props The canvas, whose badges are watched.
 */
export function FindingPopover({ container }) {
  const { t } = useTranslation("editor");
  const { shown, ref, hold } = useHoverPopover({ container, store: findingStore, selector: BADGES, read: readBadge });
  const doc = useEditor(state => state.doc);
  const simulating = useSimulation(state => state.mode !== null);

  const findings = shown ? findingsOn(doc, shown.target, shown.codes) : [];
  const gone = Boolean(shown) && !findings.length;
  // Its findings removed (undone, replaced by an agent): nothing is left to show.
  useEffect(() => {
    if (gone) findingStore.getState().close();
  }, [gone]);

  if (!shown || !findings.length) return null;
  const entry = indexOf(doc).get(shown.target);
  const name =
    entry ? elementName(doc, entry, kind => t(`inspector:kinds.node.${kind}`, { defaultValue: kind })) : shown.target;
  const inspect = () => {
    const { canvasId: level } = editorStore.getState();
    if (entry?.canvas === level) editorStore.getState().select([shown.target]);
    inspectorStore.getState().show(shown.target, { details: true });
    findingStore.getState().close();
  };
  return (
    <HoverCard
      ref={ref}
      hold={hold}
      label={t("findings.label", { name })}
      testId="canvas-finding"
      action={simulating ? undefined : { label: t("findings.show"), onClick: inspect }}
    >
      {findings.map(finding => (
        <FindingBlock key={finding.id} finding={finding} />
      ))}
    </HoverCard>
  );
}
