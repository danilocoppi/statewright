// statewright/simulate (simulator spec §5): the pure simulation engine. No clock, no randomness, no I/O: the same
// document, session and input always give the same result, and sessions are plain JSON.
import { compareText } from "../rules/facts.js";
import { executableOf } from "./executable.js";
import { DURATION_PATTERN } from "../schema/helpers.js";
import { fireWait, flowSessionOf, receiveFlow, startFlow } from "./flow.js";
import { EngineError } from "./model.js";
import { movesOf } from "./moves.js";
import { instancesOf, locate } from "./places.js";
import { replayOf } from "./replay.js";
import { frameFrom, storyFrom } from "./story.js";
import {
  NeedAnswer,
  createRun,
  drain,
  enterAtEntry,
  fireTimer,
  enterRegion,
  isEntry,
  leavesOf,
  passTime,
  receive,
  sessionOf,
  settle
} from "./run.js";
import { instantOf, parseInstant } from "./time.js";
import { typedView } from "../roles/typed.js";

export { executableOf, instancesOf, locate };

/** ISO 8601 date-time in UTC, as the format writes it (`2026-01-05T09:00:00Z`). */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * @typedef {{ status: "done", session: object, trace: object[] }
 *   | { status: "needs", question: object, trace: object[] }
 *   | { status: "error", code: string, message: string, details?: object, trace: object[] }} Result `details`: where
 *   the run stopped, when the engine knows (`{ path }`, `{ from, to }`, `{ canvas }`, …).
 */

/**
 * @typedef {{ guards?: Record<string, (context: object, input: object | null) => unknown> }} Options `guards`: functions
 *   that decide named guards without an expression, by guard ID (statewright/runtime binds them); a guard nothing
 *   decides is asked about, as in the Simulator.
 */

/** Run `body` on a copy of the session; a question without an answer or an error leaves the session as it was. */
function attempt(doc, session, answers, body, options) {
  const run = createRun(doc, session, answers ?? [], options);
  try {
    body(run);
    if (run.cursor < run.answers.length) {
      // `used`: how many answers the step took, those of actions' flows run within it included.
      throw new EngineError(
        "extraAnswers",
        `${run.answers.length - run.cursor} answer(s) were given that nothing asked for`,
        { used: run.cursor }
      );
    }
    return { status: "done", session: run.kind === "flow" ? flowSessionOf(run) : sessionOf(run), trace: run.trace };
  } catch (error) {
    if (error instanceof NeedAnswer) return { status: "needs", question: error.question, trace: run.trace };
    if (error instanceof EngineError) {
      // Where it stopped (a path, a transition's ends, a canvas), so a person can be shown the element.
      const details = Object.keys(error.details).length ? { details: error.details } : {};
      return { status: "error", code: error.code, message: error.message, ...details, trace: run.trace };
    }
    // The engine never throws for a document's content (spec §5.10): what nothing above foresaw is an error of the run.
    return { status: "error", code: "internal", message: String(error?.message ?? error), trace: run.trace };
  }
}

/** An event or a call, to a machine (with the events it raises) or to a flow. */
function deliver(run, input) {
  if (run.kind === "flow") return receiveFlow(run, input);
  receive(run, input);
  drain(run);
}

/** An error result, for inputs refused before the run starts. */
const refused = (code, message, details) => ({
  status: "error",
  code,
  message,
  ...(details ? { details } : {}),
  trace: []
});

/**
 * Start a run of a top executable canvas (simulator spec §5.2): a machine at each region's `initial`, or one at
 * `entry`; a flow with one token at its `start`, its `input` as `vars.input`.
 * @param {any} doc A schema-valid document.
 * @param {{ canvas: string, at: string, entry?: string, context?: Record<string, object>, input?: unknown,
 *   answers?: Array<{ kind: string, at: string, value: unknown }> }} init
 * @param {Options} [options]
 * @returns {Result}
 */
