// What the panel and the canvas both read about the run shown.
import { useMemo } from "react";
import { moves as movesOf } from "statewright/simulate";

import { useEditor } from "@/store/editor";

import { marksFor } from "./marks";
import { shownPoint } from "./runs";
import { framesOf } from "./stage";
import { useSimulation } from "./store";

/** The moves worked out for each session, while its document is the one they were worked out on. */
const found = new WeakMap();

/**
 * What can happen from a session (simulator spec §5.2): the engine's moves, or the reason when the session no longer
 * matches the document (a stored copy reloaded under the run). Worked out once per session and document: the panel
 * and the canvas read the same.
 * @returns {{ list: object[] } | { error: string }}
 */
export function movesFrom(doc, session) {
  if (!session) return { list: [] };
  const kept = found.get(session);
  if (kept?.doc === doc) return kept.result;
  let result;
  try {
    result = { list: movesOf(doc, session) };
  } catch (error) {
    result = { error: String(error?.message ?? error) };
  }
  found.set(session, { doc, result });
  return result;
}

/** What can happen from a session, in a component. */
export function useMoves(session) {
  const doc = useEditor(state => state.doc);
  return useMemo(() => movesFrom(doc, session), [doc, session]);
}

/**
 * The frames of the run shown, as the stage presents them (simulator spec §7.1); none while it is not presented, so a
 * long run does not work them out again at each step.
 */
export function useFrames() {
  const doc = useEditor(state => state.doc);
  const top = useSimulation(state => state.canvas);
  const points = useSimulation(state => state.points);
  const presenting = useSimulation(state => state.stage);
  return useMemo(() => (top && presenting ? framesOf(doc, top, points) : []), [doc, top, points, presenting]);
}

/** How long each edge a step took pulses on the stage, about (simulator spec §7.1). */
export const PULSE = 600;

/**
 * The marks of the level shown, for the run shown (simulator spec §6.3), or null when there is no run or it has
 * nothing there. An earlier step shows where the run was, without what could happen; a question numbers its edges.
 * On the stage (spec §7.1), a step shows what it took instead, played when the story moved on to it by one.
 */
export function useMarks(canvasId) {
  const doc = useEditor(state => state.doc);
  const running = useSimulation(state => state.mode === "run" || Boolean(state.asking));
  const top = useSimulation(state => state.canvas);
  const point = useSimulation(shownPoint);
  const latest = useSimulation(state => state.shown === null);
  const asking = useSimulation(state => state.asking);
  const presenting = useSimulation(state => state.stage);
  const playing = useSimulation(
    state => state.played !== null && state.played === (state.shown ?? state.points.length - 1)
  );
  const index = useSimulation(state => state.shown ?? state.points.length - 1);
  const frames = useFrames();
  return useMemo(() => {
    if (!running || !point) return null;
    if (presenting) {
      const taken = frames[index]?.taken ?? [];
      return marksFor(doc, canvasId, { top, session: point.session, taken, each: playing ? PULSE : 0 });
    }
    const moves = latest && !asking ? (movesFrom(doc, point.session).list ?? []) : [];
    return marksFor(doc, canvasId, { top, session: point.session, moves, question: asking?.question ?? null });
  }, [doc, canvasId, running, top, point, latest, asking, presenting, playing, index, frames]);
}
