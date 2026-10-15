// A run in the simulation panel (simulator spec §6): pure functions from one state of the panel to the next, so what
// the person does is tested without a screen. A run is a list of points — the start, then each step — each with the
// session it reached. A question stops an input until it is answered; an error leaves the run where it was. A saved
// scenario is followed point by point and each point is compared with its recording.
import { reachedOf, start, step } from "statewright/simulate";

/**
 * @typedef {{ kind: string, at: string, value: unknown }} Answer
 * @typedef {{ do: object | null, answers: Answer[], session: object, trace: object[], caption?: string,
 *   recorded?: number, status?: "same" | "diverged", reason?: "reached" | "question" | "answers" }} Point `do`: null
 *   for the start. `recorded`: the index of the scenario's point it replays (0: the start); `status` and `reason`: how
 *   it compares with that recording.
 * @typedef {{ do: object | null, answers: Answer[], reached?: object, caption?: string }} Recorded
 * @typedef {{ mode: null | "start" | "run", canvas: string | null, init: object | null, points: Point[],
 *   shown: number | null, asking: object | null, failure: object | null,
 *   script: { id: string, recorded: Recorded[], following: boolean } | null }} RunState `shown`: the point shown,
 *   null for the last; `asking`: an input waiting for an answer; `failure`: the last input could not be taken.
 */

/** Not simulating. */
export const IDLE = Object.freeze({
  mode: null,
  canvas: null,
  init: null,
  points: [],
  shown: null,
  asking: null,
  failure: null,
  script: null
});

/** The Start panel for a top executable canvas (spec §6.2, mockup 02). */
export const opening = canvas => ({ ...IDLE, mode: "start", canvas });

/** Whether two recordings say the same: the same active paths and the same ending. */
export const sameReached = (a, b) =>
  a.active.length === b.active.length &&
  a.active.every((path, index) => path === b.active[index]) &&
  a.ended === b.ended;

/** An object without one of its keys. */
const without = (object, key) => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));

/** The same answers, in the same order. */
const sameAnswers = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Start the run (`input` null) or take an input from the last point, with these answers. */
function attempt(doc, state, input, answers) {
  if (input === null) return start(doc, { canvas: state.canvas, ...state.init, answers });
  return step(doc, state.points.at(-1).session, { do: input, answers });
}

/** How a point that replays a recording compares with it. */
function compared(state, point, { recorded, reason }) {
  const kept = state.script.recorded[recorded];
  const why =
    reason ??
    (kept.reached && !sameReached(reachedOf(point.session), kept.reached) ? "reached"
    : !sameAnswers(point.answers, kept.answers) ? "answers"
    : null);
  return {
    ...point,
    recorded,
    ...(kept.caption ? { caption: kept.caption } : {}),
    status: why ? "diverged" : "same",
    ...(why ? { reason: why } : {})
  };
}

/** What an input's result makes of the state: a new point, a question to answer, or a failure. */
function settle(state, input, answers, result, replaying = null) {
  if (result.status === "needs") {
    const asking = { do: input, answers, question: result.question, trace: result.trace, replaying };
    return { ...state, asking, failure: null };
  }
  if (result.status === "error") {
    const { code, message, details, trace } = result;
    return {
      ...state,
      asking: null,
      failure: { do: input, code, message, ...(details ? { details } : {}), trace, replaying }
    };
  }
  let point = { do: input, answers, session: result.session, trace: result.trace };
  if (replaying) point = compared(state, point, replaying);
  return { ...state, mode: "run", points: [...state.points, point], shown: null, asking: null, failure: null };
}

/**
 * Start a run with the person's starting values (spec §6.2: Start).
 * @param {{ at: string, entry?: string, context?: object, input?: unknown }} init
 */
export function begin(doc, state, init) {
  const fresh = { ...IDLE, mode: state.mode ?? "start", canvas: state.canvas, init };
  return settle(fresh, null, [], attempt(doc, fresh, null, []));
}

/** Start again from the same values; a scenario being followed starts again from its start. */
export function restart(doc, state) {
  if (state.script?.following) return follow(doc, state, state.script.id);
  return begin(doc, { ...state, mode: "run" }, state.init);
}

/** Take an event, a call or time passing from the last point. A move of one's own stops following a scenario. */
export function take(doc, state, input) {
  const free = state.script?.following ? { ...state, script: { ...state.script, following: false } } : state;
  return settle(free, input, [], attempt(doc, free, input, []));
}

