import i18n from "i18next";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

import { ConnectDialog } from "@/agent/ConnectDialog";
import { PairedBadge } from "@/agent/PairedBadge";
import { useRepository } from "@/app/repository";
import { Canvas } from "@/canvas/Canvas";
import { findingStore } from "@/canvas/findings";
import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { PanelBoundary } from "@/components/PanelBoundary";
import { SupportBadge } from "@/components/SupportBadge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Chip";
import { Island } from "@/components/ui/Island";
import {
  ARROWS,
  copySelection,
  deleteSelection,
  duplicateSelection,
  neighbour,
  nudgeSelection,
  paste,
  regionSelection,
  relayout,
  selectAll
} from "@/editing/actions";
import { clipFrom, clipText } from "@/editing/clipboard";
import { editingStore } from "@/editing/state";
import { ToolDock } from "@/editing/ToolDock";
import { toolForKey } from "@/editing/tools";
import { hasTrigger } from "@/editing/triggers";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore, toggleInspector, useSubject } from "@/inspector/state";
import { startAutosave } from "@/persistence/autosave";
import { CommandPalette } from "@/palette/CommandPalette";
import { lockProject } from "@/persistence/lock";
import { problemsStore } from "@/problems/store";
import { watchProblems } from "@/problems/watch";
import { storageReason } from "@/persistence/repository";
import { SimulationPanel } from "@/simulate/Panel";
import { SimulateAction, SimulatingStatus } from "@/simulate/SimulateAction";
import { Stage } from "@/simulate/Stage";
import { hasNext } from "@/simulate/runs";
import { isSimulating, simulationStore, useSimulation } from "@/simulate/store";
import { editorStore, useEditor } from "@/store/editor";
import { toast } from "@/stores/toast";
import { useView } from "@/stores/view";
import { problemsClient } from "@/workers";

import { exportProject, saveProjectToFile } from "./actions";
import { moveToArea } from "./areas";
import { editorCommands } from "./commands";
import { Breadcrumb } from "./Breadcrumb";
import { downloadDocumentCopy } from "./download-copy";
import { EditActions } from "./EditActions";
import { ExportMenu } from "./ExportMenu";
import { LevelsDialog } from "./LevelsDialog";
import { ProblemsButton } from "./ProblemsButton";
import { ProblemsPanel } from "./ProblemsPanel";
import { levelUrl, parentLevel } from "./levels";
import { ProjectIsland } from "./ProjectIsland";
import { RenameDialog } from "./RenameDialog";
import { isMac, ownsClipboard, shortcutFor } from "./shortcuts";

/**
 * Load the project into the editor store, on the level the address names, and keep it saved and locked while the page
 * is open.
 */
/** What is open over the canvas, typed in, and the canvas's keys that wait while it is. */
const POPOVERS = new Set(["trigger", "insert", "draft"]);
const WAITING = new Set(["undo", "redo", "selectAll", "duplicate"]);
/** While simulating the document is not edited (simulator spec §6.1): these keys wait, and ⌘Z goes back one step. */
const SIMULATION_WAITS = new Set([
  "undo",
  "redo",
  "selectAll",
  "duplicate",
  "delete",
  "select",
  "menu",
  "region",
  "rename",
  "trigger",
  "tool",
  "insert",
  "layout",
  "inspector",
  "catalog"
]);

