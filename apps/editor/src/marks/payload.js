// What the marks say in a message (collaboration spec §5.4): each mark read on its own level — the elements it
// encloses, touches or joins, the box a label stands by — with its colour and what the colour means, and the elements
// marked for the AI by name and kind. The level's geometry is Core's figure, which the canvas draws.
import { figureFor } from "@/canvas/figures";
import { itemOf } from "@/conversation/context";
import { indexOf } from "@/lib/derived";

import { readMark } from "./read";
import { MEANING } from "./store";

const figures = new WeakMap();

/**
 * A level's boxes and edges, named, in its figure's coordinates (cached per document).
 * @returns {{ boxes: import("./read").Box[], regions: import("./read").Box[], lines: import("./read").Line[] }}
 */
export function geometryOf(doc, level) {
  let levels = figures.get(doc);
  if (!levels) figures.set(doc, (levels = new Map()));
  if (!levels.has(level)) {
    const empty = { nodes: [], frames: [], regions: [], edges: [], associations: [] };
    const figure = doc.canvases[level] ? figureFor(doc, level) : empty;
    const own = part => part.within.length === 0;
    const index = indexOf(doc);
    // What the canvas shows a part as: its own name, else the figure's title (a step, a participant).
    const name = part => {
      const item = itemOf(doc, index, part.id);
      return item && item.name !== part.id ? item.name : part.title || part.label || part.id;
    };
    const boxOf = part => ({ id: part.id, name: name(part), x: part.x, y: part.y, width: part.w, height: part.h });
    const lineOf = part => ({ id: part.id, name: name(part), points: part.points });
    levels.set(level, {
      // Boxes and the frames of interiors shown on the level; regions apart, as they hold boxes.
      boxes: [...figure.nodes, ...figure.frames].filter(own).map(boxOf),
      regions: figure.regions.filter(own).map(boxOf),
      lines: [...figure.edges, ...figure.associations]
        .filter(own)
        .filter(part => part.points?.length > 1)
        .map(lineOf)
    });
  }
  return levels.get(level);
}

/** A level's geometry for reading marks: its regions count as boxes too. */
const readable = ({ boxes, regions, lines }) => ({ boxes: [...boxes, ...regions], lines });

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
      ...readMark(mark, readable(geometryOf(doc, mark.level)))
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