/** Answer the question an input stopped at, and take it again with every answer so far. */
export function answer(doc, state, value) {
  const { asking } = state;
  const answers = [...asking.answers, { kind: asking.question.kind, at: asking.question.at, value }];
  return settle(state, asking.do, answers, attempt(doc, state, asking.do, answers), asking.replaying);
}

/**
 * Leave a question unanswered, or an error read: the input is not taken. Before the run has started, that is the
 * Start panel again.
 */
export const dismiss = state =>
  state.points.length ?
    { ...state, asking: null, failure: null }
  : { ...state, mode: "start", asking: null, failure: null, script: null };

/** ⌘Z (spec §6.2): leave what is pending, or go back one step (the start stays). */
export function back(state) {
  if (state.asking || state.failure) return dismiss(state);
  if (state.points.length <= 1) return state;
  return { ...state, points: state.points.slice(0, -1), shown: null };
}

/** Show the run at a point (spec §6.2: clicking a step); null shows the last. */
export const show = (state, index) => ({
  ...state,
  shown: index === null || index >= state.points.length - 1 ? null : index
});

/** The point shown: the last one unless another was picked. */
export const shownPoint = state => state.points[state.shown ?? state.points.length - 1] ?? null;

/** Continue from the point shown: the later steps are discarded. */
export function continueFrom(state) {
  if (state.shown === null) return state;
  return { ...state, points: state.points.slice(0, state.shown + 1), shown: null, asking: null, failure: null };
}

/** The recording a scenario holds, as points: its start (with the answers given while starting), then its steps. */
export function recordingOf(scenario) {
  return [
    { do: null, answers: scenario.start.answers ?? [] },
    ...scenario.steps.map(item => ({
      do: item.do,
      answers: item.answers ?? [],
      reached: item.reached,
      ...(item.caption ? { caption: item.caption } : {})
    }))
  ];
}

/**
 * Take the recording's point `index` again, with its recorded answers (spec §6.4: Run). Answers that no longer fit are
 * set aside: left-over answers are dropped, answers to other questions are asked again — and the point diverges.
 */
function replayPoint(doc, state, index) {
  const kept = state.script.recorded[index];
  let answers = kept.answers;
  let result = attempt(doc, state, kept.do, answers);
  let reason = null;
  if (result.status === "error" && result.code === "extraAnswers") {
    answers = answers.slice(0, result.details.used);
    result = attempt(doc, state, kept.do, answers);
    reason = "answers";
  } else if (result.status === "error" && result.code === "badAnswer") {
    answers = [];
    result = attempt(doc, state, kept.do, answers);
    reason = "question";
  }
  if (result.status === "needs") reason = "question";
  return settle(state, kept.do, answers, result, { recorded: index, reason });
}

/** Load a saved scenario and take its start (spec §6.4: Run). */
export function follow(doc, state, id) {
  const scenario = doc.annotations?.scenarios?.[id];
  if (!scenario) return state;
  const loaded = {
    ...IDLE,
    mode: "run",
    canvas: scenario.canvas,
    init: without(scenario.start, "answers"),
    script: { id, recorded: recordingOf(scenario), following: true }
  };
  return replayPoint(doc, loaded, 0);
}

/** Whether a followed scenario has a next step to take. */
export const hasNext = state =>
  Boolean(
    state.script?.following &&
    !state.asking &&
    !state.failure &&
    state.shown === null &&
    state.points.length < state.script.recorded.length
  );

/** Take the followed scenario's next step (spec §6.4: → or Next step). */
export const next = (doc, state) => (hasNext(state) ? replayPoint(doc, state, state.points.length) : state);

/** Follow a scenario up to a step (a Problem's step): every step until that one is taken, or one stops. */
export function followTo(doc, state, id, stepNumber) {
  let current = follow(doc, state, id);
  while (hasNext(current) && current.points.length <= stepNumber) current = next(doc, current);
  return current;
}

/**
 * A scenario presented (simulator spec §7.1): its run with every recorded step it still has to take taken, so the stage
 * can show each one — from the start when it is loaded from its row (`id`), else at the point shown.
 * @param {string | null} id The scenario to load; null for the one the run follows.
 */
export function presented(doc, state, id) {
  const at = id ? 0 : (state.shown ?? state.points.length - 1);
  let current = id ? follow(doc, state, id) : { ...state, shown: null, asking: null, failure: null };
  while (hasNext(current)) current = next(doc, current);
  return show(current, at);
}