function useOpenProject(projectId, canvasId) {
  const repository = useRepository();
  const [state, setState] = useState("loading");
  const autosave = useRef(null);
  const lock = useRef(null);
  const level = useRef(canvasId);
  useEffect(() => {
    level.current = canvasId;
  }, [canvasId]);

  useEffect(() => {
    let active = true;
    const reload = async ({ readOnly = false } = {}) => {
      // A stored copy that cannot be read leaves what is shown as it is.
      const doc = await repository.load(projectId).catch(() => null);
      if (active && doc) editorStore.getState().open(doc, { canvasId: editorStore.getState().canvasId, readOnly });
    };
    repository.load(projectId).then(
      doc => {
        if (!active) return;
        if (!doc) return setState("missing");
        // Straight onto the level in the address, so the levels above are neither shown nor arranged first.
        editorStore.getState().open(doc, { canvasId: level.current });
        autosave.current = startAutosave({ store: editorStore, repository });
        lock.current = lockProject(projectId, {
          // Handing the project to another tab (spec §4.7): no change gets in from here on, and the last one is stored.
          beforeRelease: () => {
            editorStore.getState().setReadOnly(true);
            return autosave.current.flush({ force: true });
          },
          onChange: mode => {
            const wasReadOnly = editorStore.getState().readOnly;
            editorStore.getState().setReadOnly(mode !== "editing");
            if (wasReadOnly && mode === "editing") {
              // What this tab could not store when it handed the project over is offered as a file before the stored
              // version replaces it (spec §10: no work is lost).
              const { doc: kept, status } = editorStore.getState();
              if (status.dirty) {
                toast.error(i18n.t("editor:status.notKept", { name: kept.project.name }), {
                  action: { label: i18n.t("editor:status.downloadCopy"), onClick: () => downloadDocumentCopy(kept) }
                });
              }
              reload();
            }
            // Handed over: show what is stored — unless this tab's last change could not be stored; then it stays, to
            // be saved to a file (spec §10: no work is lost).
            if (mode === "released" && !editorStore.getState().status.dirty) reload({ readOnly: true });
          }
        });
        setState("ready");
      },
      () => active && setState("damaged")
    );
    return () => {
      active = false;
      lock.current?.dispose();
      autosave.current?.stop();
      const { doc, version, readOnly } = editorStore.getState();
      editorStore.getState().close();
      simulationStore.getState().close();
      inspectorStore.getState().reset();
      catalogStore.getState().close();
      // Leaving after changes: store the final version with a fresh thumbnail for the Projects screen. The repository
      // runs it after any save in progress, and the next screen's reads wait for it. If the browser refuses, say so and
      // offer the document as a file, so no work is lost.
      if (doc && version > 0 && !readOnly) {
        repository.save(doc, { thumbnail: true }).catch(error =>
          toast.error(
            i18n.t("editor:status.leaveFailed", {
              name: doc.project.name,
              reason: i18n.t(`editor:status.reasons.${storageReason(error?.name)}`)
            }),
            { action: { label: i18n.t("editor:status.downloadCopy"), onClick: () => downloadDocumentCopy(doc) } }
          )
        );
      }
    };
  }, [repository, projectId]);

  return { state, repository, retry: () => autosave.current?.flush(), takeOver: () => lock.current?.takeOver() };
}

