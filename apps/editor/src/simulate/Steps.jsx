import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { AcceptDialog, ReadOnlyNote } from "./Dialogs";
import { Section } from "./parts";
import { simulationStore, useSimulation } from "./store";
import { divergedText, inputLabel, stepLine, traceLines } from "./words";

/** A step's micro-events (spec §6.2): in words, warnings in amber, the same one said once with how many times. */
function MicroEvents({ point, id }) {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const lines = traceLines(doc, canvas, point.trace, t);
  return (
    <ul id={id} className="mb-1 ml-[30px] grid gap-0.5 border-l border-hairline py-1 pl-3">
      {lines.map(line => (
        <li
          key={`${line.warning ? "!" : ""}${line.text}`}
          lang={line.warning ? "en" : undefined}
          className={cn("text-ui", line.warning ? "text-warning" : "text-sub")}
        >
          {line.warning && <Icon name="alert" size={12} className="mr-1.5 inline-block align-[-1px]" />}
          {line.text}
          {line.times > 1 && <span className="text-muted"> {t("steps.times", { count: line.times })}</span>}
        </li>
      ))}
      {!lines.length && <li className="text-ui text-muted">{t("trace.nothing")}</li>}
    </ul>
  );
}

/**
 * A step's caption (spec §6.4: "captions are written per step with the pencil on each step line, before or after
 * saving"): one or two plain sentences, stored in the scenario once the step is saved.
 */
function Caption({ index, point }) {
  const { t } = useTranslation("simulate");
  const readOnly = useEditor(state => state.readOnly);
  const [draft, setDraft] = useState(null);
  const id = useId();
  const saved = point.recorded !== undefined;
  const locked = saved && readOnly;
  const done = () => {
    simulationStore.getState().caption(index, draft, t("captions.label", { step: index }));
    setDraft(null);
  };
  if (draft !== null) {
    return (
      <div className="ml-[30px] grid gap-1 pb-1.5 pr-2">
        <label htmlFor={id} className="sr-only">
          {t("captions.edit", { step: index })}
        </label>
        <textarea
          id={id}
          autoFocus
          rows={2}
          value={draft}
          placeholder={t("captions.placeholder")}
          onChange={event => setDraft(event.target.value)}
          onBlur={done}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              done();
            }
            if (event.key === "Escape") {
              event.stopPropagation();
              setDraft(null);
            }
          }}
          className="block w-full resize-none rounded-control border border-control-border bg-surface px-2.5 py-1.5 text-read text-ink outline-none [field-sizing:content] placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
        />
      </div>
    );
  }
  return (
    <div className="group/caption ml-[30px] flex items-start gap-1 pr-1">
      {point.caption && <p className="min-w-0 flex-1 pb-1.5 text-ui text-sub">{point.caption}</p>}
      <IconButton
        label={locked ? t("save.readOnly") : t(point.caption ? "captions.edit" : "captions.add", { step: index })}
        disabled={locked}
        onClick={() => setDraft(point.caption ?? "")}
        className={cn(
          "size-6 shrink-0 opacity-0 focus-visible:opacity-100 group-hover/step:opacity-100 [@media(hover:none)]:opacity-100",
          point.caption ? "ml-auto" : "-mt-7 ml-auto"
        )}
      >
        <Icon name="pencil" size={12} />
      </IconButton>
    </div>
  );
}

/**
 * Where a followed scenario now goes elsewhere (spec §6.4): recorded × now, in amber, with Accept the new path — which
 * asks first when later steps would be dropped — and Stop here.
 */
function Diverged({ index, words }) {
  const { t } = useTranslation("simulate");
  const readOnly = useEditor(state => state.readOnly);
  const [ask, setAsk] = useState(null);
  // It is what the person has to decide on now: brought into view in the panel.
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: "nearest" });
  }, []);
  const accept = () => {
    setAsk(null);
    simulationStore.getState().accept(index, t(index ? "accept.label" : "accept.labelStart", { step: index }));
  };
  return (
    <div
      ref={ref}
      className="mb-1.5 ml-[30px] mr-2 grid gap-2 rounded-control border border-warning/30 bg-warning-soft px-3 py-2.5"
    >
      <p className="flex items-start gap-2 text-ui text-ink">
        <Icon name="alert" size={14} className="mt-px shrink-0 text-warning" />
        <span>{words}</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="primary"
          disabled={readOnly}
          onClick={() => {
            const { dropped } = simulationStore.getState().preview(index);
            if (dropped) setAsk({ index, dropped });
            else accept();
          }}
        >
          {t("diverged.accept")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => simulationStore.getState().stopFollowing()}>
          {t("diverged.stop")}
        </Button>
      </div>
      {readOnly && <ReadOnlyNote />}
      <AcceptDialog ask={ask} onClose={() => setAsk(null)} onAccept={accept} />
    </div>
  );
}

/**
 * Steps (spec §6.2, §6.4): one line per step, its input and where it led, its caption and the pencil that writes it.
 * Picking one shows the run at that point and opens its micro-events; ↑ and ↓ move from step to step. A followed
 * scenario shows the steps still to come, and where it now goes elsewhere.
 */
