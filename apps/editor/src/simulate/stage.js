// The stage (simulator spec §7.1): the run presented one point at a time, each as a frame of its story — the edges it
// took, the level where it is best seen and the levels down to it.
import { frameOf } from "statewright/simulate";

/** The frames worked out for each run's points, while its document is the one they were worked out on. */
const kept = new WeakMap();

/**
 * The frames of a run's points (Core's `frameOf`): the start on the run's top level, then each step where its input's
 * last transition is drawn, else where the step before it was seen.
 * @param {object} doc
 * @param {string} top The run's top executable canvas.
 * @param {object[]} points The run's points.
 * @returns {object[]}
 */
export function framesOf(doc, top, points) {
  const found = kept.get(points);
  if (found?.doc === doc) return found.frames;
  const frames = [];
  for (const [index, point] of points.entries()) {
    frames.push(frameOf(doc, top, { ...point, step: index }, index ? frames[index - 1].level : null));
  }
  kept.set(points, { doc, frames });
  return frames;
}

/** Ask the browser for its full screen: the stage fills the window where it cannot (simulator spec §7.1). */
export function enterFullScreen(root = globalThis.document?.documentElement) {
  root?.requestFullscreen?.()?.catch?.(() => {});
}

/** Leave the browser's full screen, if the stage took it. */
export function leaveFullScreen(page = globalThis.document) {
  if (page?.fullscreenElement) page.exitFullscreen?.()?.catch?.(() => {});
}
