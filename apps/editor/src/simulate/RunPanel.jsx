import { useTranslation } from "react-i18next";

import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { isMac } from "@/features/editor/shortcuts";
import { useEditor } from "@/store/editor";

import { Kbd } from "@/components/ui/Chip";

import { Data } from "./Data";
import { ReadOnlyNote } from "./Dialogs";
import { Failure } from "./Failure";
import { Moves } from "./Moves";
import { HereDot, PanelHeader, Section } from "./parts";
import { Question } from "./Question";
import { hasNext, hasUnsaved, shownPoint } from "./runs";
import { ShownBar, Steps } from "./Steps";
import { enterFullScreen } from "./stage";
import { simulationStore, useSimulation } from "./store";
import { activeSince, clockText, nowRows, questionText, stepLine } from "./words";

/** Now (spec §6.2): the active states with their region or machine — a flow's tokens — and the clock. */
function Now({ point, index }) {
  const { t, i18n } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const points = useSimulation(state => state.points);
  const rows = nowRows(doc, canvas, point.session, t);
  const flow = doc.canvases[canvas]?.kind === "flow";
  return (
    <Section title={t("run.now")} id="simulate-now">
      {rows.length > 0 ?
        <ul className="grid gap-1">
          {rows.map(row => {
            const since = flow ? null : activeSince(points, index, row.path);
            const where = row.where ?? (since === 0 ? t("run.sinceStart") : t("run.since", { count: since }));
            return (
              <li key={row.key} className="flex min-h-7 items-center gap-2.5">
                <HereDot />
                <span className="min-w-0 truncate text-read font-medium text-ink">{row.name}</span>
                <span className="ml-auto shrink-0 truncate pl-2 text-ui text-muted">{where}</span>
              </li>
            );
          })}
        </ul>
      : !point.session.ended && <p className="text-ui text-muted">{t("run.nothingActive")}</p>}
      {point.session.ended && (
        <p className="flex items-center gap-2.5 text-read font-medium text-ink">
          <Icon
            name={point.session.ended === "failure" ? "alert" : "check"}
            size={14}
            className={point.session.ended === "failure" ? "text-danger" : "text-success"}
          />
          {t(`run.ended.${point.session.ended}`)}
        </p>
      )}
      <p className="flex items-center gap-2.5 text-read tabular-nums text-ink">
        <Icon name="clock" size={14} className="shrink-0 text-muted" />
        <span className="sr-only">{t("run.clock")}</span>
        {clockText(point.session.clock, i18n.language)}
      </p>
    </Section>
  );
}

/** The engine could not take the last input (spec §6.2, §9): why, in the run's place; the input was not taken. */
function Stopped({ failure }) {
  const { t } = useTranslation("simulate");
  return (
    <div className="grid gap-2 px-3 py-3">
      <Failure failure={failure} />
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-end"
        onClick={() => simulationStore.getState().dismiss()}
      >
        {t("run.dismiss")}
      </Button>
    </div>
  );
}

/**
 * What a screen reader hears (spec §6.5: "each step's result is announced"): the last step and where it led, a
 * question, or why the run could not go on.
 */
function Announcer() {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const points = useSimulation(state => state.points);
  const asking = useSimulation(state => state.asking);
  const failure = useSimulation(state => state.failure);
  let said = "";
  if (asking) said = questionText(asking.question, t);
  else if (failure) said = t(`errors.${failure.code}`, { defaultValue: t("errors.internal") });
  else if (points.length > 1) {
    const line = stepLine(doc, canvas, points.at(-2), points.at(-1), t);
    said = t("run.announce", { count: points.length - 1, input: line.input, outcome: line.outcome });
  }
  return (
    <p className="sr-only" aria-live="polite">
      {said}
    </p>
  );
}

/**
 * What the run offers last (spec §6.4): Next step while a scenario is followed (→ too), else Save as scenario… when it
 * has steps no scenario holds — which a read-only tab cannot, and says why.
 */
function Footer() {
  const { t } = useTranslation("simulate");
  const readOnly = useEditor(state => state.readOnly);
  const following = useSimulation(hasNext);
  const unsaved = useSimulation(hasUnsaved);
  if (following) {
    return (
      <footer className="border-t border-hairline p-3">
        <Button variant="primary" className="h-9 w-full" onClick={() => simulationStore.getState().next()}>
          {t("scenarios.next")}
          <Kbd className="border-primary-foreground/30 bg-transparent text-primary-foreground">→</Kbd>
        </Button>
      </footer>
    );
  }
  if (!unsaved) return null;
  return (
    <footer className="grid gap-1.5 border-t border-hairline p-3">
      <Button
        variant="primary"
        className="h-9 w-full"
        disabled={readOnly}
        onClick={() => simulationStore.getState().setSaving(true)}
      >
        {t("save.open")}
      </Button>
      {readOnly && <ReadOnlyNote />}
    </footer>
  );
}

/**
 * The run in the panel (simulator spec §6.2, mockups 01, 03, 04): a question or an error first, then where the run is
 * now, what can happen, its steps and its data. The header goes back one step (⌘Z) or starts over.
 */
export function RunPanel() {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvas = useSimulation(state => state.canvas);
  const points = useSimulation(state => state.points);
  const shown = useSimulation(state => state.shown);
  const asking = useSimulation(state => state.asking);
  const failure = useSimulation(state => state.failure);
  const point = useSimulation(shownPoint);
  const index = shown ?? points.length - 1;
  const name = doc.canvases[canvas]?.name ?? canvas;
  const steps = Math.max(0, points.length - 1);
  const script = useSimulation(state => state.script);
  const scenario = script?.following ? doc.annotations?.scenarios?.[script.id] : null;
  const subtitle =
    scenario ? t("run.scenarioStep", { name: scenario.name, step: steps, count: script.recorded.length - 1 })
    : steps > 0 ? t("run.step", { name, count: steps })
    : t("run.fromStart", { name });
  return (
    <>
      <PanelHeader title={t("panel.label")} subtitle={subtitle}>
        {script && (
          // Present while running a scenario (simulator spec §7.1): the stage opens at the step shown.
          <IconButton
            label={t("run.present", { name: doc.annotations?.scenarios?.[script.id]?.name ?? name })}
            className="size-7 shrink-0"
            onClick={() => {
              simulationStore.getState().present();
              enterFullScreen();
            }}
          >
            <Icon name="present" size={15} />
          </IconButton>
        )}
        <IconButton
          label={t("run.back", { key: isMac() ? "⌘Z" : "Ctrl+Z" })}
          className="size-7 shrink-0"
          disabled={steps === 0 && !asking && !failure}
          onClick={() => simulationStore.getState().back()}
        >
          <Icon name="undo" size={14} />
        </IconButton>
        <IconButton
          label={t("run.restart")}
          className="size-7 shrink-0"
          disabled={!points.length}
          onClick={() => simulationStore.getState().leave("restart")}
        >
          <Icon name="restart" size={14} />
        </IconButton>
      </PanelHeader>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]">
        {asking && <Question asking={asking} />}
        {failure && !failure.replaying && <Stopped failure={failure} />}
        {failure?.replaying && !points.length && (
          // A followed scenario that can no longer start: why, with nothing to dismiss — it has no run to go back to.
          <div className="px-3 py-3">
            <Failure failure={failure} />
          </div>
        )}
        {point && <Now point={point} index={index} />}
        {point && shown !== null && <ShownBar />}
        {point && shown === null && !asking && <Moves session={point.session} />}
        <Steps />
        {point && <Data session={point.session} />}
      </div>
      <Footer />
      <Announcer />
    </>
  );
}
