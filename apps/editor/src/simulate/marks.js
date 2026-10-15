// What the canvas marks on a level while a run is shown (simulator spec §6.3): the boxes where the run is, the boxes
// with the run inside them, the edges that can fire now, and the edges a question chooses between, numbered. The marks
// are an overlay: the figure itself stays Core's.
import { pathTo } from "statewright";
import { locate, reachedOf } from "statewright/simulate";

/** Questions whose answers are edges, which the canvas numbers. */
const EDGE_QUESTIONS = new Set(["transition", "choice", "case"]);

/** The whole of a step's motion on a level (simulator spec §7.1): its edges' pulses share it when there are many. */
const LONGEST = 2400;

/**
 * @typedef {{ kind: "active", tokens: number, at?: number } | { kind: "inside", leaves: string[], open: string | null }
 *   | { kind: "left", at: number }} NodeMark `left`: where the run was before a step the stage shows; `at`: when the
 *   mark shows, in milliseconds from the step's start.
 * @typedef {{ moves: Array<{ do: object, label: string }>, number?: number, fired?: { at: number, each: number } }}
 *   EdgeMark `fired`: an edge the step the stage shows took, its pulse starting `at` and lasting `each`.
 * @typedef {{ nodes: Map<string, NodeMark>, edges: Map<string, EdgeMark>, kept: Set<string> }} Marks `kept`: the
 *   nodes that stay in full — the run's, and where its edges lead; the others recede.
 */

/**
 * The marks of one level for the run shown.
 * @param {any} doc
 * @param {string} canvasId The level shown.
 * @param {{ top: string, session: object, moves?: object[], question?: object | null, taken?: object[],
 *   each?: number }} run On the stage (simulator spec §7.1), `taken`: the edges the step shown took (a frame's), and
 *   `each`: how long each one pulses, 0 to show the step at once.
 * @returns {Marks | null} null when the run has nothing on this level.
 */
export function marksFor(doc, canvasId, { top, session, moves = [], question = null, taken = [], each = 0 }) {
  const level = doc.canvases[canvasId];
  if (!level) return null;
  const nodes = new Map();
  const inside = (node, leaf) => {
    const mark = nodes.get(node);
    if (mark?.kind === "active") return;
    const interior = level.nodes[node]?.inner;
    const open = interior?.canvas ?? (interior?.definition ? doc.definitions[interior.definition]?.canvas : null);
    if (mark) mark.leaves.push(leaf);
    else nodes.set(node, { kind: "inside", leaves: [leaf], open: open ?? null });
  };

  // Where the run is: each active leaf (a flow's tokens, once each), level by level.
  const leaves = session.tokens ? session.tokens.map(token => token.path) : reachedOf(session).active;
  for (const leaf of leaves) {
    const places = locate(doc, top, leaf) ?? [];
    places.forEach((place, index) => {
      if (place.canvas !== canvasId) return;
      if (index < places.length - 1) return inside(place.node, leaf);
      const mark = nodes.get(place.node);
      nodes.set(place.node, { kind: "active", tokens: mark?.kind === "active" ? mark.tokens + 1 : 1 });
    });
  }
  // Above the run (a system level, spec §6.3): the box the run's top level is inside.
  const above = pathTo(doc, top) ?? [];
  const at = above.findIndex(step => step.canvas === canvasId);
  if (at >= 0 && at < above.length - 1) for (const leaf of leaves) inside(above[at + 1].via, leaf);

  const edges = new Map();
  for (const move of moves) {
    for (const edge of move.edges ?? []) {
      if (!level.edges[edge]) continue;
      if (!edges.has(edge)) edges.set(edge, { moves: [] });
      edges.get(edge).moves.push({ do: move.do, label: move.label });
    }
  }
  if (question && EDGE_QUESTIONS.has(question.kind)) {
    question.candidates.forEach((candidate, index) => {
      if (!candidate.value || !level.edges[candidate.value]) return;
      edges.set(candidate.value, { ...(edges.get(candidate.value) ?? { moves: [] }), number: index + 1 });
    });
  }
  // What the step the stage shows took on this level, played in order: its edges, then the boxes it reached show the
  // run; the boxes it left keep a trace of it.
  const fired = taken.filter(item => level.edges[item.edge]);
  const pulse = each && Math.min(each, LONGEST / fired.length);
  fired.forEach((item, order) => {
    const at = order * pulse;
    edges.set(item.edge, { ...(edges.get(item.edge) ?? { moves: [] }), fired: { at, each: pulse } });
    const { from, to } = level.edges[item.edge];
    const reached = nodes.get(to);
    if (reached?.kind === "active" && reached.at === undefined) reached.at = at + pulse;
    if (!item.initial && !nodes.has(from)) nodes.set(from, { kind: "left", at });
  });
  if (fired.length) for (const mark of nodes.values()) if (mark.kind === "active") mark.at ??= 0;
  if (!nodes.size && !edges.size) return null;
  const kept = new Set([...nodes.keys(), ...[...edges.keys()].map(edge => level.edges[edge].to)]);
  return { nodes, edges, kept };
}
