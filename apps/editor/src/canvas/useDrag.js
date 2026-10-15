import { useState } from "react";

import { moveCommands } from "@/editing/changes";
import { change } from "@/editing/state";
import { editorStore } from "@/store/editor";

/**
 * Moving boxes and notes by dragging them (spec §4.2): while the drag lasts the positions are the view's own; the drop
 * is one change. Edges touching what moves are drawn as a preview until then.
 * @param {(key: string) => string} t The `editor` texts.
 * @param {string} canvasId
 * @returns {{ positions: Map<string, { x: number, y: number }> | null, onMove: (changes: object[]) => void,
 *   onDrop: (event: unknown, node: object, nodes: object[]) => void }} Pass `onMove` the node changes and `onDrop`
 *   React Flow's `onNodeDragStop`.
 */
export function useDrag(t, canvasId) {
  const [positions, setPositions] = useState(null);

  const onMove = changes => {
    const moves = changes.filter(item => item.type === "position" && item.position && item.dragging);
    if (!moves.length) return;
    setPositions(current => {
      const next = new Map(current ?? []);
      for (const item of moves) next.set(item.id, item.position);
      return next;
    });
  };

  const onDrop = (_event, _node, nodes) => {
    setPositions(null);
    const { doc } = editorStore.getState();
    const moves = nodes.map(node => [node.id, node.position]);
    if (!moves.length) return;
    change(moveCommands(doc, canvasId, moves), { label: t("editing.move"), at: nodes[0].position });
  };

  return { positions, onMove, onDrop };
}
