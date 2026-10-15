import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { IconButton } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { useFrames } from "./hooks";
import { leaveFullScreen } from "./stage";
import { simulationStore, useSimulation } from "./store";
import { answerLine, clockText, inputLabel, questionText, sentenceOf } from "./words";

/** The keys that step through the stage (simulator spec §7.1); a presenter's remote sends Page Down and Page Up. */
const STEPS = { ArrowRight: 1, " ": 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 };

/** Show another point of the run; moving on by one plays it. */
const go = index => simulationStore.getState().stageTo(index);

/** Back to the panel at the same point (simulator spec §7.1: "Esc returns to the panel at the same step"). */
function leave() {
  leaveFullScreen();
  const { shown, points } = simulationStore.getState();
  simulationStore.getState().leaveStage();
  const step = shown ?? points.length - 1;
  requestAnimationFrame(() => {
    const panel = globalThis.document?.querySelector('[data-area="simulation"]');
    (panel?.querySelector(`[data-step="${step}"]`) ?? panel?.querySelector("button"))?.focus();
  });
}

/**
 * The stage (simulator spec §7.1, mockup 05): the scenario presented over the whole screen, without the editor's
 * islands — the project and the scenario, the levels down to the one shown, and a card with the step: how far the
 * story is, its input, the clock, its caption (or what it did) and the answers it was taken with. → Space Page Down
 * go on, ← Page Up back, Home and End to the ends; Esc, or leaving full screen, goes back to the panel at the same step.
 * A scenario the design no longer takes to its end says why at its last step.
 */
