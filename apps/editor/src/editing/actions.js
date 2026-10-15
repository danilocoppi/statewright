// What the editor's keys and menus do to the current level's selection (spec §7.3): select all, delete, nudge,
// duplicate, copy and paste — each one change, refused where it would happen when Core says no.
import { isSimulating } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { layoutClient } from "@/workers";

import {
  addNode,
  alignCommands,
  boxesOf,
  distributeCommands,
  nudgeCommands,
  regionCommands,
  removeCommands
} from "./changes";
import { copyOf, duplicateCommands, pasteCommands } from "./clipboard";
import { idsFor } from "./ids";
import { asksAfterConnect, connectCommands, connectRefusal, placeRefusal } from "./connect";
import { placeCommands } from "./place";
import { change, editingStore } from "./state";

/** The open level, what is selected on it, and whether this tab may change it. */
function current() {
  const { doc, canvasId, view, readOnly } = editorStore.getState();
  // While simulating, the document is not edited (simulator spec §6.1).
  return { doc, canvasId, readOnly: readOnly || isSimulating(), selection: view.selections[canvasId] ?? [] };
}

/** The middle of some elements' boxes: where a change to them is said to happen. */
export function centreOf(doc, canvasId, ids) {
  const boxes = boxesOf(doc, canvasId);
  const chosen = ids.map(id => boxes.get(id)).filter(Boolean);
  if (!chosen.length) return editingStore.getState().pointer ?? { x: 0, y: 0 };
  const left = Math.min(...chosen.map(box => box.x));
  const right = Math.max(...chosen.map(box => box.x + box.w));
  const top = Math.min(...chosen.map(box => box.y));
  return { x: (left + right) / 2, y: top };
}

/** Select every box and note of the level (⌘A). */
export function selectAll() {
  const { doc, canvasId } = current();
  editorStore.getState().select([...boxesOf(doc, canvasId).keys()]);
}

/**
 * Remove what is selected (Delete, or the second half of a cut): boxes go with their edges and interiors (Core
 * cascades).
 * @param {(key: string) => string} t The `editor` texts, for the undo entry's label.
 * @param {string} [label] The undo entry's label; a deletion by default.
 */
export function deleteSelection(t, label = t("editing.delete")) {
  const { doc, canvasId, selection, readOnly } = current();
  if (!selection.length || readOnly) return;
  const { ok } = change(removeCommands(doc, selection), {
    label,
    at: centreOf(doc, canvasId, selection)
  });
  if (ok) editorStore.getState().select([]);
}

/** Move what is selected by an offset (arrow keys; Shift ×10). Nudges in a row are one undo entry. */
export function nudgeSelection(t, dx, dy) {
  const { doc, canvasId, selection, readOnly } = current();
  if (!selection.length || readOnly) return;
  change(nudgeCommands(doc, canvasId, selection, dx, dy), {
    label: t("editing.move"),
    at: centreOf(doc, canvasId, selection),
    coalesceKey: `nudge:${[...selection].sort().join(",")}`
  });
}

/** Duplicate what is selected a little below and to the right (⌘D), and select the copies. */
export function duplicateSelection(t) {
  const { doc, canvasId, selection, readOnly } = current();
  const result = !readOnly && selection.length ? duplicateCommands(doc, canvasId, selection) : null;
  if (!result) return;
  const at = centreOf(doc, canvasId, selection);
  if ("refusal" in result) {
    editingStore.getState().refuse({ reason: result.refusal, at });
    return;
  }
  const { ok } = change(result.commands, { label: t("editing.duplicate"), at });
  if (ok) editorStore.getState().select(result.ids);
}

/** The last copy made in this tab: menus paste it, where no clipboard event carries one. */
let lastCopy = null;
export const lastClip = () => lastCopy;

/**
 * What a copy of the selection holds (⌘C), or null when nothing copyable is selected.
 * @returns {import("./clipboard").Clip | null}
 */
export function copySelection() {
  const { doc, canvasId, selection } = current();
  const clip = selection.length ? copyOf(doc, canvasId, selection) : null;
  if (clip) lastCopy = clip;
  return clip;
}

/**
 * Paste copied elements on the level (⌘V), their top-left corner where asked (the point the canvas menu was opened
 * at), else where the pointer is over the canvas, else in the middle of the view; the pasted elements are selected.
 * Without a canvas shown, a little below and to the right of where they were copied.
 * @param {(key: string) => string} t
 * @param {import("./clipboard").Clip} clip
 * @param {import("./state").Point} [point]
 */
