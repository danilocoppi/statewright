import { useRef, useState } from "react";
import { isGuest } from "statewright";

import { connectBoxes } from "@/editing/actions";
import { emptyRefusal, naturalTool } from "@/editing/connect";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

/** The box of the level under a pointer event's target, if any (decorations and parts inside frames are not boxes). */
const boxUnder = target => {
  const node = target?.closest?.(".react-flow__node-node, .react-flow__node-frame");
  const id = node?.dataset.id;
  return id && !id.includes("/") ? id : null;
};

/** How near a route a drop counts as on it, in canvas units. */
const NEAR = 8;

/** The distance from a point to a segment. */
function toSegment([x1, y1], [x2, y2], { x, y }) {
  const [dx, dy] = [x2 - x1, y2 - y1];
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length)) : 0;
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * The transition a connection dropped at a point lands on (mixed levels spec §4): its label, or its route within a few
 * units — on the level or inside a frame, where the pointer passes through the picture. Null when none.
 * @param {Array<{ type: string, data: { part: { id: string, points: number[][] }, label?: object } }>} edges
 * @param {{ x: number, y: number }} point In canvas coordinates.
 * @param {{ framed?: boolean }} [where] `framed`: only transitions inside a frame (a lifecycle on a system); false: only
 *   the level's own; left out: any.
 */
export function transitionAt(edges, point, { framed } = {}) {
  edges = framed === undefined ? edges : edges.filter(edge => edge.id.includes("/") === framed);
  for (const { type, data } of edges) {
    const box = type === "figure" ? data.label : null;
    if (box && point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h) {
      return data.part.id;
    }
  }
  for (const { type, data } of edges) {
    if (type !== "figure") continue;
    const points = data.part.points;
    for (let index = 1; index < points.length; index += 1) {
      if (toSegment(points[index - 1], points[index], point) <= NEAR) return data.part.id;
    }
  }
  return null;
}

/** How far the pointer moves before a drag back onto its own box connects the box to itself (not a click). */
const DRAGGED = 8;

/**
 * Connecting by dragging from a box's handle (spec §7.2): onto another box, it connects them — back onto the same box,
 * to itself; onto empty canvas, a box of the level's natural kind is drafted there, connected, with its name in edit;
 * onto anything else (a note, a part inside a frame), it is refused.
 * @param {(key: string) => string} t The `editor` texts.
 * @param {import("@xyflow/react").ReactFlowInstance} flow
 * @returns {{ from: string | null, onConnectStart: Function, onConnect: Function, onConnectEnd: Function }} `from`:
 *   the box a connection is being dragged from.
 */
export function useConnect(t, flow) {
  const [from, setFrom] = useState(null);
  const made = useRef(false);
  const started = useRef(null);

  /** Where a pointer or touch event is on the screen. */
  const pointOf = event => ("changedTouches" in event ? event.changedTouches[0] : event);

  const onConnectStart = (event, { nodeId }) => {
    made.current = false;
    const point = event && pointOf(event);
    started.current = point ? { x: point.clientX, y: point.clientY } : null;
    setFrom(nodeId);
  };

  // Dropped on a box's own handle: React Flow names both ends.
  const onConnect = ({ source, target }) => {
    made.current = true;
    connectBoxes(t, source, target, flow.getInternalNode(target)?.internals.positionAbsolute ?? { x: 0, y: 0 });
  };

  const onConnectEnd = (event, state) => {
    setFrom(null);
    if (made.current) return;
    const source = state?.fromNode?.id;
    const { doc, canvasId } = editorStore.getState();
    const position = pointOf(event);
    const at = flow.screenToFlowPosition({ x: position.clientX, y: position.clientY });
    if (!source) return;
    const target = boxUnder(event.target);
    const moved =
      !started.current ||
      Math.hypot(position.clientX - started.current.x, position.clientY - started.current.y) >= DRAGGED;
    if (target === source && !moved) return;
    // Onto a transition: a participant sends it, embedded steps run there, a system's box drives a framed lifecycle
    // (mixed levels spec §4). Only a role's connector lands on a transition — and inside a frame, the transition under
    // the pointer is meant rather than the frame's box.
    const kind = doc.canvases[canvasId].kind;
    const roleStart = kind === "system" || isGuest(kind, doc.canvases[canvasId].nodes[source]);
    const transition = roleStart ? transitionAt(flow.getEdges(), at, { framed: kind === "system" }) : null;
    const frame = target && event.target?.closest?.(".react-flow__node-frame");
    if (transition && (!target || frame)) {
      connectBoxes(t, source, transition, at);
      return;
    }
    if (target) {
      connectBoxes(t, source, target, at);
      return;
    }
    // Over something drawn that is not a box of this level: a note, or a part inside a frame.
    if (event.target?.closest?.(".react-flow__node")) {
      editingStore.getState().refuse({ reason: "elsewhere", at });
      return;
    }
    const refusal = emptyRefusal(doc, canvasId, source);
    if (refusal) {
      editingStore.getState().refuse({ reason: refusal, at });
      return;
    }
    editingStore.getState().open({ type: "draft", tool: naturalTool(doc.canvases[canvasId].kind), at, from: source });
  };

  return { from, onConnectStart, onConnect, onConnectEnd };
}
