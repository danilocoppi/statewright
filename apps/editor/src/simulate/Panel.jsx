import { useTranslation } from "react-i18next";

import { INSPECTOR } from "@/canvas/viewport";
import { PanelBoundary } from "@/components/PanelBoundary";
import { Island } from "@/components/ui/Island";
import { useInspectorWidth } from "@/stores/inspector";

import { LeaveDialog, SaveDialog } from "./Dialogs";
import { hasNext } from "./runs";
import { RunPanel } from "./RunPanel";
import { StartPanel } from "./StartPanel";
import { simulationStore, useSimulation } from "./store";

/**
 * The simulation panel (simulator spec §6.2): in the inspector's place, its island, width (as the person made it) and
 * motion, with its own error boundary (spec §9: "Reload this panel"; the document is never affected). The Start panel
 * until a run has started, then the run — a question asked while starting is the run's to show.
 */
export function SimulationPanel() {
  const { t } = useTranslation("simulate");
  const mode = useSimulation(state => state.mode);
  const asking = useSimulation(state => Boolean(state.asking));
  const width = useInspectorWidth();
  if (!mode) return null;
  const starting = mode === "start" && !asking;
  return (
    <PanelBoundary
      resetKey={mode}
      style={{ right: INSPECTOR.margin, width }}
      className="fixed top-16 z-20 rounded-island border border-island-border bg-island shadow-island"
    >
      <Island
        as="section"
        role="dialog"
        aria-modal="false"
        aria-label={t("panel.label")}
        data-testid="simulation-panel"
        data-area="simulation"
        onKeyDown={event => {
          // → takes a followed scenario's next step here too, but in a field (spec §6.4).
          const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
          if (event.key !== "ArrowRight" || typing || event.metaKey || event.ctrlKey || event.altKey) return;
          if (!hasNext(simulationStore.getState())) return;
          event.preventDefault();
          simulationStore.getState().next();
        }}
        style={{ right: INSPECTOR.margin, width }}
        className="fixed top-16 z-20 flex max-h-[min(calc(100vh-80px),max(280px,calc(100vh-64px-var(--sw-bottom-right,16px))))] flex-col motion-safe:animate-[menu-in_160ms_var(--ease-soft)]"
      >
        {starting ?
          <StartPanel />
        : <RunPanel />}
      </Island>
      <SaveDialog />
      <LeaveDialog />
    </PanelBoundary>
  );
}
