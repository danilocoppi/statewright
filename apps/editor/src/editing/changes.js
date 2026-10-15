// The changes the canvas makes (spec §7.2–§7.3), as Core command batches: add a box or a note where the person
// clicks, move, nudge, remove, rename, align and distribute, and make a region of selected states. Pure functions of
// the document; the editor dispatches what they return as one change.
import { applyBatch, buildIndex, figureOf, prefixOf } from "statewright";

import { idsFor } from "./ids";
import { NAME_REQUIRED } from "./tools";

/**
 * @typedef {{ x: number, y: number }} Point
 * @typedef {{ x: number, y: number, w: number, h: number }} Box
 * @typedef {{ type: string, args: object }} Command
 */

/** Each document's boxes, by level: Core draws a level's figure once per version of the document (spec §9). */
const drawn = new WeakMap();

/**
 * Keep the boxes of a level's figure Core has drawn for a document — the canvas draws every version it shows, so an
 * edit made on it finds the boxes there instead of drawing the level again.
 * @param {object} doc
 * @param {string} canvasId
 * @param {ReturnType<typeof figureOf>} figure
 * @returns {Map<string, Box>}
 */
export function keepBoxes(doc, canvasId, figure) {
  const boxes = new Map();
  for (const part of [...figure.frames, ...figure.nodes, ...figure.notes]) {
    if (!part.within.length) boxes.set(part.id, { x: part.x, y: part.y, w: part.w, h: part.h });
  }
  let levels = drawn.get(doc);
  if (!levels) drawn.set(doc, (levels = new Map()));
  levels.set(canvasId, boxes);
  return boxes;
}

/**
 * The level's own boxes and notes as Core draws them: element ID → box (parts inside frames are left out). Worked
 * out once per document and level, and shared: read it, never change it.
 * @returns {Map<string, Box>}
 */
export const boxesOf = (doc, canvasId) =>
  drawn.get(doc)?.get(canvasId) ?? keepBoxes(doc, canvasId, figureOf(doc, canvasId));

/** The size Core gives a node, before it is added (on a machine with regions, probed in one: the size is the same). */
export function sizeOf(doc, canvasId, node) {
  const probe = "nod_sizeProbe";
  const { kind, regions } = doc.canvases[canvasId];
  const value =
    kind === "machine" && regions && node.region === undefined ?
      { ...node, region: Object.keys(regions).sort()[0] }
    : node;
  const { doc: probed } = applyBatch(doc, [
    { type: "node.add", args: { canvas: canvasId, id: probe, node: value, at: { x: 0, y: 0 } } }
  ]);
  const figure = figureOf(probed, canvasId);
  // Embedded steps are drawn as a frame of their flow until the person says otherwise.
  const part = [...figure.nodes, ...figure.frames].find(item => item.id === probe && !item.within.length);
  return { w: part.w, h: part.h };
}

const inside = (box, point) =>
  point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;

/** How far a point is from a box: 0 inside it. */
const distance = (box, point) =>
  Math.hypot(
    Math.max(box.x - point.x, 0, point.x - (box.x + box.w)),
    Math.max(box.y - point.y, 0, point.y - (box.y + box.h))
  );

/** The level's own regions as its figure draws them. */
const drawnRegions = (doc, canvasId) => figureOf(doc, canvasId).regions.filter(part => !part.within.length);

/**
 * On a machine with regions, the region a point is in, or the nearest one drawn (spec §8.2: placement is
 * region-aware): new nodes must declare one.
 */
export function regionAt(doc, canvasId, point) {
  const canvas = doc.canvases[canvasId];
  if (canvas.kind !== "machine" || !canvas.regions) return {};
  const nearest = drawnRegions(doc, canvasId).reduce(
    (best, part) => (!best || distance(part, point) < distance(best, point) ? part : best),
    null
  );
  return { region: nearest?.id ?? Object.keys(canvas.regions).sort()[0] };
}

/**
 * Add a node centred on a point of the level.
 * @param {any} doc
 * @param {string} canvasId
 * @param {object} node The node (kind and fields; on machines with regions, the region under the point unless it
 *   names one).
 * @param {Point} point In canvas coordinates.
 * @param {ReturnType<typeof idsFor>} [ids] Shared with the other commands of the same change.
 * @returns {{ id: string, commands: Command[] }}
 */
export function addNode(doc, canvasId, node, point, ids = idsFor(doc)) {
  const value = { ...regionAt(doc, canvasId, point), ...node };
  const id = ids.take("nod", value.name ?? value.kind);
  const { w, h } = sizeOf(doc, canvasId, value);
  const at = { x: Math.round(point.x - w / 2), y: Math.round(point.y - h / 2) };
  return { id, commands: [{ type: "node.add", args: { canvas: canvasId, id, node: value, at } }] };
}

