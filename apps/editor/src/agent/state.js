// What the Editor shows, readable by an agent (AI interface spec §7.2: editor.state, statewright.state()): the route,
// the project, the level shown and the levels down to it, the selection, what is open, the theme and the language, and
// a run when there is one. What is open is read from the page, by the hooks agents find it by (§7.5).
import i18n from "i18next";
import { pathTo } from "statewright";

import { catalogStore } from "@/catalog/state";
import { inspectorStore, subjectOf } from "@/inspector/state";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useTheme } from "@/stores/theme";

/** The dialog open in the page, by its hook or its title; the command palette and the catalog are said apart. */
function dialogOf(page) {
  const open = [...(page?.querySelectorAll("dialog[open]") ?? [])].filter(
    dialog => !["palette", "catalog-sheet"].includes(dialog.dataset.testid)
  );
  const dialog = open.at(-1);
  if (!dialog) return null;
  const title = dialog.getAttribute("aria-labelledby");
  const name = (title && page.getElementById(title)?.textContent) || dialog.getAttribute("aria-label") || null;
  return { id: dialog.dataset.testid ?? null, name };
}

/** The level shown and the levels from the top down to it, with their names. */
function levelsOf(doc, canvasId) {
  const named = id => ({ canvas: id, name: doc.canvases[id]?.name ?? id, kind: doc.canvases[id]?.kind ?? null });
  const trail = (pathTo(doc, canvasId) ?? [{ canvas: canvasId }]).map(step => named(step.canvas));
  return { level: named(canvasId), trail };
}

/**
 * The Editor's state as an agent reads it.
 * @param {{ page?: Document, location?: Location }} [where]
 */
export function editorStateOf({ page = globalThis.document, location = globalThis.location } = {}) {
  const { doc, canvasId, readOnly, view } = editorStore.getState();
  const simulation = simulationStore.getState();
  const simulating = simulation.mode !== null;
  const selection = doc ? (view.selections[canvasId] ?? []) : [];
  const shown = id => Boolean(page?.querySelector(`[data-testid="${id}"]`));
  const openDialog = id => Boolean(page?.querySelector(`[data-testid="${id}"][open]`));
  return {
    route: location?.pathname ?? "",
    project: doc ? { id: doc.project.id, name: doc.project.name, readOnly } : null,
    ...(doc ? levelsOf(doc, canvasId) : { level: null, trail: [] }),
    selection,
    open: {
      inspector: doc && !simulating ? subjectOf(inspectorStore.getState(), selection) : null,
      problems: shown("problems-panel"),
      catalog: catalogStore.getState().open,
      palette: openDialog("palette"),
      dialog: dialogOf(page),
      simulation: simulating,
      stage: simulation.stage
    },
    theme: page?.documentElement.classList.contains("dark") ? "dark" : "light",
    themeSetting: useTheme.getState().theme,
    language: i18n.language ?? null,
    run:
      simulation.mode === "run" ?
        {
          canvas: simulation.canvas,
          shown: simulation.shown ?? simulation.points.length - 1,
          steps: Math.max(0, simulation.points.length - 1),
          question: simulation.asking?.question ?? null,
          failure: simulation.failure ? { code: simulation.failure.code, message: simulation.failure.message } : null
        }
      : null
  };
}