export function Stage() {
  const { t, i18n } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const top = useSimulation(state => state.canvas);
  const points = useSimulation(state => state.points);
  const shown = useSimulation(state => state.shown);
  const script = useSimulation(state => state.script);
  const asking = useSimulation(state => state.asking);
  const failure = useSimulation(state => state.failure);
  const init = useSimulation(state => state.init);
  const frames = useFrames();
  // The focus starts on the card's way on, so Tab and Space work from there.
  const onward = useRef(null);
  useEffect(() => {
    onward.current?.focus();
  }, []);

  useEffect(() => {
    // Before the editor's own keys, which wait while the stage is shown.
    const onKeyDown = event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        event.preventDefault();
        return leave();
      }
      if (event.key === " " && event.target.closest?.("button")) return;
      const { shown: at, points: all } = simulationStore.getState();
      const now = at ?? all.length - 1;
      const target =
        event.key in STEPS ? now + STEPS[event.key]
        : event.key === "Home" ? 0
        : event.key === "End" ? all.length - 1
        : null;
      if (target === null) return;
      event.preventDefault();
      go(target);
    };
    // The browser leaves full screen on Esc by itself: the stage goes with it.
    const onFullScreen = () => !document.fullscreenElement && leave();
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullScreen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullScreen);
      // However the stage goes (the simulation stopped, the editor left), full screen goes with it.
      leaveFullScreen();
    };
  }, []);

  const index = shown ?? points.length - 1;
  // A scenario the design can no longer start has no point: its start's card says why.
  const frame = frames[index] ?? (points.length ? null : { trail: [top], do: null, answers: [], clock: init?.at });
  if (!frame) return null;
  const name = doc.annotations?.scenarios?.[script?.id]?.name ?? doc.canvases[top]?.name;
  const count = Math.max(points.length, script?.recorded.length ?? 0) - 1;
  const caption = points[index]?.caption;
  const text = points.length ? (caption ?? sentenceOf(doc, top, frame, t, i18n.language)) : null;
  const input = frame.do && inputLabel(doc, frame.do, t);
  const answers = frame.answers.map(answer => answerLine(doc, top, answer, t));
  // Where the story stops before its end: the next recorded step asks what the recording does not answer, or cannot
  // be taken (simulator spec §4.6).
  const last = index === points.length - 1;
  const stops =
    !last ? null
    : !points.length && asking ? t("stage.cannotStartAsking", { question: questionText(asking.question, t) })
    : !points.length && failure ? t("stage.cannotStartFailing", { message: failure.message })
    : asking ? t("stage.stopsAsking", { step: index + 1, question: questionText(asking.question, t) })
    : failure ? t("stage.stopsFailing", { step: index + 1, message: failure.message })
    : null;
  return (
    <section
      aria-label={t("stage.label", { name })}
      data-testid="stage"
      data-area="stage"
      className="pointer-events-none fixed inset-0 z-40 select-none"
    >
      <header className="pointer-events-auto absolute left-12 top-9 max-w-[min(64vw,760px)] max-sm:left-5 max-sm:top-5">
        <h1 className="text-[18px] tracking-[-0.01em] text-muted">
          {doc.project.name} / <span className="font-semibold text-ink">{name}</span>
        </h1>
        <ol aria-label={t("stage.levels")} className="mt-1.5 flex flex-wrap items-center gap-x-2 text-title text-sub">
          {frame.trail.map((level, at) => (
            <li
              key={level}
              className={cn(
                "before:mr-2 before:text-muted before:content-['›'] first:before:content-none",
                at === frame.trail.length - 1 && "text-ink"
              )}
            >
              {doc.canvases[level]?.name ?? level}
            </li>
          ))}
        </ol>
      </header>
      <button
        type="button"
        onClick={leave}
        className="pointer-events-auto absolute right-12 top-9 flex h-8 items-center gap-2 rounded-control border border-island-border bg-island px-2.5 text-ui font-medium text-ink shadow-island hover:bg-subtle max-sm:right-5 max-sm:top-5"
      >
        <Kbd>Esc</Kbd>
        {t("stage.exit")}
      </button>
      <article
        data-testid="stage-card"
        className="pointer-events-auto absolute bottom-8 left-1/2 w-[min(760px,calc(100vw-48px))] -translate-x-1/2 rounded-[16px] border border-island-border bg-surface px-7 pb-[18px] pt-[22px] shadow-dialog max-sm:bottom-4 max-sm:px-5"
      >
        <div className="flex min-h-7 items-center gap-3 text-[14px] text-sub">
          <span className="shrink-0 tabular-nums">
            {index > 0 ? t("stage.counter", { step: index, count }) : t("stage.start")}
          </span>
          {input && (
            <span className="min-w-0 truncate rounded-full bg-accent-soft px-3 py-[5px] font-mono text-[14px] leading-[1.3] text-accent">
              {input}
            </span>
          )}
          {frame.clock && (
            <span className="ml-auto shrink-0 tabular-nums">{clockText(frame.clock, i18n.language)}</span>
          )}
        </div>
        {text && (
          <p
            key={index}
            className={cn(
              "mt-3.5 text-[23px] leading-[1.42] tracking-[-0.012em] [text-wrap:pretty] motion-safe:animate-[fade-in_160ms_ease-out] max-sm:text-[19px]",
              caption ? "text-ink" : "text-sub"
            )}
          >
            {text}
          </p>
        )}
        {answers.length > 0 && (
          <ul className="mt-2 grid gap-0.5 text-[14px] text-sub">
            {answers.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {stops && (
          <p className="mt-3 flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-ui text-warning">
            <Icon name="alert" size={14} className="mt-px shrink-0" />
            {stops}
          </p>
        )}
        <div className="mt-5 flex items-center gap-4">
          <div aria-hidden="true" className="flex flex-1 gap-1">
            {Array.from({ length: count + 1 }, (_, at) => (
              <span
                key={at}
                className={cn(
                  "h-[3px] flex-1 rounded-full transition-colors duration-[250ms]",
                  at <= index ? "bg-accent" : "bg-hairline"
                )}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <IconButton
              label={t("stage.previous")}
              disabled={index <= 0}
              onClick={() => go(index - 1)}
              className="size-[30px] border border-control-border bg-surface"
            >
              <Icon name="arrow-left" size={14} />
            </IconButton>
            <IconButton
              ref={onward}
              label={t("stage.next")}
              disabled={index >= points.length - 1}
              onClick={() => go(index + 1)}
              className="size-[30px] border border-control-border bg-surface"
            >
              <Icon name="arrow-right" size={14} />
            </IconButton>
          </div>
        </div>
      </article>
      <p className="sr-only" aria-live="polite">
        {index > 0 ?
          t("stage.announce", { step: index, count, input, text })
        : t("stage.announceStart", { text: text ?? stops })}
      </p>
    </section>
  );
}