/**
 * Add a floating note whose top-left corner is at a point.
 * @returns {{ id: string, commands: Command[] }}
 */
export function addNote(doc, canvasId, text, point, ids = idsFor(doc)) {
  const id = ids.take("nte", "note");
  return {
    id,
    commands: [
      { type: "note.add", args: { id, note: { canvas: canvasId, text } } },
      { type: "layout.note.set", args: { canvas: canvasId, id, x: Math.round(point.x), y: Math.round(point.y) } }
    ]
  };
}

/**
 * Move boxes and notes to new top-left positions (those already there are left out). An edge whose two ends move
 * together keeps its route, moved with them; an edge with one end moved loses its stored route and is drawn the way
 * Core draws an edge without one.
 * @param {any} doc
 * @param {string} canvasId
 * @param {Iterable<[string, Point]>} moves Element ID → new position.
 * @returns {Command[]}
 */
export function moveCommands(doc, canvasId, moves) {
  const stored = doc.layout?.canvases?.[canvasId] ?? {};
  const commands = [];
  const deltas = new Map();
  // A box dropped inside another region's outline joins that region, in the same change.
  const canvas = doc.canvases[canvasId];
  const regions = canvas.kind === "machine" && canvas.regions ? drawnRegions(doc, canvasId) : [];
  const boxes = regions.length ? boxesOf(doc, canvasId) : null;
  for (const [id, point] of moves) {
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    if (prefixOf(id) === "nte") {
      const note = stored.notes?.[id];
      if (note?.x !== x || note?.y !== y)
        commands.push({ type: "layout.note.set", args: { canvas: canvasId, id, x, y } });
      continue;
    }
    const { x: oldX, y: oldY, ...kept } = stored.nodes?.[id] ?? {};
    if (oldX === x && oldY === y) continue;
    commands.push({ type: "layout.node.set", args: { canvas: canvasId, id, x, y, ...kept } });
    deltas.set(id, oldX === undefined ? null : [x - oldX, y - oldY]);
    const box = boxes?.get(id);
    const node = canvas.nodes[id];
    if (box && node?.region) {
      const centre = { x: x + box.w / 2, y: y + box.h / 2 };
      const joined = regions.find(part => part.id !== node.region && inside(part, centre));
      if (joined) commands.push({ type: "node.update", args: { id, set: { region: joined.id } } });
    }
  }
  for (const [edgeId, edge] of Object.entries(doc.canvases[canvasId].edges)) {
    const route = stored.edges?.[edgeId];
    if (!route || !(deltas.has(edge.from) || deltas.has(edge.to))) continue;
    const [from, to] = [deltas.get(edge.from), deltas.get(edge.to)];
    const together = from && to && from[0] === to[0] && from[1] === to[1];
    const shift = ([px, py]) => [px + from[0], py + from[1]];
    commands.push({
      type: "layout.edge.set",
      args:
        together ?
          {
            canvas: canvasId,
            id: edgeId,
            ...(route.points && { points: route.points.map(shift) }),
            ...(route.labelAt && { labelAt: shift(route.labelAt) })
          }
        : { canvas: canvasId, id: edgeId }
    });
  }
  return commands;
}

/**
 * Move boxes and notes by an offset (arrow keys, spec §7.3).
 * @returns {Command[]}
 */
export function nudgeCommands(doc, canvasId, ids, dx, dy) {
  const boxes = boxesOf(doc, canvasId);
  const moves = ids.filter(id => boxes.has(id)).map(id => [id, { x: boxes.get(id).x + dx, y: boxes.get(id).y + dy }]);
  return moves.length ? moveCommands(doc, canvasId, moves) : [];
}

/**
 * Remove elements: Core removes a box with its edges, its own interior and what annotates it (spec §7.3).
 * @param {any} doc
 * @param {string[]} ids Boxes, edges and notes.
 * @returns {Command[]}
 */
export function removeCommands(doc, ids) {
  const index = buildIndex(doc);
  const removal = { edge: id => ({ id }), note: id => ({ id }), node: id => ({ id, cascade: true }) };
  // Edges and notes first: the boxes they belong to may go in the same change.
  return ["edge", "note", "node"].flatMap(type =>
    ids.filter(id => index.get(id)?.type === type).map(id => ({ type: `${type}.remove`, args: removal[type](id) }))
  );
}

