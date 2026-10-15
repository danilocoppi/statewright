import { useEffect, useRef } from "react";

import { parentLevel } from "@/features/editor/levels";
import { editorStore } from "@/store/editor";
import { currentInspectorWidth } from "@/stores/inspector";

import { fitFor } from "./viewport";

/** Level zoom and the fade that replaces movement (spec §5.2). */
export const MOTION = { zoom: 250, fade: 120, easing: "cubic-bezier(.2,.7,.2,1)" };

export const prefersReducedMotion = () => Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * Run `then` once the page's fonts are in and the boxes measured in them — at once when no font is loading. The
 * level's heading is measured by the page, so a level framed while its fonts load would be framed a few pixels off,
 * and differently from one visit to the next.
 * @returns {() => void} Cancels the wait.
 */
export function whenFontsAreIn(then, fonts = globalThis.document?.fonts) {
  if (fonts?.status !== "loading") {
    then();
    return () => {};
  }
  let waiting = true;
  // Two frames after the fonts are in: the page lays the boxes out in them, then React Flow measures them again.
  fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => waiting && then())));
  return () => (waiting = false);
}

/** The box of a projected node, for React Flow's fitBounds. */
export const boundsOf = node => ({ x: node.position.x, y: node.position.y, width: node.width, height: node.height });

/**
 * Frame each level as it is shown (spec §6.3): where it was left in this session, or whole. Coming up from an
 * interior, the view starts on the box that holds it and zooms back out; any other arrival fades in. With reduced
 * motion, every arrival fades. `onFramed(canvasId)` says when the level's view is in place (React Flow applies a fit
 * once the boxes are measured): what is then brought into view is not undone by the framing.
 * @param {{ flow: import("@xyflow/react").ReactFlowInstance, doc: object, canvasId: string, nodes: object[],
 *   ready: boolean, container: import("react").RefObject<HTMLElement>, onFramed?: (canvasId: string) => void,
 *   beside?: boolean, stage?: boolean }} options `ready` once the level is placed. `beside`: the simulation panel is
 *   open — every level is framed whole in the room left of it, where it was left being framed for the whole canvas.
 *   `stage`: a scenario is presented — every level is framed whole on the stage (simulator spec §7.1).
 * @returns {import("react").RefObject<string | null>} The level the view is framed on: the view belongs to it, and
 *   only then is it remembered as that level's. Null while a box is being opened.
 */
export function useLevelView({
  flow,
  doc,
  canvasId,
  nodes,
  ready,
  container,
  onFramed,
  beside = false,
  stage = false
}) {
  const shown = useRef(null);
  const waiting = useRef(() => {});

  useEffect(() => {
    if (!ready || shown.current === canvasId) return;
    const from = shown.current;
    shown.current = canvasId;
    const reduce = prefersReducedMotion();
    const stored = beside || stage ? null : editorStore.getState().view.viewports[canvasId];
    const frame = duration =>
      Promise.resolve(
        stored ?
          flow.setViewport(stored, { duration })
        : flow.fitView({
            ...fitFor(container.current?.clientWidth ?? 0, { beside, stage, inspector: currentInspectorWidth() }),
            duration
          })
      ).then(() => onFramed?.(canvasId));
    const above = from && parentLevel(doc, from);
    const box = above?.canvas === canvasId && nodes.find(node => node.id === above.box);
    // A level framed later than this one (or the canvas gone) cancels what still waits for the fonts.
    waiting.current();
    if (box && !reduce) {
      flow.fitBounds(boundsOf(box), { duration: 0, padding: 0.02 });
      waiting.current = whenFontsAreIn(() => frame(MOTION.zoom));
      return;
    }
    container.current
      ?.querySelector(".react-flow__viewport")
      ?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: MOTION.fade, easing: MOTION.easing });
    waiting.current = whenFontsAreIn(() => frame(0));
  }, [flow, doc, canvasId, nodes, ready, container, onFramed, beside, stage]);
  useEffect(() => () => waiting.current(), []);

  return shown;
}
