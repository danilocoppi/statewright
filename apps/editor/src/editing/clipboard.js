// Copy and paste (spec §7.3): the selected boxes of a level with the edges between them, their notes, their own
// interiors and the catalog items they use travel as text, so they can be pasted on any level of the same kind, in this
// project or another. Pasted elements get new IDs; a catalog item is reused when the target project has its ID, and
// added otherwise.
import { CATALOG_COLLECTIONS } from "statewright";

import { boxesOf, regionAt } from "./changes";
import { idsFor } from "./ids";

/** What marks clipboard text as Statewright elements. */
export const CLIP_FORMAT = "statewright/clip";

/** Catalog IDs in any value: every item a copied element names, directly or through another item. */
const CATALOG_ID = new RegExp(`"((?:${Object.values(CATALOG_COLLECTIONS).join("|")})_[A-Za-z0-9]+)"`, "g");
const catalogIds = value => [...JSON.stringify(value).matchAll(CATALOG_ID)].map(match => match[1]);

/**
 * @typedef {object} Clip
 * @property {string} format CLIP_FORMAT.
 * @property {"system" | "machine" | "flow"} kind The kind of canvas the boxes come from.
 * @property {Record<string, object>} nodes @property {Record<string, object>} edges @property {Record<string, object>} notes
 * @property {{ nodes: Record<string, object>, edges: Record<string, object>, notes: Record<string, object> }} layout
 * @property {Record<string, { canvas: object, layout: object }>} canvases Own interiors, at any depth.
 * @property {Record<string, { collection: string, item: object }>} catalog
 */

/** Every catalog item named by `values`, and the items those name. */
function catalogOf(doc, values) {
  const collectionOf = Object.fromEntries(
    Object.entries(CATALOG_COLLECTIONS).map(([collection, prefix]) => [prefix, collection])
  );
  const found = {};
  const visit = id => {
    const collection = collectionOf[id.split("_")[0]];
    const item = doc.catalog[collection]?.[id];
    if (!item || found[id]) return;
    // An item's own interior stays behind: the copy names the item, it does not move its canvas.
    const value = { ...item };
    delete value.inner;
    found[id] = { collection, item: value };
    catalogIds(value).forEach(visit);
  };
  values.flatMap(catalogIds).forEach(visit);
  return found;
}

/** A level's own interiors (boxes whose `inner` is a canvas), with theirs, as the clip keeps them. */
function interiorsOf(doc, nodes, canvases = {}) {
  for (const node of Object.values(nodes)) {
    const canvasId = node.inner?.canvas;
    if (!canvasId || canvases[canvasId]) continue;
    const canvas = doc.canvases[canvasId];
    canvases[canvasId] = { canvas, layout: doc.layout?.canvases?.[canvasId] ?? {} };
    interiorsOf(doc, canvas.nodes, canvases);
  }
  return canvases;
}

/**
 * What a copy of selected elements of a level holds; null when nothing copyable is selected (boxes and notes are
 * copied, with the edges between copied boxes).
 * @returns {Clip | null}
 */
export function copyOf(doc, canvasId, ids) {
  const canvas = doc.canvases[canvasId];
  const stored = doc.layout?.canvases?.[canvasId] ?? {};
  const boxes = boxesOf(doc, canvasId);
  const pick = (map, keys) => Object.fromEntries(keys.map(key => [key, map[key]]));
  const nodeIds = ids.filter(id => canvas.nodes[id]);
  const kept = new Set(nodeIds);
  const edgeIds = Object.keys(canvas.edges).filter(
    id => kept.has(canvas.edges[id].from) && kept.has(canvas.edges[id].to)
  );
  const noteIds = ids.filter(id => doc.annotations?.notes?.[id]?.canvas === canvasId);
  if (!nodeIds.length && !noteIds.length) return null;
  const nodes = pick(canvas.nodes, nodeIds);
  const edges = pick(canvas.edges, edgeIds);
  const notes = pick(doc.annotations?.notes ?? {}, noteIds);
  const canvases = interiorsOf(doc, nodes);
  const position = id => {
    const { x, y } = boxes.get(id);
    return { ...stored.nodes?.[id], x, y };
  };
  return {
    format: CLIP_FORMAT,
    kind: canvas.kind,
    nodes,
    edges,
    notes,
    layout: {
      nodes: Object.fromEntries(nodeIds.map(id => [id, position(id)])),
      edges: pick(
        stored.edges ?? {},
        edgeIds.filter(id => stored.edges?.[id])
      ),
      notes: Object.fromEntries(noteIds.map(id => [id, { x: boxes.get(id).x, y: boxes.get(id).y }]))
    },
    canvases,
    catalog: catalogOf(doc, [nodes, edges, ...Object.values(canvases).map(entry => entry.canvas)])
  };
}