export function paste(t, clip, point) {
  const { doc, canvasId, readOnly } = current();
  if (readOnly) return;
  const { pointer, centre } = editingStore.getState();
  const place = point ?? pointer ?? centre?.() ?? null;
  const at = place ?? centreOf(doc, canvasId, []);
  let result;
  try {
    result = pasteCommands(doc, canvasId, clip, place ? { at: place } : { offset: [24, 24] });
  } catch (error) {
    // A clip of the right shape whose parts do not hold together (written by hand, or by another version).
    editingStore.getState().refuse({ reason: "other", message: error.message, at });
    return;
  }
  if ("refusal" in result) {
    editingStore.getState().refuse({ reason: result.refusal, at });
    return;
  }
  const { ok } = change(result.commands, { label: t("editing.paste"), at });
  if (ok) editorStore.getState().select(result.ids);
}

/** Line up what is selected (context menu: Align …). */
export function alignSelection(t, how) {
  const { doc, canvasId, selection, readOnly } = current();
  if (readOnly) return;
  change(alignCommands(doc, canvasId, selection, how), {
    label: t("editing.align"),
    at: centreOf(doc, canvasId, selection)
  });
}

/** Space what is selected evenly (context menu: Distribute …). */
export function distributeSelection(t, axis) {
  const { doc, canvasId, selection, readOnly } = current();
  if (readOnly) return;
  change(distributeCommands(doc, canvasId, selection, axis), {
    label: t("editing.distribute"),
    at: centreOf(doc, canvasId, selection)
  });
}

/** Make the selected nodes of a machine a region of their own (R, spec §7.1). */
export function regionSelection(t) {
  const { doc, canvasId, selection, readOnly } = current();
  const regions = Object.keys(doc.canvases[canvasId].regions ?? {}).length;
  const names = {
    first: t("editing.regionFirst"),
    next: t("editing.regionNext", { number: regions ? regions + 1 : 2 })
  };
  const result = readOnly ? null : regionCommands(doc, canvasId, selection, names);
  if (result) change(result.commands, { label: t("editing.region"), at: centreOf(doc, canvasId, selection) });
}

/**
 * Place a tool's element where the person clicked or dropped it (spec §7.2), select it, and close what was open; a
 * refusal is said where it would have gone.
 * @param {import("./tools").Tool} tool
 * @param {{ x: number, y: number }} at
 * @param {Parameters<typeof placeCommands>[4]} [choice]
 * @returns {string | null} The new element's ID.
 */
export function placeTool(t, tool, at, choice = {}) {
  const { doc, canvasId, readOnly } = current();
  editingStore.getState().close();
  if (readOnly) return null;
  const names = { state: t("projects:new.firstState"), end: t("projects:new.end") };
  const result = placeCommands(doc, canvasId, tool, at, { names, ...choice });
  if ("refusal" in result) {
    editingStore.getState().refuse({ reason: result.refusal, at });
    return null;
  }
  const label = t("editing.add", { what: t(`tools.${tool.id}`).toLowerCase() });
  const { ok } = change(result.commands, { label, at });
  if (!ok) return null;
  askAbout(result.edgeId, result.id);
  return result.id;
}

/**
 * Start placing a tool's element at a point (spec §7.2): a box with no name or choice is added at once; the others are
 * named or chosen in place first. The tool goes back to Select.
 */
export function startTool(t, tool, at) {
  editingStore.getState().setTool("select");
  if (editorStore.getState().readOnly) return;
  if (tool.node && !tool.named && !tool.needs) placeTool(t, tool, at);
  else editingStore.getState().open({ type: "draft", tool: tool.id, at });
}

/**
 * Insert a node found by name (spec §7.2, `/`) centred on a point, as one change, and select it.
 * @param {string} label What the person picked, for the undo entry.
 * @returns {string | null}
 */
export function insertNode(t, node, at, label) {
  const { doc, canvasId, readOnly } = current();
  editingStore.getState().close();
  if (readOnly) return null;
  const refusal = placeRefusal(doc, canvasId, node, at);
  if (refusal) {
    editingStore.getState().refuse({ reason: refusal, at });
    return null;
  }
  const { id, commands } = addNode(doc, canvasId, node, at);
  const { ok } = change(commands, { label: t("editing.insert", { what: label }), at });
  if (ok) editorStore.getState().select([id]);
  return ok ? id : null;
}

/** After a change that made an edge: select it and open its trigger editor when it asks (else select the box). */
function askAbout(edgeId, boxId) {
  const { doc, canvasId } = editorStore.getState();
  if (edgeId && asksAfterConnect(doc, canvasId, edgeId)) {
    editorStore.getState().select([edgeId]);
    editingStore.getState().open({ type: "trigger", edgeId });
  } else editorStore.getState().select([boxId ?? edgeId]);
}

/**
 * Connect two boxes of the level (spec §7.2: a drag from a box's handle to another box), as one change; what the
 * format forbids is refused where the drag ended.
 * @returns {string | null} The new edge's ID.
 */
