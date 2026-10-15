import ELK from "elkjs/lib/elk.bundled.js";
import { applyBatch } from "../commands/engine.js";
import { associationsOf } from "../roles/index.js";
import { isGuest } from "../roles/kinds.js";
import { createGeometry, labelSize } from "./geometry.js";

export { BOX, createGeometry, labelLines, labelSize, textWidth } from "./geometry.js";
export { measureOverlaps } from "./overlaps.js";

const elk = new ELK();

/** Layered left-to-right layout with orthogonal edges, sized for the reference look (spec §15). */
const OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.spacing.nodeNode": "40",
  "elk.layered.spacing.nodeNodeBetweenLayers": "72",
  "elk.spacing.edgeNode": "20",
  "elk.spacing.edgeEdge": "14",
  "elk.layered.spacing.edgeNodeBetweenLayers": "20",
  "elk.spacing.edgeLabel": "4",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
  "elk.padding": "[top=0,left=0,bottom=0,right=0]"
};

/** Where machines and flows start: always in the first (leftmost) layer. */
const STARTS = new Set(["initial", "entry", "start"]);

/**
 * Nodes in reading order: from the starts, following edges breadth-first; unreachable nodes last. ELK breaks cycles
 * by this order, so a machine reads from its initial node to the right.
 */
function readingOrder(canvas, nodeIds) {
  const inside = new Set(nodeIds);
  const edges = sortedKeys(canvas.edges).map(id => canvas.edges[id]);
  const order = nodeIds.filter(id => STARTS.has(canvas.nodes[id].kind));
  const seen = new Set(order);
  for (let i = 0; i < order.length; i++) {
    for (const edge of edges) {
      if (edge.from === order[i] && inside.has(edge.to) && !seen.has(edge.to)) {
        seen.add(edge.to);
        order.push(edge.to);
      }
    }
  }
  return [...order, ...nodeIds.filter(id => !seen.has(id))];
}

/** Gap between laid-out blocks (regions, or new nodes next to placed ones). */
const GAP = 80;
/** Room above a region for its caption. */
const REGION_CAPTION = 28;

const sortedKeys = map => Object.keys(map ?? {}).sort();
const round = value => Math.round(value);

/**
 * The roles' connectors of a canvas as hidden edges between its nodes (mixed levels spec §7): an end that is a
 * transition stands at its source state, so a sender lands before the state it moves, a receiver and embedded steps
 * after the place that runs them. They shape the layout; no route is stored for them.
 */
function roleEdges(doc, canvasId, inside) {
  const canvas = doc.canvases[canvasId];
  const nodeOf = id => (canvas.nodes[id] ? id : canvas.edges[id]?.from);
  const seen = new Set();
  return associationsOf(doc, canvasId).flatMap(association => {
    const from = nodeOf(association.from);
    const to = nodeOf(association.to);
    const id = `role:${from}:${to}`;
    if (!inside.has(from) || !inside.has(to) || from === to || seen.has(id)) return [];
    seen.add(id);
    return [{ id, sources: [from], targets: [to] }];
  });
}

/**
 * Lay out a set of nodes of one canvas with ELK.
 * @returns {Promise<{ nodes: Map<string, { x: number, y: number }>, edges: Map<string, { points: number[][], labelAt?: number[] }>, w: number, h: number }>}
 */