const isRecord = value => typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether parsed text has every part of a clip, each of its shape: clipboard text can come from anywhere. */
const isClip = clip =>
  isRecord(clip) &&
  clip.format === CLIP_FORMAT &&
  ["system", "machine", "flow", "mixed"].includes(clip.kind) &&
  ["nodes", "edges", "notes", "canvases", "catalog"].every(key => isRecord(clip[key])) &&
  isRecord(clip.layout) &&
  ["nodes", "edges", "notes"].every(key => isRecord(clip.layout[key]));

/** The clip as clipboard text, and back (null when the text is not a clip). */
export const clipText = clip => JSON.stringify(clip);
export function clipFrom(text) {
  try {
    const clip = JSON.parse(text);
    return isClip(clip) ? clip : null;
  } catch {
    return null;
  }
}

/** Order catalog items so each comes after the items it names. */
function catalogOrder(catalog) {
  const ordered = [];
  const seen = new Set();
  const visit = id => {
    if (seen.has(id) || !catalog[id]) return;
    seen.add(id);
    catalogIds(catalog[id].item).forEach(visit);
    ordered.push(id);
  };
  Object.keys(catalog).sort().forEach(visit);
  return ordered;
}

/**
 * Paste a clip on a level: at a point (the copied boxes' top-left corner goes there) or moved by an offset from where
 * they were copied.
 * @param {any} doc The target document.
 * @param {string} canvasId The target level.
 * @param {Clip} clip
 * @param {{ at: { x: number, y: number } } | { offset: [number, number] }} placement
 * @returns {{ commands: object[], ids: string[] } | { refusal: "wrongKind" | "secondInitial" | "missingLevel" }} `ids`:
 *   the new boxes and notes. What the level cannot hold is left behind (a second initial node in a region, a link to a
 *   level the project does not have); when nothing else is left, the paste is refused for it.
 */