export function connectBoxes(t, from, to, at) {
  const { doc, canvasId, readOnly } = current();
  if (readOnly) return null;
  const refusal = connectRefusal(doc, canvasId, from, to);
  if (refusal) {
    editingStore.getState().refuse({ reason: refusal, at });
    return null;
  }
  const { id, commands } = connectCommands(doc, canvasId, from, to);
  const { ok } = change(commands, { label: t("editing.connect"), at });
  if (!ok) return null;
  askAbout(id, null);
  return id;
}

/**
 * Lay the level out again (spec §8.2: Auto-layout, ⇧L): Core's auto-layout of the whole level, in the layout worker,
 * as one undoable change. A level that changed while it was being laid out keeps its change, and the layout is dropped.
 * @param {{ request: (type: string, payload: object) => Promise<object[]> }} [client]
 * @returns {Promise<boolean>} Whether the level was laid out.
 */
export async function relayout(t, client = layoutClient()) {
  const { doc, canvasId, readOnly } = current();
  if (readOnly) return false;
  const at = centreOf(doc, canvasId, [...boxesOf(doc, canvasId).keys()]);
  let commands;
  try {
    commands = await client.request("layout", { doc, canvasId, scope: "all" });
  } catch (error) {
    editingStore.getState().refuse({ reason: "arrangeFailed", message: error.message, at });
    return false;
  }
  const now = editorStore.getState();
  if (now.doc !== doc || now.canvasId !== canvasId) return false;
  return change(commands, { label: t("editing.relayout"), at }).ok;
}

/** Unit steps of the arrow keys. */
export const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * The box connected to another that lies most in a direction (spec §9: arrows move between connected nodes), or null.
 * @param {[number, number]} direction A unit step.
 */
export function neighbour(doc, canvasId, fromId, [dx, dy]) {
  const boxes = boxesOf(doc, canvasId);
  const centre = id => [boxes.get(id).x + boxes.get(id).w / 2, boxes.get(id).y + boxes.get(id).h / 2];
  if (!boxes.has(fromId)) return null;
  const [fx, fy] = centre(fromId);
  const linked = new Set(
    Object.values(doc.canvases[canvasId].edges).flatMap(edge =>
      edge.from === fromId ? [edge.to]
      : edge.to === fromId ? [edge.from]
      : []
    )
  );
  let best = null;
  for (const id of linked) {
    if (id === fromId || !boxes.has(id)) continue;
    const [x, y] = centre(id);
    const distance = Math.hypot(x - fx, y - fy);
    const along = ((x - fx) * dx + (y - fy) * dy) / (distance || 1);
    // Within 60° of the direction; the nearest of those that point most its way.
    if (along < 0.5) continue;
    const score = distance / along;
    if (!best || score < best.score) best = { id, score };
  }
  return best?.id ?? null;
}

/**
 * Look here (spec §7.7: focus): the selected boxes and arrows are highlighted on the diagram — or, when all of them
 * already are, no longer are. One change.
 */
export function focusSelection(t) {
  const { doc, canvasId, selection, readOnly } = current();
  const canvas = doc.canvases[canvasId];
  const ids = selection.filter(id => canvas.nodes[id] || canvas.edges[id]);
  if (readOnly || !ids.length) return;
  const focus = doc.annotations?.focus ?? [];
  const all = ids.every(id => focus.includes(id));
  const next = all ? focus.filter(id => !ids.includes(id)) : [...focus, ...ids.filter(id => !focus.includes(id))];
  change([{ type: "focus.set", args: { ids: next } }], {
    label: t(all ? "editing.unfocus" : "editing.focus"),
    at: centreOf(doc, canvasId, ids)
  });
}

/**
 * Make a lane of the selected boxes (spec §7.7): a caption above them, named "Lane 2" until the person names it, the
 * boxes in reading order. One change.
 * @returns {string | null} The new lane's ID.
 */
export function laneSelection(t) {
  const { doc, canvasId, selection, readOnly } = current();
  const boxes = boxesOf(doc, canvasId);
  const nodes = selection
    .filter(id => doc.canvases[canvasId].nodes[id] && boxes.has(id))
    .sort((a, b) => boxes.get(a).x - boxes.get(b).x || boxes.get(a).y - boxes.get(b).y);
  if (readOnly || !nodes.length) return null;
  const count = Object.values(doc.annotations?.lanes ?? {}).filter(lane => lane.canvas === canvasId).length;
  const label = t("inspector:lanes.name", { number: count + 1 });
  const id = idsFor(doc).take("lne", label);
  const { ok } = change([{ type: "lane.add", args: { id, lane: { canvas: canvasId, label, nodes } } }], {
    label: t("editing.lane"),
    at: centreOf(doc, canvasId, nodes)
  });
  return ok ? id : null;
}