export function start(doc, { canvas, at, entry, context, input, answers }, options = {}) {
  doc = typedView(doc);
  const top = executableOf(doc, canvas);
  if (top.canvas !== canvas) {
    const where = top.canvas ? `; start from ${doc.canvases[top.canvas].name}, which runs it` : "";
    return refused("notExecutable", `${doc.canvases[canvas]?.name ?? canvas} does not run on its own${where}`);
  }
  if (typeof at !== "string" || !INSTANT.test(at) || Number.isNaN(Date.parse(at))) {
    return refused("badInput", `The run must start at a date and time in UTC, such as 2026-01-05T09:00:00Z`);
  }
  if (top.kind === "flow") {
    if (entry !== undefined) return refused("badInput", "A flow starts at its start node; it has no entries");
    const session = {
      canvas,
      clock: instantOf(new Date(at)),
      active: [],
      tokens: [],
      vars: input !== undefined ? { input } : {},
      context: context ?? {},
      timers: []
    };
    return attempt(doc, session, answers, startFlow, options);
  }
  const session = {
    canvas,
    clock: instantOf(new Date(at)),
    active: [],
    history: {},
    context: context ?? {},
    timers: []
  };
  return attempt(
    doc,
    session,
    answers,
    run => {
      if (entry !== undefined && !isEntry(run, entry)) {
        throw new EngineError("badInput", `${entry} is not an entry of ${doc.canvases[canvas].name}`);
      }
      for (const region of run.model.regions(canvas)) {
        if (entry !== undefined && run.model.regionOf(canvas, entry) === region.key) enterAtEntry(run, entry);
        else enterRegion(run, "", canvas, region.key, null);
      }
      settle(run);
      drain(run);
    },
    options
  );
}

/**
 * Take one step: an event, a call, or time passing (simulator spec §5.2). Questions the step asks are answered by
 * `answers`, in order; a question with no answer yet stops the step (`needs`) with the session unchanged.
 * @param {any} doc
 * @param {object} session
 * @param {{ do: { event?: string, call?: string, payload?: unknown, wait?: string }, answers?: object[] }} input
 * @param {Options} [options]
 * @returns {Result}
 */
export function step(doc, session, { do: action, answers } = {}, options = {}) {
  doc = typedView(doc);
  const keys = action && typeof action === "object" ? Object.keys(action).filter(key => key !== "payload") : [];
  if (keys.length !== 1) return refused("badInput", "A step is one event, one call or a wait");
  if (action.event !== undefined) {
    const event = doc.catalog.events[action.event];
    if (!event) return refused("dangling", `There is no event ${action.event}`);
    const input = { kind: "event", event: action.event, name: event.name, label: event.name };
    return attempt(doc, session, answers, run => deliver(run, { ...input, payload: action.payload ?? null }), options);
  }
  if (action.call !== undefined) {
    const endpoint = doc.catalog.endpoints[action.call];
    const webhook = doc.catalog.webhooks[action.call];
    if (!endpoint && !webhook) return refused("dangling", `There is no endpoint or webhook ${action.call}`);
    // An incoming webhook that declares the event it delivers delivers that event too (simulator spec §5.8).
    const delivered = webhook?.direction === "in" ? webhook.event : undefined;
    const label = endpoint ? `${endpoint.method} ${endpoint.path}` : webhook.name;
    const input = { kind: "call", call: action.call, label, payload: action.payload ?? null };
    if (delivered !== undefined) {
      Object.assign(input, { event: delivered, name: doc.catalog.events[delivered]?.name ?? delivered });
    }
    return attempt(doc, session, answers, run => deliver(run, input), options);
  }
  if (action.wait === undefined) return refused("badInput", "A step is one event, one call or a wait");
  if (action.wait !== "next" && !DURATION_PATTERN.test(action.wait)) {
    return refused("badInput", "Time passes by an ISO 8601 duration, such as PT2H, or until the next timer");
  }
  return attempt(
    doc,
    session,
    answers,
    run => passTime(run, action.wait, run.kind === "flow" ? fireWait : undefined),
    options
  );
}

