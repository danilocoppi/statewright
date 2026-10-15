import { useRef, useState } from "react";

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

/** The transition of the level under a pointer event's target (its route or its label), if any. */
const transitionUnder = target => {
  const id = target?.closest?.(".react-flow__edge")?.dataset.id;
  return id && !id.includes("/") && !id.includes(":") ? id : null;
};

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
    if (target) {
      connectBoxes(t, source, target, at);
      return;
    }
    // Onto a transition: a participant sends it, embedded steps run there (mixed levels spec §4).
    const transition = transitionUnder(event.target);
    if (transition) {
      connectBoxes(t, source, transition, at);
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