export function Steps() {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const points = useSimulation(state => state.points);
  const shown = useSimulation(state => state.shown);
  const script = useSimulation(state => state.script);
  const failure = useSimulation(state => state.failure);
  const list = useRef(null);
  const current = shown ?? points.length - 1;
  const upcoming = script?.following ? script.recorded.slice(Math.max(1, points.length)) : [];
  // A followed scenario can go elsewhere already while starting: a question it does not answer, or answers it no
  // longer needs.
  const start = script?.following && points[0]?.status === "diverged" ? points[0] : null;
  if (points.length < 2 && !upcoming.length && !start) return null;

  const pick = index => simulationStore.getState().show(index === points.length - 1 ? null : index);
  const onKeyDown = event => {
    const move = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!move || event.target.tagName === "TEXTAREA") return;
    event.preventDefault();
    const next = Math.min(points.length - 1, Math.max(1, current + move));
    pick(next);
    list.current?.querySelector(`[data-step="${next}"]`)?.focus();
  };
  return (
    <Section title={t("steps.title")} id="simulate-steps">
      <ol ref={list} onKeyDown={onKeyDown} className="-mx-2 grid">
        {start && (
          <li>
            <p className="grid grid-cols-[22px_minmax(0,1fr)] items-baseline gap-x-2 px-2 py-1.5">
              <span className="flex justify-end text-warning">
                <Icon name="play" size={11} />
              </span>
              <span className="min-w-0 truncate text-read">
                <span className="text-ink">{t("steps.start")}</span>
                <span className="text-sub"> {stepLine(doc, canvas, null, start, t).outcome}</span>
                <span className="sr-only"> · {t("diverged.label")}</span>
              </span>
            </p>
            <Diverged index={0} words={divergedText(doc, canvas, start, script.recorded[0], t)} />
          </li>
        )}
        {points.slice(1).map((point, offset) => {
          const index = offset + 1;
          const line = stepLine(doc, canvas, points[index - 1], point, t);
          const open = index === current;
          const diverged = point.status === "diverged";
          return (
            <li key={index} className="group/step">
              <button
                type="button"
                data-testid="simulation-step"
                data-step={index}
                aria-current={open ? "step" : undefined}
                aria-expanded={open}
                aria-controls={open ? `simulate-step-${index}` : undefined}
                tabIndex={open ? 0 : -1}
                onClick={() => pick(index)}
                className={cn(
                  "grid w-full grid-cols-[22px_minmax(0,1fr)] items-baseline gap-x-2 rounded-control px-2 py-1.5 text-left hover:bg-subtle",
                  open && "bg-subtle"
                )}
              >
                <span
                  className={cn(
                    "text-right text-ui tabular-nums",
                    diverged ? "text-warning"
                    : open ? "text-accent"
                    : "text-muted"
                  )}
                >
                  {index}
                </span>
                <span className="min-w-0 truncate text-read">
                  <span className="font-mono text-[12.5px] text-ink">{line.input}</span>
                  <span className="text-sub"> {line.outcome}</span>
                  {diverged && <span className="sr-only"> · {t("diverged.label")}</span>}
                </span>
              </button>
              <Caption index={index} point={point} />
              {diverged && script?.following && (
                <Diverged index={index} words={divergedText(doc, canvas, point, script.recorded[point.recorded], t)} />
              )}
              {open && <MicroEvents point={point} id={`simulate-step-${index}`} />}
            </li>
          );
        })}
        {upcoming.map((kept, offset) => {
          const index = Math.max(1, points.length) + offset;
          const stopped = offset === 0 && failure?.replaying?.recorded === index;
          return (
            <li key={`upcoming-${index}`}>
              <p className="grid grid-cols-[22px_minmax(0,1fr)] items-baseline gap-x-2 px-2 py-1.5">
                <span className={cn("text-right text-ui tabular-nums", stopped ? "text-warning" : "text-muted")}>
                  {index}
                </span>
                <span className="min-w-0 truncate text-read text-muted">
                  <span className="font-mono text-[12.5px]">{inputLabel(doc, kept.do, t)}</span>
                  <span className="sr-only"> · {t("steps.upcoming")}</span>
                </span>
              </p>
              {kept.caption && <p className="ml-[30px] pb-1.5 text-ui text-muted">{kept.caption}</p>}
              {stopped && <Diverged index={index} words={failure.message} />}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

/**
 * While an earlier step is shown (spec §6.2): the run can continue from there — the later steps are discarded — or go
 * back to its last step.
 */
export function ShownBar() {
  const { t } = useTranslation("simulate");
  const points = useSimulation(state => state.points);
  const shown = useSimulation(state => state.shown);
  return (
    <Section title={t("steps.shownTitle")} id="simulate-shown">
      <p className="text-ui text-sub">
        {shown === 0 ?
          t("steps.shownStart", { count: points.length - 1 })
        : t("steps.shown", { step: shown, count: points.length - 1 })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => simulationStore.getState().continueFrom()}>{t("steps.continue")}</Button>
        <Button variant="ghost" onClick={() => simulationStore.getState().show(null)}>
          {t("steps.last")}
        </Button>
      </div>
    </Section>
  );
}
