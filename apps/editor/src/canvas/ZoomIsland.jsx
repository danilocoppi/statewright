import { useReactFlow, useStore, useViewport } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import { catalogStore } from "@/catalog/state";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Island } from "@/components/ui/Island";
import { useSimulation } from "@/simulate/store";
import { levelsStore } from "@/stores/levels";
import { currentInspectorWidth } from "@/stores/inspector";

import { MOTION, prefersReducedMotion } from "./useLevelView";
import { fitFor } from "./viewport";

/**
 * Zoom out, the zoom level (back to 100 %), zoom in, and fit the level (spec §6.1, bottom left); then the levels, as L
 * opens them, and the catalog, as G opens it — not while simulating, when the catalog is not offered.
 */
export function ZoomIsland() {
  const { t } = useTranslation("editor");
  const flow = useReactFlow();
  const { zoom } = useViewport();
  const width = useStore(state => state.width);
  const simulating = useSimulation(state => state.mode !== null);
  const duration = () => (prefersReducedMotion() ? 0 : 160);
  return (
    <Island
      role="toolbar"
      aria-label={t("zoom.label")}
      data-testid="zoom-island"
      data-area="zoom"
      className="absolute bottom-4 left-4 z-10 flex h-10 items-center gap-0.5 px-1"
    >
      <IconButton label={t("zoom.out")} onClick={() => flow.zoomOut({ duration: duration() })}>
        <Icon name="minus" />
      </IconButton>
      <button
        type="button"
        aria-label={t("zoom.actual")}
        title={t("zoom.actual")}
        onClick={() => flow.zoomTo(1, { duration: duration() })}
        className="h-8 min-w-12 rounded-control px-1.5 font-mono text-ui tabular-nums text-sub hover:bg-subtle hover:text-ink"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton label={t("zoom.in")} onClick={() => flow.zoomIn({ duration: duration() })}>
        <Icon name="plus" />
      </IconButton>
      <span aria-hidden="true" className="mx-1 h-4 border-l border-hairline" />
      <button
        type="button"
        onClick={() =>
          flow.fitView({
            ...fitFor(width, { beside: simulating, inspector: currentInspectorWidth() }),
            duration: prefersReducedMotion() ? 0 : MOTION.zoom
          })
        }
        title={`${t("zoom.fit")} (⇧F)`}
        aria-keyshortcuts="Shift+F"
        className="h-8 rounded-control px-2.5 text-ui text-sub hover:bg-subtle hover:text-ink"
      >
        {t("zoom.fit")}
      </button>
      <span aria-hidden="true" className="mx-1 h-4 border-l border-hairline" />
      <IconButton
        label={t("levels.title")}
        title={`${t("levels.title")} (L)`}
        aria-keyshortcuts="L"
        onClick={() => levelsStore.getState().show()}
      >
        <Icon name="levels" />
      </IconButton>
      {!simulating && (
        <>
          <IconButton
            label={t("inspector:catalog.label")}
            title={`${t("inspector:catalog.label")} (G)`}
            aria-keyshortcuts="G"
            onClick={() => catalogStore.getState().show()}
          >
            <Icon name="catalog" />
          </IconButton>
        </>
      )}
    </Island>
  );
}
