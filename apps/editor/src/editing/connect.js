// Connecting boxes (spec §7.2): what a new edge looks like on each kind of canvas, the box a drag to empty space
// creates, and what the canvas refuses before Core is asked — what the format forbids, said in plain words.
import { applyBatch, associationRefusal, CommandError, isGuest } from "statewright";

import { regionAt } from "./changes";
import { idsFor } from "./ids";

/**
 * @typedef {"elsewhere" | "intoStart" | "fromTerminal" | "initialOnce" | "crossRegion" | "secondInitial" | "guest"
 *   | "noMeaning" | "already" | "notRun" | "nothingToReceive"} Refusal The last four: a role's connector (Core's
 *   `associate`).
 *   Keys of `editor:refusals` (with Core's error codes for anything else Core refuses).
 */

/** Machine nodes nothing leads into (Core's rule edge.target). */
const NOT_TARGETS = new Set(["initial", "entry", "any"]);

const outgoing = (canvas, nodeId) => Object.values(canvas.edges).filter(edge => edge.from === nodeId);

/**
 * The edge from one box to another, as it is first added: a link when it touches a shortcut; on flows, the next
 * branch of an if (true, then false) or a case of a switch.
 * @returns {object} The edge value for `edge.add`.
 */
export function edgeFor(doc, canvasId, from, to) {
  const canvas = doc.canvases[canvasId];
  const ends = [canvas.nodes[from], canvas.nodes[to]];
  if (ends.some(node => node?.kind === "ref")) return { from, to, kind: "link" };
  if (canvas.kind !== "flow") return { from, to };
  const taken = outgoing(canvas, from);
  if (ends[0].kind === "if") {
    const branch = ["true", "false"].find(kind => !taken.some(edge => edge.kind === kind));
    return branch ? { from, to, kind: branch } : { from, to };
  }
  if (ends[0].kind === "switch") {
    const cases = taken.filter(edge => edge.kind === "case").length;
    return { from, to, kind: "case", case: `case ${cases + 1}` };
  }
  return { from, to };
}

/** A role's refusal in the words of the level's kind: on a system, what a box can drive. */
export const inWords = (kind, reason) => (kind === "system" && reason === "noMeaning" ? "noDrive" : reason);

/**
 * Whether a connection between two elements of a level would be a role's connector (mixed levels spec §3): it ends at
 * a transition, or a guest is at one end (shortcuts link to anything).
 */
export function isRolePair(doc, canvasId, from, to) {
  const canvas = doc.canvases[canvasId];
  if (canvas.edges[to]) return true;
  // On a system, a transition of a lifecycle framed there (mixed levels spec §4.3).
  if (canvas.kind === "system" && !canvas.nodes[to]) return true;
  const ends = [canvas.nodes[from], canvas.nodes[to]];
  if (ends.some(node => node?.kind === "ref")) return false;
  return ends.some(node => node && isGuest(canvas.kind, node));
}

/**
 * Why the canvas will not connect two boxes, or null when it will: what the format forbids first (spec §7.2), then
 * anything else Core refuses (its error code).
 * @returns {Refusal | string | null}
 */
export function connectRefusal(doc, canvasId, from, to) {
  const canvas = doc.canvases[canvasId];
  // A role's connector writes the field that holds its meaning (mixed levels spec §3): Core judges what it means.
  if (canvas.nodes[from] && isRolePair(doc, canvasId, from, to)) {
    return inWords(canvas.kind, associationRefusal(doc, canvasId, from, to));
  }
  const source = canvas.nodes[from];
  const target = canvas.nodes[to];
  if (!source || !target) return "elsewhere";
  if (canvas.kind === "machine") {
    if (NOT_TARGETS.has(target.kind)) return "intoStart";
    if (source.kind === "state" && source.terminal) return "fromTerminal";
    if (source.kind === "initial" && outgoing(canvas, from).length) return "initialOnce";
    if (source.region !== target.region && source.kind !== "ref" && target.kind !== "ref") return "crossRegion";
  }
  try {
    applyBatch(doc, [{ type: "edge.add", args: { canvas: canvasId, edge: edgeFor(doc, canvasId, from, to) } }]);
  } catch (error) {
    if (error instanceof CommandError) return error.code;
    throw error;
  }
  return null;
}

/**
 * Why nothing can start from a box, or null: a terminal state has no way out, an initial node leads to one state.
 * @returns {"fromTerminal" | "initialOnce" | "guest" | null}
 */
export function startRefusal(doc, canvasId, from) {
  const canvas = doc.canvases[canvasId];
  const node = canvas.nodes[from];
  // On a machine, a participant starts what it sends and embedded steps go where they run (mixed levels spec §4).
  if (node && isGuest(canvas.kind, node)) return canvas.kind === "machine" ? null : "guest";
  if (canvas.kind !== "machine" || !node) return null;
  if (node.kind === "state" && node.terminal) return "fromTerminal";
  if (node.kind === "initial" && outgoing(canvas, from).length) return "initialOnce";
  return null;
}

/**
 * Why nothing can be made in empty space from a box: what stops it starting, or a guest, which has no transition or
 * step of the level's own to start (spec §7.2: a box of the natural kind, connected from it).
 * @returns {"fromTerminal" | "initialOnce" | "guest" | null}
 */
export function emptyRefusal(doc, canvasId, from) {
  const canvas = doc.canvases[canvasId];
  const node = canvas.nodes[from];
  if (node && isGuest(canvas.kind, node)) return "guest";
  return startRefusal(doc, canvasId, from);
}

/**
 * The commands that connect two boxes of a level, with the new edge's ID (shared with the change's other commands).
 * @returns {{ id: string, commands: object[] }}
 */
export function connectCommands(doc, canvasId, from, to, ids = idsFor(doc)) {
  const nodes = doc.canvases[canvasId].nodes;
  const name = id => nodes[id]?.name ?? nodes[id]?.kind ?? "";
  const id = ids.take("edg", `${name(from)} ${name(to)}`);
  return {
    id,
    commands: [{ type: "edge.add", args: { canvas: canvasId, id, edge: edgeFor(doc, canvasId, from, to) } }]
  };
}

/**
 * Whether the trigger editor opens on an edge just made (spec §7.2): transitions and system connections say what they
 * carry; out of an if or a switch, which branch they are. Links and plain flow steps ask nothing.
 */
export function asksAfterConnect(doc, canvasId, edgeId) {
  const canvas = doc.canvases[canvasId];
  const edge = canvas.edges[edgeId];
  if (!edge || edge.kind === "link") return false;
  return canvas.kind !== "flow" || ["if", "switch"].includes(canvas.nodes[edge.from]?.kind);
}

/**
 * Why a node cannot go where it would be placed, or null: a region (or a machine without regions) starts at one
 * initial node.
 * @param {{ x: number, y: number }} point
 * @returns {Refusal | null}
 */
export function placeRefusal(doc, canvasId, node, point) {
  const canvas = doc.canvases[canvasId];
  if (canvas.kind !== "machine" || node.kind !== "initial") return null;
  const { region } = regionAt(doc, canvasId, point);
  const initial = Object.values(canvas.nodes).some(item => item.kind === "initial" && item.region === region);
  return initial ? "secondInitial" : null;
}

/**
 * The tool a drag from a box to empty space uses for the new box (spec §7.2: "a new node of the natural kind"): a
 * state on machines, a service on systems, an action on flows.
 * @param {"system" | "machine" | "flow"} kind
 */
export const naturalTool = kind => ({ system: "service", machine: "state", flow: "action" })[kind];