async function runElk(geometry, canvasId, nodeIds) {
  const canvas = geometry.doc.canvases[canvasId];
  const inside = new Set(nodeIds);
  const edgeIds = sortedKeys(canvas.edges).filter(
    id => inside.has(canvas.edges[id].from) && inside.has(canvas.edges[id].to)
  );
  const roles = roleEdges(geometry.doc, canvasId, inside);
  // Guests that start something come first in reading order, so breaking cycles never turns their connectors around.
  const senders = new Set(roles.flatMap(edge => edge.sources).filter(id => isGuest(canvas.kind, canvas.nodes[id])));
  const order = readingOrder(canvas, nodeIds);
  const graph = {
    id: "root",
    layoutOptions: OPTIONS,
    children: [...order.filter(id => senders.has(id)), ...order.filter(id => !senders.has(id))].map(id => ({
      id,
      ...sizeOf(geometry, canvasId, id),
      ...(STARTS.has(canvas.nodes[id].kind) ?
        { layoutOptions: { "elk.layered.layering.layerConstraint": "FIRST" } }
      : {})
    })),
    edges: edgeIds
      .map(id => {
        const edge = canvas.edges[id];
        const label = labelSize(geometry.style.edgeLabel(id));
        return {
          id,
          sources: [edge.from],
          targets: [edge.to],
          labels: label ? [{ id: `${id}:label`, text: label.lines.join("\n"), width: label.w, height: label.h }] : []
        };
      })
      .concat(roles)
  };
  const result = await elk.layout(graph);
  const nodes = new Map(result.children.map(child => [child.id, { x: child.x, y: child.y }]));
  const edges = new Map();
  for (const edge of result.edges) {
    const section = edge.sections?.[0];
    if (!section) continue;
    const points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map(point => [
      point.x,
      point.y
    ]);
    const label = edge.labels?.[0];
    const entry = { points };
    if (label) entry.labelAt = [label.x + label.width / 2, label.y + label.height / 2];
    edges.set(edge.id, entry);
  }
  return { nodes, edges, w: result.width ?? 0, h: result.height ?? 0 };
}

const sizeOf = (geometry, canvasId, nodeId) => {
  const { w, h } = geometry.size(canvasId, nodeId);
  return { width: w, height: h };
};

/** Move a layout block by (dx, dy). */
function shift(block, dx, dy) {
  for (const position of block.nodes.values()) {
    position.x += dx;
    position.y += dy;
  }
  for (const route of block.edges.values()) {
    route.points = route.points.map(([x, y]) => [x + dx, y + dy]);
    if (route.labelAt) route.labelAt = [route.labelAt[0] + dx, route.labelAt[1] + dy];
  }
}

/**
 * Nodes grouped by region: for machines with regions, one group per region (sorted by ID) and the nodes outside any
 * region last; otherwise a single group. Empty groups are left out.
 * @returns {Array<{ region: string | null, ids: string[] }>}
 */
function groupsOf(canvas, nodeIds) {
  const regions = sortedKeys(canvas.regions);
  if (canvas.kind !== "machine" || regions.length === 0) return [{ region: null, ids: nodeIds }];
  const groups = regions.map(region => ({ region, ids: nodeIds.filter(id => canvas.nodes[id].region === region) }));
  groups.push({ region: null, ids: nodeIds.filter(id => !regions.includes(canvas.nodes[id].region)) });
  return groups.filter(group => group.ids.length);
}

/** Lay out the given nodes; machines with regions stack one block per region, each under its caption. */
async function layoutNodes(geometry, canvasId, nodeIds) {
  const canvas = geometry.doc.canvases[canvasId];
  if (canvas.kind !== "machine" || sortedKeys(canvas.regions).length === 0) {
    return runElk(geometry, canvasId, nodeIds);
  }
  const merged = { nodes: new Map(), edges: new Map(), w: 0, h: 0 };
  let top = 0;
  for (const group of groupsOf(canvas, nodeIds)) {
    const block = await runElk(geometry, canvasId, group.ids);
    shift(block, 0, top + REGION_CAPTION);
    for (const [id, position] of block.nodes) merged.nodes.set(id, position);
    for (const [id, route] of block.edges) merged.edges.set(id, route);
    merged.w = Math.max(merged.w, block.w);
    top += REGION_CAPTION + block.h + GAP / 2;
  }
  merged.h = Math.max(0, top - GAP / 2);
  return merged;
}

/**
 * Commands that store a block's positions and routes (keeping each node's w and h, and its display while it still has
 * an interior: removing an interior leaves its display behind, and `layout.node.set` refuses it).
 */
function commandsFor(doc, canvasId, block, edgeIds) {
  const stored = doc.layout?.canvases?.[canvasId]?.nodes ?? {};
  const nodes = doc.canvases[canvasId].nodes;
  const commands = [];
  for (const id of [...block.nodes.keys()].sort()) {
    const { x, y } = block.nodes.get(id);
    const args = { canvas: canvasId, id, x: round(x), y: round(y) };
    for (const key of ["w", "h", "display"]) if (stored[id]?.[key] !== undefined) args[key] = stored[id][key];
    if (!nodes[id].inner) delete args.display;
    commands.push({ type: "layout.node.set", args });
  }
  for (const id of edgeIds) {
    const route = block.edges.get(id);
    const args = { canvas: canvasId, id };
    if (route) {
      args.points = route.points.map(point => point.map(round));
      if (route.labelAt) args.labelAt = route.labelAt.map(round);
    }
    commands.push({ type: "layout.edge.set", args });
  }
  return commands;
}

