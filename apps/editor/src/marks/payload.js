// What the marks say in a message (collaboration spec §5.4): each mark read on its own level — the elements it
// encloses, touches or joins, the box a label stands by — with its colour and what the colour means, and the elements
// marked for the AI by name and kind. The level's geometry is Core's figure, which the canvas draws.
import { figureOf } from "statewright";

import { itemOf } from "@/conversation/context";
import { indexOf } from "@/lib/derived";

import { readMark } from "./read";
import { MEANING } from "./store";

const figures = new WeakMap();

/**
 * A level's boxes and edges, named, in its figure's coordinates (cached per document).
 * @returns {{ boxes: import("./read").Box[], lines: import("./read").Line[] }}
 */
export function geometryOf(doc, level) {
  let levels = figures.get(doc);
  if (!levels) figures.set(doc, (levels = new Map()));
  if (!levels.has(level)) {
    const figure = doc.canvases[level] ? figureOf(doc, level, {}) : { nodes: [], edges: [] };
    const own = part => part.within.length === 0;
    const index = indexOf(doc);
    const name = id => itemOf(doc, index, id)?.name ?? id;
    levels.set(level, {
      boxes: figure.nodes.filter(own).map(part => ({
        id: part.id,
        name: name(part.id),
        x: part.x,
        y: part.y,
        width: part.w,
        height: part.h
      })),
      lines: figure.edges
        .filter(own)
        .filter(part => part.points?.length > 1)
        .map(part => ({ id: part.id, name: name(part.id), points: part.points }))
    });
  }
  return levels.get(level);
}

/**
 * @param {{ marks: import("./store").Mark[], forAI: Array<{ id: string, level: string }> }} state
 * @param {any} doc
 * @returns {object[]} The message's `marks`.
 */
export function marksOf({ marks, forAI }, doc) {
  const index = indexOf(doc);
  return [
    ...marks.map(mark => ({
      kind: mark.kind,
      level: mark.level,
      colour: mark.colour,
      meaning: MEANING[mark.colour],
      ...(mark.text !== undefined ? { text: mark.text } : {}),
      ...readMark(mark, geometryOf(doc, mark.level))
    })),
    ...forAI.flatMap(({ id, level }) => {
      const item = itemOf(doc, index, id);
      return item ? [{ kind: "element", level, element: { id: item.id, name: item.name, kind: item.kind } }] : [];
    })
  ];
}

/** What the chips count: elements marked for the AI, on how many levels, and marks drawn. */
export function summaryOf({ marks, forAI }) {
  return { elements: forAI.length, levels: new Set(forAI.map(item => item.level)).size, marks: marks.length };
}