/** Stop following the scenario here (spec §6.4: Stop here): the run goes on as the person's own. */
export const stopFollowing = state =>
  state.script ? { ...state, script: { ...state.script, following: false }, failure: null } : state;

/** A point as a scenario records it. */
function recordedOf(point) {
  return {
    do: point.do,
    ...(point.answers.length ? { answers: point.answers } : {}),
    ...(point.caption ? { caption: point.caption } : {}),
    reached: reachedOf(point.session)
  };
}

/** The scenario's `start`: the starting values, and the answers given while starting. */
function startOf(state) {
  const answers = state.points[0]?.answers ?? [];
  return { ...state.init, ...(answers.length ? { answers } : {}) };
}

/**
 * Accept the new path (spec §6.4) at the diverged point `index`: the points up to it as they are now, then the
 * recording's later steps taken again with their answers. A step that can no longer be taken is dropped, with every
 * step after it. When the point itself could not be taken (a failure), it and the later steps are dropped.
 * @returns {{ start: object, steps: object[], dropped: number, points: Point[] }} `start` and `steps` for
 *   `scenario.update`; `points`: the run's points, now the recording's.
 */
export function acceptAt(doc, state, index) {
  const failed = Boolean(state.failure) && index === state.points.length;
  const keptPoints = state.points.slice(0, failed ? index : index + 1);
  const recorded = state.script.recorded;
  const steps = keptPoints.slice(1).map(recordedOf);
  let session = keptPoints.at(-1).session;
  let dropped = 0;
  const from = failed ? index : index + 1;
  for (let at = from; at < recorded.length; at += 1) {
    const kept = recorded[at];
    const result = step(doc, session, { do: kept.do, answers: kept.answers });
    if (result.status !== "done") {
      dropped = recorded.length - at;
      break;
    }
    steps.push({ ...recordedOf({ ...kept, session: result.session }) });
    session = result.session;
  }
  const points = keptPoints.map((point, at) => ({ ...without(point, "reason"), recorded: at, status: "same" }));
  return { start: startOf({ ...state, points: keptPoints }), steps, dropped, points };
}

/** The run after its new path was accepted and stored: the recording is now what was accepted. */
export function accepted(state, { steps, points }) {
  const recorded = [{ do: null, answers: points[0].answers }, ...steps.map(item => ({ answers: [], ...item }))];
  return {
    ...state,
    points,
    shown: null,
    asking: null,
    failure: null,
    script: { ...state.script, recorded }
  };
}

/** Whether the run has steps no scenario holds: Stop then asks to save them (spec §6.1). */
export const hasUnsaved = state => state.points.some((point, index) => index > 0 && point.recorded === undefined);

/**
 * The run as a scenario (spec §4.2), for `scenario.add`.
 * @param {RunState} state
 * @param {{ name: string, description?: string }} about
 */
export function scenarioOf(state, { name, description }) {
  return {
    name,
    ...(description ? { description } : {}),
    canvas: state.canvas,
    start: startOf(state),
    steps: state.points.slice(1).map(recordedOf)
  };
}

/** The run once saved as the scenario `id`: every point is its recording's. */
export function saved(state, id, scenario) {
  return {
    ...state,
    points: state.points.map((point, index) => ({ ...point, recorded: index, status: "same" })),
    script: { id, recorded: recordingOf(scenario), following: false }
  };
}

/**
 * Write a step's caption (spec §6.4). A step of a saved scenario is the scenario's: the steps to store are returned.
 * @returns {{ state: RunState, steps: object[] | null }} `steps`: the scenario's steps with the caption, for
 *   `scenario.update`, or null when the step is not saved yet.
 */
export function captioned(state, index, text) {
  const caption = text.trim();
  const points = state.points.map((point, at) =>
    at !== index ? point
    : caption ? { ...point, caption }
    : without(point, "caption")
  );
  const point = state.points[index];
  if (point.recorded === undefined || !state.script) return { state: { ...state, points }, steps: null };
  const recorded = state.script.recorded.map((item, at) =>
    at !== point.recorded ? item
    : caption ? { ...item, caption }
    : without(item, "caption")
  );
  const steps = recorded
    .slice(1)
    .map(item => ({ ...without(item, "answers"), ...(item.answers.length ? { answers: item.answers } : {}) }));
  return { state: { ...state, points, script: { ...state.script, recorded } }, steps };
}