/**
 * Rename a box, or change a note's text. Nothing changes when the text is the same, or empty where the format needs
 * one (a state's name, a note's text); an empty name on other boxes removes it.
 * @returns {Command[]}
 */
export function renameCommands(doc, id, text) {
  const entry = buildIndex(doc).get(id);
  const value = text.trim();
  if (entry?.type === "note") {
    return value && value !== entry.value.text ? [{ type: "note.update", args: { id, set: { text: value } } }] : [];
  }
  if (entry?.type !== "node" || value === (entry.value.name ?? "")) return [];
  if (value) return [{ type: "node.update", args: { id, set: { name: value } } }];
  return NAME_REQUIRED.has(entry.value.kind) ? [] : [{ type: "node.update", args: { id, unset: ["name"] } }];
}

/** Ways to line boxes up (spec §7.3). */
export const ALIGNMENTS = ["left", "centre", "right", "top", "middle", "bottom"];

/**
 * Line up two or more boxes on the edge or centre of the space they take.
 * @param {"left" | "centre" | "right" | "top" | "middle" | "bottom"} how
 * @returns {Command[]}
 */
export function alignCommands(doc, canvasId, ids, how) {
  const boxes = boxesOf(doc, canvasId);
  const chosen = ids.filter(id => boxes.has(id)).map(id => [id, boxes.get(id)]);
  if (chosen.length < 2) return [];
  const left = Math.min(...chosen.map(([, box]) => box.x));
  const right = Math.max(...chosen.map(([, box]) => box.x + box.w));
  const top = Math.min(...chosen.map(([, box]) => box.y));
  const bottom = Math.max(...chosen.map(([, box]) => box.y + box.h));
  const place = {
    left: box => ({ x: left, y: box.y }),
    centre: box => ({ x: (left + right) / 2 - box.w / 2, y: box.y }),
    right: box => ({ x: right - box.w, y: box.y }),
    top: box => ({ x: box.x, y: top }),
    middle: box => ({ x: box.x, y: (top + bottom) / 2 - box.h / 2 }),
    bottom: box => ({ x: box.x, y: bottom - box.h })
  }[how];
  const moves = chosen
    .map(([id, box]) => [id, place(box), box])
    .filter(([, point, box]) => Math.round(point.x) !== box.x || Math.round(point.y) !== box.y);
  return moves.length ? moveCommands(doc, canvasId, moves) : [];
}

/**
 * Space three or more boxes evenly between the first and the last, across ("horizontal") or down ("vertical").
 * @returns {Command[]}
 */
export function distributeCommands(doc, canvasId, ids, axis) {
  const boxes = boxesOf(doc, canvasId);
  const [pos, size] = axis === "horizontal" ? ["x", "w"] : ["y", "h"];
  const chosen = ids
    .filter(id => boxes.has(id))
    .map(id => [id, boxes.get(id)])
    .sort(([, a], [, b]) => a[pos] - b[pos]);
  if (chosen.length < 3) return [];
  const first = chosen[0][1];
  const last = chosen.at(-1)[1];
  const room = last[pos] + last[size] - first[pos] - chosen.reduce((sum, [, box]) => sum + box[size], 0);
  const gap = room / (chosen.length - 1);
  let cursor = first[pos];
  const moves = [];
  for (const [id, box] of chosen) {
    const next = Math.round(cursor);
    if (next !== box[pos]) moves.push([id, { ...box, [pos]: next }]);
    cursor += box[size] + gap;
  }
  return moves.length ? moveCommands(doc, canvasId, moves) : [];
}

/**
 * Make selected nodes of a machine a region of their own (spec §7.1: select states, press R). On a canvas without
 * regions, the first region takes every other node.
 * @param {{ first: string, next: string }} names The new regions' names ("Main", "Region 2").
 * @returns {{ id: string, commands: Command[] } | null} null when this is not a machine or nothing is selected.
 */
export function regionCommands(doc, canvasId, nodeIds, names, ids = idsFor(doc)) {
  const canvas = doc.canvases[canvasId];
  const chosen = nodeIds.filter(id => canvas.nodes[id]);
  if (canvas.kind !== "machine" || !chosen.length) return null;
  const commands = [];
  if (!canvas.regions) {
    const first = ids.take("rgn", names.first);
    commands.push({ type: "region.add", args: { canvas: canvasId, id: first, name: names.first } });
  }
  const id = ids.take("rgn", names.next);
  commands.push({ type: "region.add", args: { canvas: canvasId, id, name: names.next } });
  for (const nodeId of chosen) commands.push({ type: "node.update", args: { id: nodeId, set: { region: id } } });
  return { id, commands };
}
