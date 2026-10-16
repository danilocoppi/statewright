// Every command of the editor, with its keys (spec §7.3: all shortcuts are listed in the command palette; §7.8): what
// can be done to the level and the selection now, the tools of the level, the layers, the theme and the language.
import { executableOf } from "statewright/simulate";

import { connection } from "@/agent/connection";
import { LAYERS } from "@/canvas/project";
import { catalogStore } from "@/catalog/state";
import { LANGUAGES } from "@/config/app";
import { focusConversation } from "@/conversation/focus";
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  lastClip,
  paste,
  regionSelection,
  relayout,
  selectAll
} from "@/editing/actions";
import { clipText } from "@/editing/clipboard";
import { editingStore } from "@/editing/state";
import { DOCK_TABS, toolsFor } from "@/editing/tools";
import { openGuide } from "@/guide/links";
import { hasTrigger } from "@/editing/triggers";
import { setLanguage } from "@/i18n/language";
import { toggleInspector } from "@/inspector/state";
import { openFor, simulationStore } from "@/simulate/store";
import { addHighlightCommands, drawnAmong, removeHighlightCommands } from "@/highlights/apply";
import { editorStore } from "@/store/editor";
import { THEMES, useTheme } from "@/stores/theme";
import { useView } from "@/stores/view";

import { exportProject, saveProjectToFile } from "./actions";
import { moveToArea } from "./areas";
import { parentLevel } from "./levels";

/**
 * @typedef {{ id: string, name: string, keys?: string | string[], run: () => void }} Command `keys`: more than one when
 *   any of them does it, the first the one to remember.
 */

/**
 * The commands that apply now: those that change the document only in a tab that may, those about the selection only
 * with one.
 * @param {{ t: (key: string, values?: object) => string, mac: boolean, repository: object, onLevels: () => void,
 *   onStop?: () => void, onConnect?: () => void }} options `onStop`: leave the simulation, as the actions island's
 *   Stop does; `onConnect`: Connect an AI… (AI interface spec §7.4).
 * @returns {Command[]}
 */
