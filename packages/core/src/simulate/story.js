// The story of a scenario (simulator spec §7): what the stage and the scenario page tell — its start, then each recorded
// step taken again with its recorded answers, as the design runs now. Each frame says which edges the step took, the
// level where it is best seen and the levels above it, where the run is after it and its clock.
import { locate } from "./places.js";

/** Nodes a run passes through on its way in, without an input: a region's initial node, a flow's start. */
const WAYS_IN = new Set(["initial", "start"]);

/**
 * @typedef {{ edge: string, canvas: string, from: string, to: string, initial: boolean }} Taken An edge a step took:
 *   the level it is drawn on, the paths it went from and to, and whether it only led the run in.
 * @typedef {{ step: number, do: object | null, answers: object[], caption?: string, clock: string, active: string[],
 *   ended?: string, taken: Taken[], level: string, trail: string[], trace: object[] }} Frame `step` 0 is the start;
 *   `active` is where the run is after it: the active leaf states, or a flow's tokens (a node holding several appears
 *   as often); `trail`: the levels from the run's top level down to `level`; `trace`: the point's micro-events.
 */

/**
 * The edges a step took (simulator spec §5.5), in the order it took them: its transitions and its tokens' moves, each
 * with the level it is drawn on. An edge taken several times in one step is listed once, where it was first taken.
 * @returns {Taken[]}
 */
function takenOf(doc, top, trace) {
  const taken = [];
  const seen = new Set();
  const add = (edge, from, to) => {
    const place = locate(doc, top, to)?.at(-1);
    if (!edge || seen.has(edge) || !place) return;
    seen.add(edge);
    const source = locate(doc, top, from)?.at(-1);
    const kind = source && doc.canvases[source.canvas]?.nodes[source.node]?.kind;
    taken.push({ edge, canvas: place.canvas, from, to, initial: WAYS_IN.has(kind) });
  };
  for (const entry of trace) {
    if (entry.type === "transition") add(entry.edge, entry.from, entry.to);
    if (entry.type === "token" && entry.change === "moved") add(entry.edge, entry.from, entry.to);
    if (entry.type === "token" && entry.change === "forked") {
      entry.edges.forEach((edge, index) => add(edge, entry.from, entry.to[index]));
    }
  }
  return taken;
}

/** The levels from the run's top level down to `level`, through one of these paths that goes there. */
function trailOf(doc, top, level, paths) {
  if (level === top) return [top];
  for (const path of paths) {
    const places = locate(doc, top, path) ?? [];
    const at = places.findIndex(place => place.canvas === level);
    if (at >= 0) return places.slice(0, at + 1).map(place => place.canvas);
  }
  return [top, level];
}

/**
 * One frame of a story (simulator spec §7.1): a point of a run — the start or a step, with the session it reached and
 * its trace — with the edges it took, in order, and where it is best seen: "the level where the step's last transition
 * happened". That is the level of the last edge its input took, not of the initial transitions it then took inside the
 * states it entered; a step that took none is seen where the frame before it was, and the start on the run's top level.
 * @param {any} doc
 * @param {string} top The run's top executable canvas.
 * @param {{ step: number, do: object | null, answers?: object[], caption?: string, session: object,
 *   trace: object[] }} point
 * @param {string | null} previous The level of the frame before (null for the start).
 * @param {(session: object) => { active: string[] }} reachedOf
 * @returns {Frame}
 */
export function frameFrom(doc, top, point, previous, reachedOf) {
  const { session } = point;
  const taken = takenOf(doc, top, point.trace);
  const level = previous === null ? top : (taken.findLast(item => !item.initial)?.canvas ?? previous);
  const active = session.tokens ? session.tokens.map(token => token.path) : reachedOf(session).active;
  return {
    step: point.step,
    do: point.do ?? null,
    answers: point.answers ?? [],
    ...(point.caption ? { caption: point.caption } : {}),
    clock: session.clock,
    active,
    ...(session.ended ? { ended: session.ended } : {}),
    taken,
    level,
    trail: trailOf(doc, top, level, [...taken.map(item => item.to), ...active]),
    trace: point.trace
  };
}

/**
 * Tell a scenario (simulator spec §7.1, §7.2): its start, then each recorded step taken again with its recorded
 * answers, as the Editor's run takes it (answers nothing asks for left out, answers that no longer fit dropped). The
 * story stops at the first step the design no longer takes: one that asks a question the recording does not answer,
 * or that the engine refuses.
 * @param {any} doc
 * @param {object} scenario A scenario: its `canvas`, `start` and `steps`.
 * @param {{ start: Function, step: Function, reachedOf: Function }} engine
 * @returns {{ canvas: string, frames: Frame[], stopped: null | { step: number, question?: object, code?: string,
 *   message?: string } }} `stopped.step`: the step that could not be taken (0: the start).
 */
export function storyFrom(doc, scenario, { start, step, reachedOf }) {
  const top = scenario.canvas;
  const frames = [];
  const stop = (number, result) => ({
    canvas: top,
    frames,
    stopped:
      result.status === "needs" ?
        { step: number, question: result.question }
      : { step: number, code: result.code, message: result.message }
  });

  // A point taken again as the Editor's run takes it (its Run, its stage): answers nothing asks for any more are left
  // out, and answers that no longer fit are dropped so the question is asked — the page tells the same story.
  const attempt = (take, recorded) => {
    let answers = recorded ?? [];
    let result = take(answers);
    if (result.status === "error" && result.code === "extraAnswers") {
      answers = answers.slice(0, result.trace.filter(entry => entry.type === "answered").length);
      result = take(answers);
    } else if (result.status === "error" && result.code === "badAnswer") {
      answers = [];
      result = take(answers);
    }
    return { ...result, answers };
  };

  let result = attempt(answers => start(doc, { canvas: top, ...scenario.start, answers }), scenario.start.answers);
  if (result.status !== "done") return stop(0, result);
  frames.push(frameFrom(doc, top, { ...result, step: 0, do: null }, null, reachedOf));
  for (const [index, recorded] of scenario.steps.entries()) {
    const { session } = result;
    result = attempt(answers => step(doc, session, { do: recorded.do, answers }), recorded.answers);
    if (result.status !== "done") return stop(index + 1, result);
    const point = { ...recorded, ...result, step: index + 1 };
    frames.push(frameFrom(doc, top, point, frames.at(-1).level, reachedOf));
  }
  return { canvas: top, frames, stopped: null };
}