async function layoutCanvas(doc, canvasId, scope, visited) {
  if (visited.has(canvasId) || !doc.canvases[canvasId]) return [];
  visited.add(canvasId);
  const commands = [];
  let working = doc;
  // Interiors drawn as frames come first: their size is the frame's size.
  const frames = createGeometry(working);
  for (const nodeId of sortedKeys(doc.canvases[canvasId].nodes)) {
    if (frames.displayOf(canvasId, nodeId) !== "frame") continue;
    const inner = await layoutCanvas(working, frames.style.node(nodeId).interior, scope, visited);
    if (inner.length) {
      commands.push(...inner);
      working = applyBatch(working, inner).doc;
    }
  }

  const geometry = createGeometry(working);
  const canvas = working.canvases[canvasId];
  const placed = working.layout?.canvases?.[canvasId]?.nodes ?? {};
  const all = sortedKeys(canvas.nodes);
  const missing = all.filter(id => !placed[id]);
  const full = scope === "all" || missing.length === all.length;
  if (full) {
    const block = await layoutNodes(geometry, canvasId, all);
    return [...commands, ...commandsFor(working, canvasId, block, sortedKeys(canvas.edges))];
  }
  if (!missing.length) return commands;

  // New nodes are laid out among themselves and placed to the right of what is already there, level with the placed
  // nodes of their region (a region with nothing placed yet goes below everything), so regions do not overlap.
  const placedIds = all.filter(id => placed[id]);
  const right = Math.max(...placedIds.map(id => placed[id].x + geometry.size(canvasId, id).w));
  const below = Math.max(...placedIds.map(id => placed[id].y + geometry.size(canvasId, id).h));
  const placedGroups = new Map(groupsOf(canvas, placedIds).map(group => [group.region, group.ids]));
  const blocks = [];
  for (const group of groupsOf(canvas, missing)) {
    const level = placedGroups.get(group.region) ?? [];
    const caption = group.region ? REGION_CAPTION : 0;
    const top = level.length ? Math.min(...level.map(id => placed[id].y)) : below + GAP / 2 + caption;
    blocks.push({ block: await runElk(geometry, canvasId, group.ids), top, caption });
  }
  blocks.sort((a, b) => a.top - b.top);
  const block = { nodes: new Map(), edges: new Map() };
  let cursor = -Infinity;
  for (const item of blocks) {
    const y = Math.max(item.top, cursor + GAP / 2 + item.caption);
    shift(item.block, right + GAP, y);
    cursor = y + item.block.h;
    for (const [id, position] of item.block.nodes) block.nodes.set(id, position);
    for (const [id, route] of item.block.edges) block.edges.set(id, route);
  }
  const inside = new Set(missing);
  const edges = sortedKeys(canvas.edges).filter(
    id => inside.has(canvas.edges[id].from) && inside.has(canvas.edges[id].to)
  );
  return [...commands, ...commandsFor(working, canvasId, block, edges)];
}

/**
 * Auto-layout of one canvas (spec §20): the `layout.*` commands that place its nodes and route its edges, so the
 * result can be applied, undone and signed like any other change. Interiors displayed as frames are laid out first
 * (their commands come first). With `scope: "missing"` only unplaced nodes are placed, to the right of the placed
 * ones and level with their region; with `"all"` everything is recomputed. Deterministic for a given document; the
 * document is not changed.
 * @param {any} doc A valid document.
 * @param {string} canvasId
 * @param {{ scope?: "missing" | "all" }} [options]
 * @returns {Promise<Array<{ type: string, args: object }>>}
 */
export async function autoLayout(doc, canvasId, { scope = "missing" } = {}) {
  if (!doc.canvases[canvasId]) throw new Error(`No canvas "${canvasId}"`);
  // Frames apply their interiors' commands to a copy: applying them to the caller's document would freeze it.
  return layoutCanvas(structuredClone(doc), canvasId, scope, new Set());
}