export function pasteCommands(doc, canvasId, clip, placement, ids = idsFor(doc)) {
  const target = doc.canvases[canvasId];
  if (target.kind !== clip.kind) return { refusal: "wrongKind" };
  const commands = [];
  const renamed = new Map();
  const rename = (prefix, oldId, base) => {
    if (!renamed.has(oldId)) renamed.set(oldId, ids.take(prefix, base));
    return renamed.get(oldId);
  };

  for (const id of catalogOrder(clip.catalog)) {
    const { collection, item } = clip.catalog[id];
    if (!doc.catalog[collection]?.[id]) commands.push({ type: "catalog.add", args: { collection, id, item } });
  }

  // Where the copied boxes go: their top-left corner at the point, or each moved by the offset.
  const corners = Object.values(clip.layout.nodes).concat(Object.values(clip.layout.notes));
  const left = Math.min(...corners.map(point => point.x));
  const above = Math.min(...corners.map(point => point.y));
  const [dx, dy] = "at" in placement ? [placement.at.x - left, placement.at.y - above] : placement.offset;
  const moved = ({ x, y, ...rest }) => ({ ...rest, x: Math.round(x + dx), y: Math.round(y + dy) });
  const shift = ([x, y]) => [x + dx, y + dy];

  // What the level cannot hold is left behind, with the edges that touch it.
  const starts = new Set(
    Object.values(target.nodes)
      .filter(node => node.kind === "initial")
      .map(node => node.region ?? "")
  );
  const behind = [];
  const canHold = ([oldId, node]) => {
    if (node.kind === "ref" && !doc.canvases[node.target] && !clip.canvases[node.target]) {
      behind.push("missingLevel");
      return false;
    }
    if (node.kind !== "initial") return true;
    const region = (target.regions && regionAt(doc, canvasId, moved(clip.layout.nodes[oldId])).region) || "";
    if (starts.has(region)) {
      behind.push("secondInitial");
      return false;
    }
    starts.add(region);
    return true;
  };
  const nodes = Object.fromEntries(Object.entries(clip.nodes).filter(canHold));
  const edges = Object.fromEntries(Object.entries(clip.edges).filter(([, edge]) => nodes[edge.from] && nodes[edge.to]));
  if (behind.length && !Object.keys(nodes).length && !Object.keys(clip.notes).length) return { refusal: behind[0] };

  /** A node or edge with its references to copied elements renamed; regions are the target's. */
  const mapped = (value, region) => {
    const next = structuredClone(value);
    for (const key of ["from", "to", "target"]) if (renamed.has(next[key])) next[key] = renamed.get(next[key]);
    if (next.except) next.except = next.except.filter(id => renamed.has(id)).map(id => renamed.get(id));
    if (typeof next.done === "string") next.done = renamed.get(next.done) ?? true;
    if ("region" in next || region) {
      if (region) next.region = region;
      else if (renamed.has(next.region)) next.region = renamed.get(next.region);
      else delete next.region;
    }
    if (next.inner?.definition && !doc.definitions[next.inner.definition]) delete next.inner;
    if (next.inner?.canvas) delete next.inner;
    return next;
  };

  /** Add a level's nodes, interiors, edges and their layout; `pasted` on the level pasted on (moved, in its regions). */
  const addLevel = (toCanvas, nodes, edges, layout, pasted) => {
    for (const [oldId, node] of Object.entries(nodes)) rename("nod", oldId, node.name ?? node.kind);
    for (const [oldId, edge] of Object.entries(edges)) {
      rename("edg", oldId, `${nodes[edge.from]?.name ?? "edge"} ${nodes[edge.to]?.name ?? ""}`);
    }
    for (const [oldId, node] of Object.entries(nodes)) {
      const { x, y, ...shape } = pasted ? moved(layout.nodes[oldId]) : (layout.nodes?.[oldId] ?? {});
      const region = pasted && target.regions ? regionAt(doc, toCanvas, { x, y }).region : undefined;
      const id = renamed.get(oldId);
      commands.push({
        type: "node.add",
        args: { canvas: toCanvas, id, node: mapped(node, region), ...(x !== undefined && { at: { x, y } }) }
      });
      const inner = node.inner?.canvas && clip.canvases[node.inner.canvas];
      if (inner) addInterior(node.inner.canvas, id, inner);
      // A stored size and display (a frame showing its interior) come once the interior is there.
      if (Object.keys(shape).length) {
        commands.push({ type: "layout.node.set", args: { canvas: toCanvas, id, x, y, ...shape } });
      }
    }
    for (const [oldId, edge] of Object.entries(edges)) {
      const id = renamed.get(oldId);
      commands.push({ type: "edge.add", args: { canvas: toCanvas, id, edge: mapped(edge) } });
      const route = layout.edges?.[oldId];
      if (route) {
        const args =
          pasted ?
            {
              ...(route.points && { points: route.points.map(shift) }),
              ...(route.labelAt && { labelAt: shift(route.labelAt) })
            }
          : route;
        commands.push({ type: "layout.edge.set", args: { canvas: toCanvas, id, ...args } });
      }
    }
  };

  /** Create an own interior for a pasted box, with its regions, and fill it. */
  const addInterior = (oldCanvasId, owner, { canvas, layout }) => {
    const { nodes, edges, regions, ...fields } = canvas;
    const id = rename("cnv", oldCanvasId, canvas.name);
    commands.push({ type: "canvas.create", args: { ...fields, id, owner } });
    for (const [oldRegion, region] of Object.entries(regions ?? {})) {
      commands.push({ type: "region.add", args: { canvas: id, id: rename("rgn", oldRegion, region.name), ...region } });
    }
    addLevel(id, nodes, edges, layout, false);
  };

  addLevel(canvasId, nodes, edges, clip.layout, true);
  for (const [oldId, note] of Object.entries(clip.notes)) {
    const id = rename("nte", oldId, "note");
    const value = { ...note, canvas: canvasId };
    if (note.target) {
      if (renamed.has(note.target)) value.target = renamed.get(note.target);
      else delete value.target;
    }
    commands.push({ type: "note.add", args: { id, note: value } });
    commands.push({ type: "layout.note.set", args: { canvas: canvasId, id, ...moved(clip.layout.notes[oldId]) } });
  }
  return { commands, ids: [...Object.keys(nodes), ...Object.keys(clip.notes)].map(id => renamed.get(id)) };
}

/**
 * Duplicate selected elements on their own level, a little below and to the right (spec §7.3, ⌘D).
 * @returns {{ commands: object[], ids: string[] } | null}
 */
export function duplicateCommands(doc, canvasId, ids) {
  const clip = copyOf(doc, canvasId, ids);
  return clip && pasteCommands(doc, canvasId, clip, { offset: [24, 24] });
}
