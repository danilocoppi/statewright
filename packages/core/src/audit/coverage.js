// The coverage of a design by its scenarios (AI interface spec §8): which states (machines) or nodes (flows) and which
// edges the scenarios' runs reach, level by level.
import { compareText } from "../rules/facts.js";
import { locate, storyOf } from "../simulate/index.js";

/** The nodes of a level that count: a machine's states, a flow's every node. */
const countedNodes = canvas =>
  Object.entries(canvas.nodes)
    .filter(([, node]) => canvas.kind === "flow" || node.kind === "state")
    .map(([id]) => id);

/** The levels a run can go through: every machine and flow canvas. */
const runnable = doc =>
  Object.entries(doc.canvases)
    .filter(([, canvas]) => canvas.kind === "machine" || canvas.kind === "flow")
    .sort(([a, left], [b, right]) => compareText(left.name, right.name) || compareText(a, b));

/** The paths a frame's trace entered: states a machine entered, nodes a flow's tokens reached. */
function enteredOf(frame) {
  const paths = [];
  for (const entry of frame.trace) {
    if (entry.type === "entered" || entry.type === "restored") paths.push(entry.state);
    if (entry.type === "token" && entry.change === "moved") paths.push(entry.to);
    if (entry.type === "token" && entry.change === "forked") paths.push(...entry.to);
  }
  return paths;
}

/**
 * How much of a design its scenarios exercise (AI interface spec §8): every scenario is told again (`storyOf`), and
 * for every machine and flow level the states (or a flow's nodes) its runs entered and the edges they took are marked.
 * A state inside a reused definition counts on the definition's level. A level no scenario reaches has nothing
 * covered.
 * @param {any} doc
 * @returns {{ scenarios: number, levels: Array<{ canvas: string, name: string, kind: "machine" | "flow",
 *   nodes: { total: number, covered: number, missed: string[] }, edges: { total: number, covered: number,
 *   missed: string[] }, percent: number | null }>, percent: number | null }} `percent` is the share of nodes and edges
 *   covered, rounded; null for a level with neither. `missed` lists IDs in ID order.
 */
export function coverageOf(doc) {
  const reached = new Map();
  const mark = (canvas, kind, id) => {
    if (!reached.has(canvas)) reached.set(canvas, { nodes: new Set(), edges: new Set() });
    reached.get(canvas)[kind].add(id);
  };
  const scenarios = Object.values(doc.annotations?.scenarios ?? {});
  for (const scenario of scenarios) {
    const { frames } = storyOf(doc, scenario);
    // A flow's run starts with a token on its start node, which no step of the trace enters.
    const top = doc.canvases[scenario.canvas];
    if (frames.length && top?.kind === "flow") {
      for (const [id, node] of Object.entries(top.nodes)) if (node.kind === "start") mark(scenario.canvas, "nodes", id);
    }
    for (const frame of frames) {
      for (const taken of frame.taken) mark(taken.canvas, "edges", taken.edge);
      for (const path of enteredOf(frame)) {
        const place = locate(doc, scenario.canvas, path)?.at(-1);
        if (place) mark(place.canvas, "nodes", place.node);
      }
    }
  }
  let total = 0;
  let covered = 0;
  const levels = runnable(doc).map(([id, canvas]) => {
    const marked = reached.get(id) ?? { nodes: new Set(), edges: new Set() };
    const part = (all, hit) => ({
      total: all.length,
      covered: all.filter(item => hit.has(item)).length,
      missed: all.filter(item => !hit.has(item)).sort(compareText)
    });
    const nodes = part(countedNodes(canvas), marked.nodes);
    const edges = part(Object.keys(canvas.edges), marked.edges);
    total += nodes.total + edges.total;
    covered += nodes.covered + edges.covered;
    const all = nodes.total + edges.total;
    return {
      canvas: id,
      name: canvas.name,
      kind: canvas.kind,
      nodes,
      edges,
      percent: all ? Math.round((100 * (nodes.covered + edges.covered)) / all) : null
    };
  });
  return { scenarios: scenarios.length, levels, percent: total ? Math.round((100 * covered) / total) : null };
}
