// Following a link (a `ref` box, "a shortcut to another canvas, node, definition or catalog item"): a double-click, Enter
// or its go-to mark goes where it leads. A box or an arrow is shown on its level, selected and lit by the beacon; a level
// or a reusable part's body opens; a catalog item opens in the catalog; the project shows its details. Leaving a level
// this way keeps the way back: Esc (with nothing selected) returns to the link, selected — as the browser's Back does —
// until the person leaves the level the link led to some other way.
import i18n from "i18next";
import { buildIndex } from "statewright";
import { createStore } from "zustand/vanilla";

import { catalogStore } from "@/catalog/state";
import { inspectorStore } from "@/inspector/state";
import { isSimulating } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { toast } from "@/stores/toast";

import { beacon } from "./beacon";

/**
 * @typedef {{ kind: "element", canvas: string, id: string } | { kind: "canvas", canvas: string }
 *   | { kind: "definition", definition: string, canvas: string } | { kind: "catalog", collection: string, item: string }
 *   | { kind: "details", id: string } | { kind: "missing", id: string }} Destination
 * @typedef {{ from: string, ref: string, to: string }} Step A link followed to another level: where it is, and where it
 *   led.
 */

/** Elements drawn on a level that can be selected there. */
const ON_LEVEL = new Set(["node", "edge"]);
/** Elements of a level that are not selected on it: the level itself is shown. */
const OF_LEVEL = new Set(["region", "lane", "scenario"]);

/**
 * Where a link's target is: a box or an arrow on its level, a level, a reusable part (its body), a catalog item, an
 * element shown in the inspector (the project, a finding), or nothing any more.
 * @returns {Destination}
 */
export function resolveTarget(doc, id) {
  const entry = buildIndex(doc).get(id);
  if (!entry) return { kind: "missing", id };
  if (ON_LEVEL.has(entry.type)) return { kind: "element", canvas: entry.canvas, id };
  if (entry.type === "note") return { kind: "element", canvas: entry.value.canvas, id };
  if (entry.type === "canvas") return { kind: "canvas", canvas: id };
  if (OF_LEVEL.has(entry.type)) return { kind: "canvas", canvas: entry.canvas ?? entry.value.canvas };
  if (entry.type === "definition") {
    const body = entry.value.canvas;
    return doc.canvases[body] ? { kind: "definition", definition: id, canvas: body } : { kind: "missing", id };
  }
  if (entry.type === "catalog") return { kind: "catalog", collection: entry.collection, item: id };
  return { kind: "details", id };
}

/** The links followed to other levels, the last one last: the way back. */
export const followStore = createStore(() => ({
  /** @type {Step[]} */
  trail: []
}));

/** The target of a link of the level shown, or null when the box is no link. */
function targetOf(id) {
  const { doc, canvasId } = editorStore.getState();
  const node = doc?.canvases[canvasId]?.nodes[id];
  return node?.kind === "ref" ? node.target : null;
}

/** Show another level, keeping the way back to the link. */
function leaveFor(canvas, ref) {
  const { canvasId } = editorStore.getState();
  if (canvas === canvasId) return;
  followStore.setState(state => ({ trail: [...state.trail, { from: canvasId, ref, to: canvas }] }));
  editorStore.getState().setCanvas(canvas);
}

/**
 * Follow a link of the level shown. While simulating, nothing is selected (simulator spec §6.1): the target is only
 * shown.
 * @param {string} id The link's ID.
 * @returns {boolean} Whether the box is a link (and so the key or the click was its).
 */
export function followRef(id) {
  const target = targetOf(id);
  if (target === null) return false;
  const editor = editorStore.getState();
  const to = resolveTarget(editor.doc, target);
  if (to.kind === "missing") {
    toast.info(i18n.t("editor:canvas.refMissing"));
    return true;
  }
  const selecting = !isSimulating();
  // The link stays selected on its level: the way back (Esc, the browser's Back) finds it so.
  if (selecting) editor.select([id], editor.canvasId);
  if (to.kind === "element") {
    leaveFor(to.canvas, id);
    if (selecting) editor.select([to.id], to.canvas);
    editor.reveal(to.canvas, to.id);
    beacon(to.canvas, [to.id]);
  }
  if (to.kind === "canvas" || to.kind === "definition") leaveFor(to.canvas, id);
  if (to.kind === "catalog") catalogStore.getState().show({ collection: to.collection, item: to.item });
  if (to.kind === "details") inspectorStore.getState().show(to.id);
  return true;
}

/** Enter with the focus on no box: follow the one link selected. @returns {boolean} Whether there was one. */
export function followSelection() {
  const { canvasId, view } = editorStore.getState();
  const [id, ...more] = view.selections[canvasId] ?? [];
  return Boolean(id) && !more.length && followRef(id);
}

/**
 * Esc, with nothing selected, on the level a link led to: back to the link's level, the link selected.
 * @returns {boolean} Whether there was a way back (otherwise Esc goes up a level).
 */
export function returnFromRef() {
  const { doc, canvasId } = editorStore.getState();
  const step = followStore.getState().trail.at(-1);
  if (!step || step.to !== canvasId || !doc.canvases[step.from]) return false;
  followStore.setState(state => ({ trail: state.trail.slice(0, -1) }));
  editorStore.getState().setCanvas(step.from);
  if (!isSimulating() && doc.canvases[step.from].nodes[step.ref]) editorStore.getState().select([step.ref], step.from);
  return true;
}

/**
 * Forget the way back once the person leaves the level a link led to any other way (up, down, the levels, Back), and
 * when the project closes.
 * @returns {() => void} Stops watching.
 */
export function watchFollows() {
  const stop = editorStore.subscribe((now, before) => {
    if (now.canvasId === before.canvasId) return;
    const { trail } = followStore.getState();
    if (trail.length && trail.at(-1).to !== now.canvasId) followStore.setState({ trail: [] });
  });
  return () => {
    stop();
    followStore.setState({ trail: [] });
  };
}
