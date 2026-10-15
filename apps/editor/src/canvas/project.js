// The canvas projection (spec §4.3): the figure Core draws for a level, as React Flow nodes and edges. Every part
// keeps Core's position, size and markup, so the canvas shows exactly the exported figure; the canvas adds only what
// interaction needs (selection, focus, moving, markers, the heading).
import { figureHeading } from "statewright";

import { keepBoxes } from "@/editing/changes";
import { instanceCounts } from "@/reuse/definitions";

import { draw, remember } from "./figures";
import { paint } from "./palette";

/** The marker IDs the canvas's edges refer to (see DiagramDefs). */
export const MARKER_PREFIX = "canvas";

/** Stacking (spec §6.1, Core's drawing order): regions, frames, then edges, nodes, then lanes, notes, the heading. */
const Z = { region: -2, frame: -1, edge: 0, node: 0, lane: 1, note: 1, heading: 1 };

/** React Flow ID of a part: its element ID, prefixed by the frames it is drawn inside. */
export const partKey = part => [...part.within, part.id].join("/");

/** Parts that are seen, not touched — decorations, the heading, parts inside frames: the pointer passes through. */
const fixed = { draggable: false, connectable: false, deletable: false, style: { pointerEvents: "none" } };
/**
 * The level's own boxes and notes move, and its boxes connect, when the canvas lets them (React Flow's
 * `nodesDraggable`, `nodesConnectable`).
 */
const movable = { deletable: false };

/** The annotation layers the View menu shows or hides (spec §7.7). */
export const LAYERS = ["findings", "notes", "focus", "lanes"];

/**
 * @param {any} doc
 * @param {string} canvasId
 * @param {{ hidden?: string[], nameOf?: (id: string) => string | undefined }} [options] `hidden`: annotation layers
 *   not drawn (the View menu): Core draws the level without them, so what is shown is still its figure. `nameOf`: what
 *   a screen reader calls an element the figure leaves unnamed (a start dot, an arrow without a label), and what a link
 *   says it leads to (`data.follow.name`; null when nothing has that ID).
 * @returns {{ nodes: object[], edges: object[], bounds: { x: number, y: number, w: number, h: number },
 *   unplaced: string[], heading: { kicker: string, title: string, caption: string | null } }}
 */
export function projectLevel(source, canvasId, { hidden = [], nameOf = () => undefined } = {}) {
  const doc =
    hidden.length && source.annotations ?
      {
        ...source,
        annotations: Object.fromEntries(Object.entries(source.annotations).filter(([layer]) => !hidden.includes(layer)))
      }
    : source;
  // The canvas shows a badge's findings itself (FindingPopover), so its badges leave out the browser's tooltip.
  const figure = draw(doc, canvasId, { paint, idPrefix: MARKER_PREFIX, tooltips: false });
  // The layers over the canvas read their geometry from this figure (figures.js) — when it is the whole figure: hidden
  // layers leave notes out.
  if (doc === source) remember(source, canvasId, figure);
  // An edit on this level finds its boxes drawn (only the whole figure has every box and note).
  if (doc === source) keepBoxes(doc, canvasId, figure);
  const heading = figureHeading(doc.canvases[canvasId]);
  const instances = instanceCounts(doc);
  /** How many boxes use the reusable part a box of the level is an instance of (spec §7.6: the instance badge). */
  const usesOf = part => {
    const definition = part.within.length ? undefined : doc.canvases[canvasId].nodes[part.id]?.inner?.definition;
    return definition ? (instances.get(definition) ?? 0) : undefined;
  };
  // Core gives every size, so React Flow need not wait to measure a box before it can be dragged.
  const box = part => ({
    position: { x: part.x, y: part.y },
    width: part.w,
    height: part.h,
    measured: { width: part.w, height: part.h }
  });
  /** Parts of the level itself can be selected, focused and moved; parts inside a frame are seen, not touched. */
  const own = part => part.within.length === 0;

  const decoration = (type, part) => ({
    id: `${type}:${partKey(part)}`,
    type,
    ...box(part),
    ...fixed,
    selectable: false,
    focusable: false,
    zIndex: Z[type],
    data: { part }
  });
  /** Where a link of the level leads, by name (null when its target is gone): the canvas offers to follow it. */
  const followOf = part => {
    if (part.shape !== "ref" || !own(part)) return undefined;
    return { name: nameOf(doc.canvases[canvasId].nodes[part.id].target) ?? null };
  };
  const element = (type, part, label = part.title || undefined) => ({
    id: partKey(part),
    type,
    ...box(part),
    ...(own(part) ? movable : fixed),
    selectable: own(part),
    focusable: own(part),
    zIndex: Z[type],
    // A box is called as the inspector calls it (a start dot by its kind); a note by its text.
    ariaLabel: (type === "note" ? undefined : nameOf(part.id)) ?? label,
    // A part inside a frame is a picture of a box, named for screen readers; a box of the level is focused and acted on.
    ...(own(part) ? {} : { ariaRole: "img" }),
    data: { part, uses: usesOf(part), follow: followOf(part) }
  });

  // Reading order (Tab moves through boxes as a person reads a figure): left to right, then top to bottom.
  const boxes = [
    ...figure.frames.map(part => element("frame", part)),
    ...figure.nodes.map(part => element("node", part))
  ].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);

  const labels = new Map(figure.labels.map(part => [partKey(part), part]));
  const edges = figure.edges.map(part => ({
    id: partKey(part),
    type: "figure",
    source: partKey({ within: part.within, id: part.from }),
    target: partKey({ within: part.within, id: part.to }),
    ...fixed,
    selectable: own(part),
    focusable: false,
    zIndex: Z.edge,
    ariaLabel: part.label || nameOf(part.id),
    data: { part, label: labels.get(partKey(part)) ?? null }
  }));

  // The roles' connectors (mixed levels spec §3): each end keyed with its own frame's path; an end that is a
  // transition is held by its source box.
  const boxParts = new Map([...figure.nodes, ...figure.frames].map(part => [part.id, part]));
  const routes = new Map(figure.edges.map(part => [part.id, part]));
  const holder = id => {
    const box = boxParts.get(id);
    if (box) return partKey(box);
    const route = routes.get(id);
    return route ? partKey({ within: route.within, id: route.from }) : id;
  };
  edges.push(
    ...figure.associations.map(part => ({
      id: partKey(part),
      type: "association",
      source: holder(part.from),
      target: holder(part.to),
      ...fixed,
      selectable: own(part),
      focusable: false,
      zIndex: Z.edge,
      ariaLabel: nameOf(part.id) ?? part.id,
      data: { part }
    }))
  );

  const nodes = [
    ...figure.regions.map(part => decoration("region", part)),
    ...boxes,
    ...figure.lanes.map(part => decoration("lane", part)),
    ...figure.notes.map(part => ({
      ...element("note", part, doc.annotations.notes[part.id].text),
      connectable: false
    })),
    {
      id: "heading",
      type: "heading",
      position: { x: figure.bounds.x, y: figure.bounds.y - 32 },
      origin: [0, 1],
      ...fixed,
      selectable: false,
      focusable: false,
      zIndex: Z.heading,
      data: heading
    }
  ];
  return { nodes, edges, bounds: figure.bounds, unplaced: figure.unplaced, heading };
}