/**
 * Fire a timer of a machine now, as a system that schedules its own timers does (source-of-truth spec §7): every
 * `after` transition armed for `timer` (a timer's ID) and due at the session's clock or before, in due order, as time
 * passing fires them — a timer that drives several guarded transitions takes the one whose guard holds. The clock does
 * not move.
 * @param {any} doc
 * @param {object} session
 * @param {{ timer: string, answers?: object[] }} input
 * @param {Options} [options]
 * @returns {Result} An error `notArmed` when no state active now arms it, `notDue` (with `details.due`) when it is
 *   not due yet.
 */
export function fire(doc, session, { timer, answers } = {}, options = {}) {
  doc = typedView(doc);
  if (doc.canvases[session.canvas]?.kind !== "machine") return refused("badInput", "Only a machine's timers are fired");
  const name = doc.catalog.timers[timer]?.name ?? timer;
  const armedFor = item => item.kind === "after" && item.timer === timer;
  // Armed timers are kept in due order: the first is the earliest.
  const first = session.timers.find(armedFor);
  if (!first) return refused("notArmed", `${name} is not armed by the states active now`);
  if (parseInstant(first.due) > parseInstant(session.clock)) {
    return refused("notDue", `${name} is due at ${first.due}`, { due: first.due });
  }
  return attempt(
    doc,
    session,
    answers,
    run => {
      const due = item => armedFor(item) && parseInstant(item.due) <= parseInstant(run.state.clock);
      for (let index = run.state.timers.findIndex(due); index >= 0; index = run.state.timers.findIndex(due)) {
        const [armed] = run.state.timers.splice(index, 1);
        fireTimer(run, armed);
      }
    },
    options
  );
}

/**
 * What a session has reached, as a scenario records it (simulator spec §4.2): the active leaf states, sorted, and
 * how the run ended, if it did.
 * @param {object} session
 * @returns {{ active: string[], ended?: string }}
 */
export function reachedOf(session) {
  const active = leavesOf(session.active).sort(compareText);
  return session.ended ? { active, ended: session.ended } : { active };
}

/**
 * What can happen now (simulator spec §5.2): each event, call and timer that would take a transition from the active
 * states, with where it leads — the states it enters, a question it asks, or an error.
 * @param {any} doc
 * @param {object} session
 * @param {Options} [options]
 */
export function moves(doc, session, options = {}) {
  doc = typedView(doc);
  return movesOf(doc, session, (target, current, input) => step(target, current, input, options));
}

/**
 * Run a scenario again (simulator spec §4.6): each step compared with its recording — `same`, `diverged` (with why)
 * or `skipped` after a step that could not be taken; `first` is the first diverging step (0: the start).
 * @param {any} doc
 * @param {object} scenario
 */
export function replay(doc, scenario) {
  doc = typedView(doc);
  return replayOf(doc, scenario, { start, step, reachedOf });
}

/**
 * One frame of a story, as the stage shows it (simulator spec §7.1): a point of a run — `step` 0 for the start, with
 * its input, answers, caption, session and trace — with the edges it took, in order, the level where it is best seen
 * (the level of the last edge its input took, else the frame before's; the start on the top level), the levels down to
 * it, where the run is and the clock.
 * @param {any} doc
 * @param {string} top The run's top executable canvas.
 * @param {{ step: number, do: object | null, answers?: object[], caption?: string, session: object,
 *   trace: object[] }} point
 * @param {string | null} previous The level of the frame before; null for the start.
 */
export function frameOf(doc, top, point, previous) {
  doc = typedView(doc);
  return frameFrom(doc, top, point, previous, reachedOf);
}

/**
 * Tell a scenario as the stage and the scenario page do (simulator spec §7): its start, then each recorded step taken
 * again with its recorded answers, each as a frame (`frameOf`), up to the first step the design no longer takes.
 * @param {any} doc
 * @param {object} scenario
 * @returns {{ canvas: string, frames: object[], stopped: null | { step: number, question?: object, code?: string,
 *   message?: string } }}
 */
export function storyOf(doc, scenario) {
  doc = typedView(doc);
  return storyFrom(doc, scenario, { start, step, reachedOf });
}
