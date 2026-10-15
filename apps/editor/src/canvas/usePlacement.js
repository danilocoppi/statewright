import { useEffect, useState } from "react";

import { editorStore } from "@/store/editor";
import { layoutClient } from "@/workers";

import { placeMissing } from "./placement";

/**
 * Place the level's unplaced boxes when it is shown (spec §4.3). In an editing tab the positions are stored, so the
 * document itself changes; in a read-only tab, where nothing is stored, the placed copy is returned to be drawn.
 * @param {object} doc The store's document.
 * @param {string} canvasId
 * @param {number} unplaced How many boxes of the level have no position.
 * @returns {{ placed: object | null, placing: boolean, failed: boolean, retry: () => void }} `failed` when the level
 *   could not be arranged; `retry` asks again.
 */
export function usePlacement(doc, canvasId, unplaced) {
  const [attempt, setAttempt] = useState(null);
  const settled = attempt?.source === doc && attempt.canvasId === canvasId;
  const placing = unplaced > 0 && !settled;

  useEffect(() => {
    if (!placing) return;
    let current = true;
    const settle = (placed, failed = false) => current && setAttempt({ source: doc, canvasId, placed, failed });
    placeMissing({ editor: editorStore, client: layoutClient(), canvasId })
      .then(result => !result.stale && settle(result.doc ?? null))
      // Without a layout the level shows what is placed and says so; the next change, visit or retry tries again.
      .catch(() => settle(null, true));
    return () => {
      current = false;
    };
  }, [placing, doc, canvasId]);

  return {
    placed: settled ? attempt.placed : null,
    placing,
    failed: unplaced > 0 && settled && attempt.failed,
    retry: () => setAttempt(null)
  };
}
