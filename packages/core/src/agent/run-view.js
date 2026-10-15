// A run as an agent reads it (AI interface spec §4.2: simulate and scenarios), the same from every host: the file
// host's run and the Editor's simulation panel are both a list of points — the start, then each step, each with the
// session it reached — a question pending, and a step that could not be taken.
import { reachedOf } from "../simulate/index.js";

/**
 * A point of a run: its number (0: the start), the input, the answers it took, where the run is, the clock.
 * @param {{ do: object | null, answers: object[], session: object }} point
 * @param {number} index
 */
export function pointOf(point, index) {
  const reached = reachedOf(point.session);
  return {
    step: index,
    do: point.do,
    ...(point.answers.length ? { answers: point.answers } : {}),
    active: reached.active,
    clock: point.session.clock,
    ...(reached.ended ? { ended: reached.ended } : {})
  };
}

/** A step that could not be taken: its input, the engine's code and message, and where it stopped. */
const failureOf = failure =>
  failure && {
    do: failure.do,
    code: failure.code,
    message: failure.message,
    ...(failure.details ? { details: failure.details } : {})
  };

/**
 * What a call on a run answers: the point it is at, a question pending, a step that could not be taken.
 * @param {{ points: object[], asking: { question: object } | null, failure: object | null }} run
 */
export function runResultOf(run) {
  const last = run.points.length - 1;
  return {
    point: last >= 0 ? pointOf(run.points[last], last) : null,
    question: run.asking?.question ?? null,
    ...(run.failure ? { failure: failureOf(run.failure) } : {})
  };
}

/**
 * The whole run (`run.state`): its level, every point, a question or a failure pending, and how many steps no scenario
 * holds.
 * @param {{ canvas: string, points: object[], asking: { question: object } | null, failure: object | null }} run
 * @param {number} unsaved
 */
export function runStateOf(run, unsaved) {
  return {
    canvas: run.canvas,
    points: run.points.map(pointOf),
    question: run.asking?.question ?? null,
    failure: failureOf(run.failure) ?? null,
    unsaved
  };
}
