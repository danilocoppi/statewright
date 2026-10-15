// Placing a tool's element where the person clicks or drops it (spec §7.2): a node — named, or with the catalog
// action or the level it needs — or a note. One change; a new action joins the catalog in the same change.
import { applyBatch } from "statewright";

import { addNode, addNote, sizeOf } from "./changes";
import { connectCommands, placeRefusal } from "./connect";
import { idsFor } from "./ids";

/** The size of a box Core cannot draw before its choice is made (an action, a link): its smallest box. */
const SMALLEST = { w: 140, h: 48 };

/** The size of a note being written. */
export const NOTE_SIZE = { w: 180, h: 64 };

/**
 * What a tool will create, as far as it is known before the person names it or chooses: the node, or null for a note.
 * @param {import("./tools").Tool} tool
 * @param {string} [name] The name it will have (a default until one is typed).
 */
export const nodeOf = (tool, name) => (tool.node ? { ...tool.node, ...(name ? { name } : {}) } : null);

/**
 * The box a tool's element takes on a level: Core's size for its node, the smallest box when Core needs a choice
 * first, a note's size for notes.
 * @returns {{ w: number, h: number }}
 */
export function ghostSize(doc, canvasId, tool, name) {
  const node = nodeOf(tool, name);
  if (!node) return NOTE_SIZE;
  if (tool.needs) return SMALLEST;
  return sizeOf(doc, canvasId, node);
}

/**
 * The change that places a tool's element centred on a point (a note: its corner at the point's top left).
 * @param {import("./tools").Tool} tool
 * @param {{ x: number, y: number }} point
 * @param {{ name?: string, text?: string, action?: { id: string } | { name: string }, target?: string,
 *   from?: string }} choice `name` for named boxes, `text` for notes, `action` (found or new) for flow actions,
 *   `target` for links, `from`: the box a connection dragged to empty space started from (spec §7.2).
 * @returns {{ id: string, edgeId?: string, commands: object[] } | { refusal: string }}
 */
export function placeCommands(doc, canvasId, tool, point, choice = {}) {
  const ids = idsFor(doc);
  if (!tool.node) {
    return addNote(doc, canvasId, choice.text, { x: point.x - NOTE_SIZE.w / 2, y: point.y - NOTE_SIZE.h / 2 }, ids);
  }
  const node = nodeOf(tool, choice.name);
  const refusal = placeRefusal(doc, canvasId, node, point);
  if (refusal) return { refusal };
  const before = [];
  if (choice.target) node.target = choice.target;
  // A box made from a connection joins the region of the box it comes from, so the transition stays inside it.
  const source = choice.from && doc.canvases[canvasId].nodes[choice.from];
  if (source?.region) node.region = source.region;
  if (choice.action) {
    if ("id" in choice.action) node.action = choice.action.id;
    else {
      node.action = ids.take("act", choice.action.name);
      before.push({
        type: "catalog.add",
        args: { collection: "actions", id: node.action, item: { name: choice.action.name } }
      });
    }
  }
  // A node that performs a new action is sized (it shows the action's name) once the action is there.
  const staged = before.length ? applyBatch(doc, before).doc : doc;
  const { id, commands } = addNode(staged, canvasId, node, point, ids);
  if (!choice.from) return { id, commands: [...before, ...commands] };
  const placed = applyBatch(staged, commands).doc;
  const edge = connectCommands(placed, canvasId, choice.from, id, ids);
  return { id, edgeId: edge.id, commands: [...before, ...commands, ...edge.commands] };
}

/** The drag data that carries a tool from the dock to the canvas. */
export const TOOL_TYPE = "application/x-statewright-tool";
