import { useViewport } from "@xyflow/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BADGE, TONES } from "statewright";

import { elementName } from "@/inspector/references";
import { inspectorStore } from "@/inspector/state";
import { evidenceSummary } from "@/inspector/values";
import { cn } from "@/lib/cn";
import { indexOf } from "@/lib/derived";
import { useSimulation } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";

import { besideBadge, findingStore, findingsOn, useFindings } from "./findings";
import { paint } from "./palette";

/** How long the pointer rests on a badge before its findings show. */
export const OPEN_MS = 150;
/** How long they wait for the pointer to come back, crossing from the badge to them or back. */
const CLOSE_MS = 120;

/** Each severity in a tone of the diagram's palette, the most severe in the badge's own colours. */
const SEVERITY = {
  critical: BADGE,
  high: TONES.danger,
  medium: TONES.warning,
  low: TONES.info,
  info: TONES.neutral
};

/** A small mono chip in capitals, as the diagrams' chips are. */
const CHIP =
  "inline-flex h-[18px] shrink-0 items-center font-mono text-[9.5px] font-semibold uppercase tracking-[0.04em]";

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
 * it was seen — and "Show in the inspector". They stay while the pointer is on the badge or on them, so their words
 * can be selected and copied; they go when it leaves both, on Esc, on a press elsewhere and when the view moves.
 * @param {{ container: import("react").RefObject<HTMLElement> }} props The canvas, whose badges are watched.
 */
export function FindingPopover({ container }) {
  const { t } = useTranslation("editor");
  const shown = useFindings(state => state.shown);
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const simulating = useSimulation(state => state.mode !== null);
  const { x, y, zoom } = useViewport();
  const ref = useRef(null);
  const timers = useRef({ open: null, close: null });

  /** The pointer has left: the findings go, unless it comes back to the badge or to them. */
  const leave = () => {
    clearTimeout(timers.current.close);
    timers.current.close = setTimeout(() => findingStore.getState().close(), CLOSE_MS);
  };
  const stay = () => clearTimeout(timers.current.close);

  // The badges are Core's markup: one listener on the canvas sees the pointer come to rest on any of them.
  useEffect(() => {
    const canvas = container.current;
    if (!canvas) return;
    const wait = timers.current;
    const badgeOf = event => event.target.closest?.(".badge") ?? null;
    const onOver = event => {
      const badge = badgeOf(event);
      if (!badge || event.pointerType === "touch" || event.buttons) return;
      clearTimeout(wait.close);
      if (findingStore.getState().shown?.target === badge.dataset.target) return;
      clearTimeout(wait.open);
      wait.open = setTimeout(() => {
        const { left, top, right, bottom } = badge.getBoundingClientRect();
        findingStore.getState().show({
          target: badge.dataset.target,
          codes: badge.dataset.codes.split(" "),
          rect: { left, top, right, bottom }
        });
      }, OPEN_MS);
    };
    const onOut = event => {
      const badge = badgeOf(event);
      if (!badge || badge.contains(event.relatedTarget)) return;
      clearTimeout(wait.open);
      if (findingStore.getState().shown) {
        clearTimeout(wait.close);
        wait.close = setTimeout(() => findingStore.getState().close(), CLOSE_MS);
      }
    };
    canvas.addEventListener("pointerover", onOver);
    canvas.addEventListener("pointerout", onOut);
    return () => {
      canvas.removeEventListener("pointerover", onOver);
      canvas.removeEventListener("pointerout", onOut);
      clearTimeout(wait.open);
      clearTimeout(wait.close);
    };
  }, [container]);

  // The view moved, or another level is shown: the badge is no longer where its findings stand.
  useEffect(() => {
    clearTimeout(timers.current.open);
    findingStore.getState().close();
  }, [x, y, zoom, canvasId]);

  // Open, they go on Esc (EditorPage leaves it to them) and on a press anywhere else.
  useEffect(() => {
    if (!shown) return;
    const close = () => findingStore.getState().close();
    const onKeyDown = event => event.key === "Escape" && close();
    const onPointerDown = event => !ref.current?.contains(event.target) && close();
    addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [shown]);

  const findings = shown ? findingsOn(doc, shown.target, shown.codes) : [];
  const gone = Boolean(shown) && !findings.length;
  // Its findings removed (undone, replaced by an agent): nothing is left to show.
  useEffect(() => {
    if (gone) findingStore.getState().close();
  }, [gone]);

  // Beside the badge, kept inside the window; measured before it is painted.
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || !shown) return;
    const place = besideBadge(
      shown.rect,
      { w: box.offsetWidth, h: box.offsetHeight },
      { w: innerWidth, h: innerHeight }
    );
    box.style.left = `${place.left}px`;
    box.style.top = `${place.top}px`;
    box.dataset.side = place.side;
  });

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
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={t("findings.label", { name })}
      data-testid="canvas-finding"
      onPointerEnter={stay}
      onPointerLeave={event => {
        // Selecting their words may take the pointer out while it is pressed: they wait for it to be released.
        if (!event.buttons) return leave();
        document.addEventListener("pointerup", () => !ref.current?.matches(":hover") && leave(), { once: true });
      }}
      className="fixed left-0 top-0 z-30 flex w-max max-w-[min(360px,calc(100vw-16px))] select-text flex-col overflow-hidden rounded-island border border-island-border bg-surface text-ink shadow-dialog motion-safe:animate-[fade-in_160ms_var(--ease-soft)]"
    >
      <ul className="max-h-[min(340px,calc(100vh-72px))] divide-y divide-hairline overflow-y-auto overscroll-contain [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]">
        {findings.map(finding => (
          <FindingBlock key={finding.id} finding={finding} />
        ))}
      </ul>
      {!simulating && (
        <div className="flex justify-end border-t border-hairline px-3.5 py-2">
          <button
            type="button"
            onClick={inspect}
            className="text-label font-medium text-accent hover:underline focus-visible:underline"
          >
            {t("findings.show")}
          </button>
        </div>
      )}
    </div>
  );
}
