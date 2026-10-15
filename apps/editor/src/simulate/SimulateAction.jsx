import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { executableOf } from "statewright/simulate";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { useEditor } from "@/store/editor";

import { openFor, simulationStore, useSimulation } from "./store";

const ACTION =
  "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-control px-2.5 text-ui font-medium text-accent transition-colors duration-150 hover:bg-accent-soft disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent";

/**
 * Simulate, in the actions island (simulator spec §6.1, mockup 02): on a machine or flow level it opens the Start
 * panel for the machine or flow that runs it; on a system level, for what runs inside it — a choice when there are
 * several — and it says why when nothing does. Pressed again, the Start panel closes.
 */
export function SimulateAction() {
  const { t } = useTranslation("simulate");
  const doc = useEditor(state => state.doc);
  const canvasId = useEditor(state => state.canvasId);
  const open = useSimulation(state => state.mode === "start");
  const runs = useMemo(() => executableOf(doc, canvasId), [doc, canvasId]);
  const inside = runs.canvas ? [runs.canvas] : (runs.inside ?? []);
  // In a narrow window only its icon is shown, so the islands across the top keep their room; its name is still said.
  const label = (
    <>
      <Icon name="play" size={14} />
      <span className="max-[1100px]:sr-only">{t("action.simulate")}</span>
    </>
  );
  if (open || inside.length < 2) {
    return (
      <button
        type="button"
        data-simulate
        data-testid="actions-simulate"
        aria-expanded={open}
        disabled={!open && inside.length === 0}
        title={inside.length ? t("action.simulateHint") : t("action.nothing")}
        onClick={() => (open ? simulationStore.getState().close() : openFor(inside[0]))}
        className={cn(ACTION, open && "bg-accent-soft")}
      >
        {label}
      </button>
    );
  }
  return (
    <Menu
      label={t("action.chooseTitle")}
      menuClassName="w-72"
      sections={[
        {
          title: t("action.chooseTitle"),
          items: inside.map(canvas => ({
            id: canvas,
            label: doc.canvases[canvas].name,
            hint: t(`inspector:kinds.canvas.${doc.canvases[canvas].kind}`),
            icon: <Icon name={doc.canvases[canvas].kind} />,
            onSelect: () => openFor(canvas)
          }))
        }
      ]}
      trigger={props => (
        <button
          type="button"
          data-simulate
          data-testid="actions-simulate"
          title={t("action.simulateHint")}
          className={ACTION}
          {...props}
        >
          {label}
          <Icon name="chevron-down" size={14} />
        </button>
      )}
    />
  );
}

/**
 * While a run is shown (spec §6.1, mockup 01): the actions island says so, with Stop. The document is not edited
 * meanwhile; Stop leaves the run and gives the design back.
 * @param {{ onStop: () => void }} props
 */
export function SimulatingStatus({ onStop }) {
  const { t } = useTranslation("simulate");
  return (
    <>
      <span className="flex items-center gap-2 px-2 text-ui font-medium text-accent">
        <span aria-hidden="true" className="size-2 rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]" />
        {t("action.simulating")}
      </span>
      <Button size="sm" data-testid="simulation-stop" onClick={onStop}>
        {t("action.stop")}
      </Button>
    </>
  );
}