export function editorCommands({
  t,
  mac,
  repository,
  onLevels,
  onStop = () => simulationStore.getState().close(),
  onConnect = () => {}
}) {
  const { doc, canvasId, view } = editorStore.getState();
  // While simulating, the document is not edited (simulator spec §6.1): its commands wait, the run's are offered.
  const simulation = simulationStore.getState();
  const simulating = simulation.mode !== null;
  const readOnly = editorStore.getState().readOnly || simulating;
  const runs = executableOf(doc, canvasId);
  const selection = view.selections[canvasId] ?? [];
  const canvas = doc.canvases[canvasId];
  const command = mac ? "⌘" : "Ctrl+";
  const shift = mac ? "⇧⌘" : "Ctrl+Shift+";
  const words = key => t(`inspector:palette.commands.${key}`);
  /** A command, when it applies. */
  const when = (applies, id, name, keys, run) => (applies ? [{ id, name, keys, run }] : []);
  const parent = parentLevel(doc, canvasId);
  const shown = useView.getState();
  const [one, ...others] = selection;
  // F2 renames one box or note; Enter edits one arrow's trigger.
  const nameable = Boolean(one) && !others.length && !one.includes("/") && !canvas.edges[one];
  const copy = () => {
    const clip = copySelection();
    if (clip) globalThis.navigator?.clipboard?.writeText?.(clipText(clip)).catch(() => {});
    return clip;
  };
  const layers = [...LAYERS, "legend", "minimap", "incomplete"];
  return [
    ...when(!readOnly, "layout", words("layout"), ["⇧A", "⇧L"], () => relayout(t)),
    ...when(true, "exportSvg", words("exportSvg"), "⇧E", () => exportProject("svg", t)),
    ...when(true, "save", words("save"), `${command}S`, () => saveProjectToFile(repository, t)),
    ...when(true, "saveCopy", words("saveCopy"), `${shift}S`, () =>
      saveProjectToFile(repository, t, { askLocation: true })
    ),
    ...when(!readOnly, "undo", words("undo"), `${command}Z`, () => editorStore.getState().undo()),
    ...when(!readOnly, "redo", words("redo"), `${shift}Z`, () => editorStore.getState().redo()),
    ...when(true, "fit", words("fit"), ["⇧F", "⇧1"], () => editingStore.getState().zoom("fit")),
    ...when(true, "zoomIn", words("zoomIn"), `${command}+`, () => editingStore.getState().zoom("zoomIn")),
    ...when(true, "zoomOut", words("zoomOut"), `${command}−`, () => editingStore.getState().zoom("zoomOut")),
    ...when(!simulating, "inspector", words("inspector"), "⇧I", toggleInspector),
    ...when(!simulating, "catalog", words("catalog"), "G", () => catalogStore.getState().show()),
    ...(simulating ? []
    : runs.canvas ? [runs.canvas]
    : (runs.inside ?? [])
    ).map(canvas => ({
      id: `simulate-${canvas}`,
      name: t("simulate:commands.simulate", { name: doc.canvases[canvas].name }),
      run: () => openFor(canvas)
    })),
    ...when(simulation.points.length > 1, "back", t("simulate:commands.back"), `${command}Z`, () =>
      simulationStore.getState().back()
    ),
    ...when(simulating, "stop", t("simulate:commands.stop"), undefined, onStop),
    // Each highlight of the project, on the selection's boxes and arrows (highlights spec §6).
    ...(readOnly ? [] : highlightCommands(doc, selection, t)),
    ...when(!readOnly, "insert", words("insert"), "/", () => {
      useView.setState({ insertHint: false });
      editingStore.getState().open({ type: "insert", at: null });
    }),
    ...when(!simulating, "selectAll", words("selectAll"), `${command}A`, selectAll),
    ...when(!readOnly && selection.length > 0, "duplicate", words("duplicate"), `${command}D`, () =>
      duplicateSelection(t)
    ),
    ...when(!readOnly && selection.length > 0, "delete", words("delete"), mac ? "⌫" : "Del", () => deleteSelection(t)),
    ...when(!readOnly && nameable, "rename", words("rename"), "F2", () =>
      editingStore.getState().open({ type: "name", id: one })
    ),
    ...when(
      !readOnly && one && !others.length && hasTrigger(doc, canvasId, one),
      "trigger",
      words("trigger"),
      "↵",
      () => editingStore.getState().open({ type: "trigger", edgeId: one })
    ),
    ...when(!simulating && selection.length > 0, "menu", words("menu"), mac ? "⇧F10" : "Shift+F10", () =>
      editingStore.getState().open({ type: "menu", anchor: "selection" })
    ),
    ...when(selection.length > 0, "copy", words("copy"), `${command}C`, copy),
    ...when(
      !readOnly && selection.length > 0,
      "cut",
      words("cut"),
      `${command}X`,
      () => copy() && deleteSelection(t, t("editing.cut"))
    ),
    ...when(!readOnly && Boolean(lastClip()), "paste", words("paste"), `${command}V`, () => paste(t, lastClip())),
    ...when(
      !readOnly && ["machine", "mixed"].includes(canvas.kind) && selection.length > 0,
      "region",
      words("region"),
      "R",
      () => regionSelection(t)
    ),
    ...when(Boolean(parent), "up", words("up"), "Esc", () => editorStore.getState().setCanvas(parent?.canvas)),
    ...when(true, "levels", words("levels"), "L", onLevels),
    ...when(
      connection.store.getState().status === "connected",
      "message",
      t("agent:conversation.command", { agent: connection.store.getState().agent ?? t("agent:change.anAgent") }),
      "M",
      // Once ⌘K's dialog has closed and the page takes the focus again.
      () => requestAnimationFrame(() => focusConversation())
    ),
    ...when(true, "connect", t("agent:pairing.menu"), undefined, onConnect),
    ...when(true, "guide", words("guide"), undefined, () => openGuide()),
    // Once the palette has closed and given the focus back: until then the page outside it is inert.
    ...when(true, "nextArea", words("nextArea"), "F6", () => requestAnimationFrame(() => moveToArea())),
    ...[...new Map(DOCK_TABS.flatMap(tab => toolsFor(canvas.kind, tab)).map(tool => [tool.id, tool])).values()].flatMap(
      tool =>
        when(
          !readOnly,
          `tool-${tool.id}`,
          t("inspector:palette.commands.tool", { tool: t(`editor:tools.${tool.id}`) }),
          tool.key,
          () => editingStore.getState().setTool(tool.id)
        )
    ),
    ...layers.flatMap(layer =>
      when(
        true,
        `layer-${layer}`,
        t(`inspector:palette.commands.${shown[layer] ? "hide" : "show"}`, { layer: t(`editor:menu.${layer}`) }),
        undefined,
        () => useView.getState().toggle(layer)
      )
    ),
    ...THEMES.flatMap(theme =>
      when(
        true,
        `theme-${theme}`,
        t("inspector:palette.commands.theme", { name: t(`common:theme.${theme}`) }),
        undefined,
        () => useTheme.getState().setTheme(theme)
      )
    ),
    ...LANGUAGES.flatMap(language =>
      when(
        true,
        `language-${language}`,
        t("inspector:palette.commands.language", { name: t(`common:language.${language}`) }),
        undefined,
        () => setLanguage(language)
      )
    )
  ];
}

/** Apply or remove each of the project's highlights on the selected boxes and arrows, one change each. */
function highlightCommands(doc, selection, t) {
  const drawn = drawnAmong(doc, selection);
  if (!drawn.length) return [];
  const run = (commands, label) => commands.length && editorStore.getState().dispatch(commands, { label });
  return Object.entries(doc.catalog.highlights ?? {}).flatMap(([id, highlight]) => {
    const add = addHighlightCommands(doc, drawn, id);
    const remove = removeHighlightCommands(doc, drawn, id);
    const name = highlight.name;
    return [
      ...(add.length ?
        [
          {
            id: `highlight-add-${id}`,
            name: t("inspector:palette.commands.applyHighlight", { name }),
            run: () =>
              run(
                addHighlightCommands(editorStore.getState().doc, drawn, id),
                t("inspector:palette.commands.applyHighlight", { name })
              )
          }
        ]
      : []),
      ...(remove.length ?
        [
          {
            id: `highlight-remove-${id}`,
            name: t("inspector:palette.commands.removeHighlight", { name }),
            run: () =>
              run(
                removeHighlightCommands(editorStore.getState().doc, drawn, id),
                t("inspector:palette.commands.removeHighlight", { name })
              )
          }
        ]
      : [])
    ];
  });
}
