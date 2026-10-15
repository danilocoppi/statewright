// One machine of a design, run by a system (source-of-truth spec §7): start a record, say what can happen, send it an
// event, a call or a timer. Every answer is plain JSON; refusals say why and leave the snapshot as it was.
import { evaluate, truthy } from "../logic/index.js";
import { createModel, lastOf, parentOf } from "../simulate/model.js";
import { globMatches } from "../simulate/run.js";
import { fire, moves as movesOf, start as begin, step } from "../simulate/index.js";
import { namePath } from "../contract/vectors.js";
import { effectsOf } from "./effects.js";
import { callId, entryId, idByName, pathExists, stateOf } from "./names.js";

/** ISO 8601 date-time in UTC, as the format writes it. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const isInstant = at => typeof at === "string" && INSTANT.test(at) && !Number.isNaN(Date.parse(at));

/** A refusal: why, and the snapshot as it was. */
const refusal = (snapshot, reason, message, details = {}) => ({ refused: { reason, message, ...details }, snapshot });

/**
 * A machine of the runtime.
 * @param {any} doc
 * @param {string} canvasId The machine's level, one that runs on its own.
 * @param {{ content: string, guards: Record<string, Function> }} bound The design's content hash, and the guard
 *   functions by guard ID.
 */
export function machineOf(doc, canvasId, { content, guards }) {
  const canvas = doc.canvases[canvasId];
  const model = createModel(doc, canvasId);
  const options = { guards };
  const stamp = session => ({ design: content, machine: canvasId, session });
  const done = (session, trace) => ({
    snapshot: stamp(session),
    state: stateOf(doc, session),
    effects: effectsOf(doc, canvasId, trace)
  });

  /** Why an engine result is a refusal. */
  function refusedBy(snapshot, result) {
    if (result.status === "needs") {
      return refusal(snapshot, "needs", "The design asks a question no bound guard answers", {
        question: result.question
      });
    }
    if (result.code === "badInput") return refusal(snapshot, "badInput", result.message);
    return refusal(snapshot, "error", result.message, { code: result.code, ...(result.details ?? {}) });
  }

  /** The snapshot's session, or why it cannot be one of this machine's now. */
  function sessionOf(snapshot) {
    const session = snapshot?.session;
    if (snapshot?.machine !== canvasId || session?.canvas !== canvasId) {
      return refusal(snapshot, "unknownState", `This snapshot is not one of ${canvas.name}'s`);
    }
    const lost = session.active.filter(path => !pathExists(doc, canvasId, path));
    if (lost.length) {
      return refusal(
        snapshot,
        "unknownState",
        `The design no longer has the state ${lost.join(", ")}: migrate the record`,
        {
          states: lost
        }
      );
    }
    // A state that gained an inner level, or a level that gained a region, holds no state the record ever entered.
    const entered = (owner, interior, region) =>
      session.active.some(path => parentOf(path) === owner && model.regionOf(interior, lastOf(path)) === region.key);
    const deeper = session.active.filter(path => {
      const interior = model.interiorOf(model.nodeAt(path));
      return interior && model.regions(interior).some(region => !entered(path, interior, region));
    });
    if (deeper.length || model.regions(canvasId).some(region => !entered("", canvasId, region))) {
      const what = deeper.length ? deeper.map(path => namePath(doc, canvasId, path)).join(", ") : canvas.name;
      return refusal(
        snapshot,
        "unknownState",
        `${what} now has ${deeper.length ? "an inner level" : "a region"} the record never entered: migrate the record`,
        { states: deeper }
      );
    }
    return { session };
  }

  /**
   * Whether an entry's guard lets a record start there: true or false, or null when nothing decides it (a condition
   * only in words). A bound function sees the context it would start with.
   */
  function entryHolds(condition, context) {
    const expr = condition.expr ?? (condition.guard ? doc.catalog.guards[condition.guard]?.expr : undefined);
    if (expr !== undefined) return truthy(evaluate(expr, { event: null, context, vars: {} }));
    const decide = condition.guard ? guards[condition.guard] : undefined;
    if (!decide) return null;
    const verdict = decide(structuredClone(context), null);
    if (typeof verdict?.then === "function") throw new Error("it returned a promise, and guards are synchronous");
    return truthy(verdict);
  }

  /** The transitions that would respond to an input, from the states active now: none means nothing takes it. */
  function responders(session, input) {
    return session.active.flatMap(path =>
      model.leaving(path).filter(([, edge]) => {
        if (input.event)
          return edge.on?.includes(input.event) || edge.onMatch?.some(glob => globMatches(glob, input.name));
        if (input.call) return edge.via === input.call;
        return edge.after === input.timer;
      })
    );
  }

  /** The engine's input for a trigger by name, or why the design does not know it. */
  function triggerOf(input) {
    const given = ["event", "call", "timer"].filter(key => input?.[key] !== undefined);
    if (given.length !== 1) return { error: ["badInput", "Send one event, one call or one timer"] };
    if (input.event !== undefined) {
      const event = idByName(doc, "events", input.event);
      return event ?
          { event, name: input.event }
        : { error: ["noTransition", `The design has no event ${input.event}`] };
    }
    if (input.call !== undefined) {
      const call = callId(doc, input.call);
      return call ? { call } : { error: ["noTransition", `The design has no endpoint or webhook ${input.call}`] };
    }
    const timer = idByName(doc, "timers", input.timer);
    return timer ? { timer } : { error: ["noTransition", `The design has no timer ${input.timer}`] };
  }

  /**
   * Start a record (source-of-truth spec §7): at the machine's initial state, or at a named entry (`POST /bookings`).
   * @param {{ entry?: string, at: string, context?: object }} init
   */
  function start({ entry, at, context } = {}) {
    let entryNode;
    if (entry !== undefined) {
      entryNode = entryId(doc, canvasId, entry);
      if (!entryNode) return refusal(undefined, "noEntry", `${canvas.name} has no entry ${entry}`);
      const condition = canvas.nodes[entryNode].guard;
      if (condition) {
        let holds;
        try {
          holds = entryHolds(condition, context ?? {});
        } catch (error) {
          return refusal(undefined, "error", `The guard of ${entry} failed: ${error?.message ?? error}`, {
            code: "guard"
          });
        }
        if (holds === null) {
          const guard = condition.guard ? { name: doc.catalog.guards[condition.guard]?.name } : {};
          const question = {
            kind: "entry",
            at: entryNode,
            entry,
            guard: { ...guard, ...(condition.text ? { text: condition.text } : {}) }
          };
          return refusal(undefined, "needs", "The design asks a question no bound guard answers", { question });
        }
        if (!holds) return refusal(undefined, "guard", `The entry ${entry} is guarded, and its guard does not hold`);
      }
    }
    const result = begin(
      doc,
      { canvas: canvasId, at, entry: entryNode, context: { [canvasId]: context ?? {} } },
      options
    );
    return result.status === "done" ? done(result.session, result.trace) : refusedBy(undefined, result);
  }

  /**
   * Send an event, a call or a timer at an instant (source-of-truth spec §7). Never throws for the design's sake.
   * @param {object} snapshot
   * @param {{ event?: string, call?: string, timer?: string, payload?: unknown, at: string }} input
   */
  function send(snapshot, input) {
    const found = sessionOf(snapshot);
    if (found.refused) return found;
    if (!isInstant(input?.at))
      return refusal(snapshot, "badInput", "Send it at a date and time in UTC, such as 2026-01-09T19:00:00Z");
    // Time never goes back: an earlier instant is taken as the snapshot's own.
    const clock = Date.parse(input.at) > Date.parse(found.session.clock) ? input.at : found.session.clock;
    const session = { ...found.session, clock };
    if (session.ended || session.active.every(path => model.leaving(path).length === 0)) {
      return refusal(snapshot, "final", `${stateOf(doc, session)} is final: nothing leaves it`);
    }
    const trigger = triggerOf(input);
    if (trigger.error) return refusal(snapshot, ...trigger.error);
    const result =
      trigger.timer ?
        fire(doc, session, { timer: trigger.timer }, options)
      : step(
          doc,
          session,
          { do: { ...(trigger.event ? { event: trigger.event } : { call: trigger.call }), payload: input.payload } },
          options
        );
    if (result.code === "notArmed") return refusal(snapshot, "noTransition", result.message);
    if (result.code === "notDue") return refusal(snapshot, "notDue", result.message, { due: result.details.due });
    if (result.status !== "done") return refusedBy(snapshot, result);
    // A timer that fell due and took nothing is spent, as time passing spends it in the Simulator.
    if (!result.trace.some(entry => entry.type === "transition") && !trigger.timer) {
      const what = input.event ?? input.call;
      if (responders(session, trigger).length) {
        return refusal(
          snapshot,
          "guard",
          `Every transition ${what} takes from ${stateOf(doc, session)} is guarded, and no guard holds`
        );
      }
      return refusal(snapshot, "noTransition", `Nothing in the design takes ${what} from ${stateOf(doc, session)}`);
    }
    return done(result.session, result.trace);
  }

  /**
   * Could this be sent now? `{ ok: true }`, or `{ ok: false, reason, message }` as `send` would refuse it.
   * @param {object} snapshot
   * @param {{ event?: string, call?: string, timer?: string, payload?: unknown, at?: string }} input
   */
  function can(snapshot, input) {
    const result = send(snapshot, { at: snapshot?.session?.clock, ...input });
    return result.refused ? { ok: false, ...result.refused } : { ok: true };
  }

  /**
   * What can happen next: the events, calls and timers a transition of the active states takes, with where each leads
   * (`to`), or the question it asks (`needs`). Timers carry when they are due.
   * @param {object} snapshot
   */
  function moves(snapshot) {
    const found = sessionOf(snapshot);
    if (found.refused) return [];
    return movesOf(doc, found.session, options).map(move => {
      const label =
        move.kind === "event" ? { event: move.label }
        : move.kind === "call" ? { call: move.label }
        : { timer: move.label, due: move.due };
      if (move.outcome.asks) return { ...label, needs: move.outcome.asks };
      if (move.outcome.error) return { ...label, error: move.outcome.error };
      return { ...label, to: move.outcome.to.map(path => namePath(doc, canvasId, path)) };
    });
  }

  return { id: canvasId, name: canvas.name, subject: canvas.subject, start, send, can, moves };
}