/** The editor (spec §6.1). In plan E1 the canvas is Core's rendering of the level; E2 makes it interactive. */
export default function EditorPage() {
  const { t } = useTranslation(["editor", "projects", "common", "simulate"]);
  const { projectId, canvasId } = useParams();
  const { state, repository, retry, takeOver } = useOpenProject(projectId, canvasId);
  const doc = useEditor(store => store.doc);
  const readOnly = useEditor(store => store.readOnly);
  const saveError = useEditor(store => store.status.error);
  const [renaming, setRenaming] = useState(false);
  const [levels, setLevels] = useState(false);
  const [problems, setProblems] = useState(false);
  const [palette, setPalette] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const insertHint = useView(state => state.insertHint);
  const inspecting = useSubject() !== null;
  const simulating = useSimulation(state => state.mode !== null);
  const running = useSimulation(state => state.mode === "run");
  const presenting = useSimulation(state => state.stage);
  const problemsButton = useRef(null);
  const closeProblems = () => {
    setProblems(false);
    problemsButton.current?.focus();
  };
  const navigate = useNavigate();
  const shown = useRef(canvasId);
  // Stop (spec §6.1): the run is left and the design is given back, the focus back on Simulate — once the person has
  // said what becomes of steps no scenario holds.
  const stopSimulating = () => {
    if (simulationStore.getState().leave("stop")) {
      requestAnimationFrame(() => globalThis.document?.querySelector("[data-simulate]")?.focus());
    }
  };
  const mac = isMac();

  // Live Problems (spec §4.3): checked in the Problems worker while the project is open.
  useEffect(() => {
    if (state !== "ready") return;
    return watchProblems({ editor: editorStore, problems: problemsStore, client: problemsClient() });
  }, [state]);

  // The address is the level shown (spec §4.6): it sets the store's level, and a level the store moves to by itself
  // (undoing a change made on another level) becomes the address. An address naming a level the project does not
  // have (an old link) shows the top level, and its address.
  useEffect(() => {
    shown.current = canvasId;
    if (state !== "ready") return;
    const { doc } = editorStore.getState();
    if (canvasId && !doc.canvases[canvasId]) navigate(levelUrl(doc, doc.root), { replace: true });
    else editorStore.getState().setCanvas(canvasId ?? doc.root);
  }, [state, canvasId, navigate]);
  useEffect(() => {
    if (state !== "ready") return;
    return editorStore.subscribe((now, before) => {
      if (!now.doc || now.canvasId === before.canvasId) return;
      if (now.canvasId !== (shown.current ?? now.doc.root)) navigate(levelUrl(now.doc, now.canvasId));
    });
  }, [state, navigate]);

  useEffect(() => {
    if (state !== "ready") return;
    // Capture: Esc must see the selection before the canvas clears it.
    const onKeyDown = event => {
      // A badge's findings shown over the canvas: Esc is theirs (FindingPopover closes them), and does nothing else.
      if (event.key === "Escape" && findingStore.getState().shown) return;
      // The stage has keys of its own (simulator spec §7.1); Esc leaves it even when it could not be shown.
      if (simulationStore.getState().stage) {
        if (event.key === "Escape") simulationStore.getState().leaveStage();
        return;
      }
      const action = shortcutFor(event, { mac });
      if (!action) return;
      // While a trigger, insert by name or a box being named is open over the canvas, the canvas's own keys wait.
      if (POPOVERS.has(editingStore.getState().editor?.type) && WAITING.has(action)) return;
      if (isSimulating() && SIMULATION_WAITS.has(action)) {
        if (action !== "undo") return;
        event.preventDefault();
        simulationStore.getState().back();
        return;
      }
      if (action === "up" && problems && problemsButton.current?.contains(event.target)) {
        // Esc right after opening the panel, with the focus still on its button, closes it.
        closeProblems();
        event.stopPropagation();
        return;
      }
      if (action === "up" && editingStore.getState().tool !== "select") {
        // Esc puts the tool in hand down first.
        editingStore.getState().setTool("select");
        event.stopPropagation();
        return;
      }
      if (action === "up") {
        const { doc, canvasId, view } = editorStore.getState();
        if (view.selections[canvasId]?.length) {
          editorStore.getState().select([]);
          event.stopPropagation();
        } else {
          const parent = parentLevel(doc, canvasId);
          if (parent) navigate(levelUrl(doc, parent.canvas));
        }
        return;
      }
      event.preventDefault();
      // → takes a followed scenario's next step (simulator spec §6.4), where it is not moving between boxes.
      if (action === "arrow" && event.key === "ArrowRight" && !event.target.closest?.(".react-flow__node")) {
        if (hasNext(simulationStore.getState())) return simulationStore.getState().next();
      }
      if (action === "arrow") return arrow(event);
      if (action === "select") return toggle(event);
      if (action === "delete") deleteSelection(t);
      if (action === "selectAll") selectAll();
      if (action === "duplicate") duplicateSelection(t);
      if (action === "region") regionSelection(t);
      if (action === "rename") return rename(event);
      // With an edge selected, Enter is its trigger's, before the box that has the focus.
      if (action === "trigger") return openTrigger() && event.stopPropagation();
      if (action === "layout") return void relayout(t);
      if (action === "inspector") return toggleInspector();
      if (action === "palette") return setPalette(true);
      if (action === "nextArea" || action === "previousArea") return void moveToArea(action === "previousArea");
      if (action === "catalog") return catalogStore.getState().show();
      if (action === "fit" || action === "zoomIn" || action === "zoomOut") return editingStore.getState().zoom(action);
      if (action === "insert") {
        if (editorStore.getState().readOnly) return;
        useView.setState({ insertHint: false });
        editingStore.getState().open({ type: "insert", at: null });
        return;
      }
      if (action === "tool") {
        const { doc, canvasId, readOnly } = editorStore.getState();
        const tool = toolForKey(doc.canvases[canvasId].kind, event.key);
        if (tool && !readOnly) editingStore.getState().setTool(tool.id);
        return;
      }
      if (action === "menu") editingStore.getState().open({ type: "menu", anchor: "selection" });
      if (action === "save") saveProjectToFile(repository, t);
      if (action === "saveCopy") saveProjectToFile(repository, t, { askLocation: true });
      if (action === "exportSVG") exportProject("svg", t);
      if (action === "undo") editorStore.getState().undo();
      if (action === "redo") editorStore.getState().redo();
    };
    // Arrows nudge the selection (Shift ×10); with nothing selected they move to the connected box that way.
    const arrow = event => {
      const [dx, dy] = ARROWS[event.key];
      const { doc, canvasId, view, readOnly } = editorStore.getState();
      const step = event.shiftKey ? 10 : 1;
      if (view.selections[canvasId]?.length && !readOnly && !isSimulating()) {
        return nudgeSelection(t, dx * step, dy * step);
      }
      const from = event.target.closest?.(".react-flow__node")?.dataset.id;
      const to = from && neighbour(doc, canvasId, from, [dx, dy]);
      if (to) document.querySelector(`.react-flow__node[data-id="${to}"]`)?.focus();
    };
    // Enter opens the trigger editor of the one selected edge; it says whether it did.
    const openTrigger = () => {
      const { doc, canvasId, view, readOnly } = editorStore.getState();
      const [id, ...more] = view.selections[canvasId] ?? [];
      if (readOnly || !id || more.length || !hasTrigger(doc, canvasId, id)) return false;
      editingStore.getState().open({ type: "trigger", edgeId: id });
      return true;
    };
    // F2 renames the one selected box or note, or the focused box.
    const rename = event => {
      const { canvasId, view, readOnly } = editorStore.getState();
      const selection = view.selections[canvasId] ?? [];
      const id = selection.length === 1 ? selection[0] : event.target.closest?.(".react-flow__node")?.dataset.id;
      if (id && !readOnly && !id.includes("/")) editingStore.getState().open({ type: "name", id });
    };
    // Space selects the focused box (Shift adds it to the selection, or takes it out).
    const toggle = event => {
      const id = event.target.closest(".react-flow__node").dataset.id;
      const { canvasId, view } = editorStore.getState();
      const current = view.selections[canvasId] ?? [];
      const next =
        !event.shiftKey ? [id]
        : current.includes(id) ? current.filter(item => item !== id)
        : [...current, id];
      editorStore.getState().select(next);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [state, mac, repository, t, navigate, problems]);

  // Copy, cut and paste (spec §7.3) travel through the system clipboard as text, so they work across tabs and
  // projects; in a field, a dialog, the Problems panel or with text selected, they are the browser's own.
  useEffect(() => {
    if (state !== "ready") return;
    const own = event => ownsClipboard(event.target) || Boolean(globalThis.getSelection?.()?.toString());
    const onCopy = event => {
      if (own(event)) return;
      const clip = copySelection();
      if (!clip) return;
      event.clipboardData.setData("text/plain", clipText(clip));
      event.preventDefault();
      if (event.type === "cut") deleteSelection(t, t("editing.cut"));
    };
    const onPaste = event => {
      if (own(event) || isSimulating()) return;
      const clip = clipFrom(event.clipboardData?.getData("text/plain") ?? "");
      if (!clip) return;
      event.preventDefault();
      paste(t, clip);
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [state, t]);

  if (state === "missing" || state === "damaged") {
    const words = state === "missing" ? "notFound" : "damaged";
    return (
      <main className="grid min-h-screen place-items-center bg-dots px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-page font-semibold tracking-tight">{t(`${words}.title`)}</h1>
          <p className="mt-2 text-read text-sub">{t(`${words}.description`)}</p>
          <Link to="/" className="mt-5 inline-block font-medium text-accent hover:underline">
            {t("common:actions.goHome")}
          </Link>
        </div>
      </main>
    );
  }
  if (state !== "ready" || !doc) return <div className="fixed inset-0 bg-dots" aria-busy="true" />;

  const reason = storageReason(saveError);
  return (
    <main className="fixed inset-0 overflow-hidden bg-dots">
      <PanelBoundary className="absolute inset-0">
        <Canvas onNavigate={id => navigate(levelUrl(doc, id))} />
      </PanelBoundary>

      {presenting && (
        <PanelBoundary resetKey="stage" className="fixed inset-0 z-40 bg-canvas">
          <Stage />
        </PanelBoundary>
      )}
      {/* Presenting, the stage takes the islands' place (simulator spec §7.1: "no editing islands"). */}
      {!presenting && (
        <>
          {/* The islands across the top (spec §6.1): the project at the left, the actions at the right and the levels
          between them — centred while there is room, and never under either: short of room, the levels above the one
          shown give way. A window under 900 px, too narrow to name that level in full, leaves the levels out (the
          level's heading on the canvas names it; Levels…, ⌘K and Esc lead elsewhere), and the project's name gives
          way to the actions, which stay whole. */}
          <div className="pointer-events-none fixed inset-x-4 top-4 z-40 grid grid-cols-[minmax(max-content,1fr)_minmax(0,auto)_minmax(max-content,1fr)] items-start gap-3 *:pointer-events-auto max-[900px]:grid-cols-[minmax(0,1fr)_max-content]">
            <ProjectIsland
              mac={mac}
              onRename={() => setRenaming(true)}
              onLevels={() => setLevels(true)}
              onSave={() => saveProjectToFile(repository, t)}
              onSaveCopy={() => saveProjectToFile(repository, t, { askLocation: true })}
              onConnect={() => setConnecting(true)}
            />
            <Breadcrumb />
            <Island
              role="group"
              aria-label={t("islands.actions")}
              data-testid="actions-island"
              data-area="actions"
              className="flex h-10 items-center gap-1 justify-self-end px-1.5"
            >
              <PairedBadge />
              {running ?
                <SimulatingStatus onStop={stopSimulating} />
              : <>
                  <ProblemsButton ref={problemsButton} open={problems} onToggle={() => setProblems(open => !open)} />
                  <span aria-hidden="true" className="mx-0.5 h-4 border-l border-hairline" />
                  {!readOnly && !simulating && <EditActions mac={mac} />}
                  <SimulateAction />
                  <ExportMenu />
                </>
              }
            </Island>
          </div>
          {!readOnly && !simulating && <ToolDock />}
          {/* At the bottom right, under the minimap and the legend (Canvas.jsx stacks them above it). */}
          <SupportBadge />
          {!readOnly && !simulating && insertHint && (
            <Island className="pointer-events-none fixed bottom-9 left-1/2 z-10 flex h-9 -translate-x-1/2 items-center gap-1.5 px-3.5 text-ui text-sub">
              <Trans t={t} i18nKey="insert.hint" components={{ key: <Kbd /> }} />
            </Island>
          )}
          {simulating ?
            <SimulationPanel />
          : <Inspector />}
          {problems && (
            <ProblemsPanel
              beside={inspecting || simulating}
              onClose={closeProblems}
              onNavigate={id => navigate(levelUrl(doc, id))}
            />
          )}

          <div className="fixed left-1/2 top-16 z-20 grid w-[min(620px,calc(100vw-32px))] -translate-x-1/2 gap-2">
            {readOnly && (
              <Banner
                tone="info"
                actions={
                  <Button size="sm" variant="primary" onClick={takeOver}>
                    {t("lock.editHere")}
                  </Button>
                }
              >
                {t("lock.readOnly")}
              </Banner>
            )}
            {saveError && (
              <Banner
                actions={
                  <>
                    {/* Read-only, storing from here would write over the other tab's work: Save to file only. */}
                    {!readOnly && (
                      <Button size="sm" variant="ghost" onClick={retry}>
                        {t("status.retry")}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => saveProjectToFile(repository, t)}>
                      {t("menu.saveToFile")}
                    </Button>
                  </>
                }
              >
                {t("status.failed", { reason: t(`status.reasons.${reason}`) })}
              </Banner>
            )}
            {!repository.persistent && (
              <Banner
                actions={
                  <Button size="sm" onClick={() => saveProjectToFile(repository, t)}>
                    {t("menu.saveToFile")}
                  </Button>
                }
              >
                {t("projects:storage")}
              </Banner>
            )}
          </div>

          {connecting && <ConnectDialog onClose={() => setConnecting(false)} />}
          <LevelsDialog open={levels} onClose={() => setLevels(false)} onNavigate={id => navigate(levelUrl(doc, id))} />
          <CatalogSheet onNavigate={id => navigate(levelUrl(doc, id))} />
          <CommandPalette
            open={palette}
            onClose={() => setPalette(false)}
            commands={
              palette ?
                editorCommands({
                  t,
                  mac,
                  repository,
                  onLevels: () => setLevels(true),
                  onStop: stopSimulating,
                  onConnect: () => setConnecting(true)
                })
              : []
            }
          />
          {renaming && (
            <RenameDialog
              name={doc.project.name}
              onClose={() => setRenaming(false)}
              onRename={name => {
                setRenaming(false);
                editorStore.getState().dispatch([{ type: "project.update", args: { set: { name } } }], {
                  label: t("rename.label")
                });
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
