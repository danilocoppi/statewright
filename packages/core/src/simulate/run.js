// A run of a machine or a flow (Core spec §16, simulator spec §5): one step at a time, each run to completion. A run
// works on a copy of the session and either finishes the step, stops at a question it has no answer for, or stops with
// an error; a step is never half applied. The machine's steps are here; a flow's are in flow.js.
import { evaluate, truthy } from "../logic/index.js";
import { compareText, triggersOf } from "../rules/facts.js";
import { EngineError, childPath, createModel, lastOf, parentOf, within } from "./model.js";
import { addDuration, instantOf, parseInstant } from "./time.js";
import { embeddedFlowOf, runEmbedded } from "./embedded.js";

/** Thrown to stop a step at a question the caller has not answered yet. */
export class NeedAnswer {
  constructor(question) {
    this.question = question;
  }
}

/** Transitions one step may take before the machine is said never to settle (spec §16.12). */
export const LIVELOCK = 100;

/** Timers one wait may fire before the clock stops (simulator spec §5.6). */
export const TIMER_FLOOD = 1000;

/** A segment-wise glob over event names: `*` stands for exactly one segment (`leg.*` matches `leg.halted`). */
export function globMatches(pattern, name) {
  const want = pattern.split(".");
  const have = name.split(".");
  return want.length === have.length && want.every((segment, index) => segment === "*" || segment === have[index]);
}

const copy = value => (value === undefined ? undefined : structuredClone(value));

/** Write `value` at a dotted path of `target`, through its own values only, making objects on the way. */
function writeAt(target, path, value) {
  const keys = path.split(".");
  let here = target;
  for (const key of keys.slice(0, -1)) {
    if (!Object.hasOwn(here, key) || here[key] === null || typeof here[key] !== "object") here[key] = {};
    here = here[key];
  }
  here[keys.at(-1)] = value;
}

/**
 * Write an assignment's value at its target (`context.a.b`, `vars.a.b`) inside `holder`; false, with a warning, when
 * it cannot be written.
 */
export function writeTarget(run, holder, target, value) {
  // A name the schema allows, but one that would write into every object there is.
  if (target.split(".").includes("__proto__")) {
    const where = target.startsWith("vars.") ? "the variables" : "a context";
    warn(run, "unevaluated", `${target} is not assigned: ${where} cannot hold __proto__`, { target });
    return false;
  }
  try {
    writeAt(holder, target.slice(target.indexOf(".") + 1), value);
    return true;
  } catch (error) {
    // A value the target cannot hold where it points (an array's length, say).
    warn(run, "unevaluated", `${target} is not assigned: ${error.message}`, { target });
    return false;
  }
}

/** Leaf paths of a configuration: active states with no active state inside them. */
export function leavesOf(active) {
  const all = [...active];
  return all.filter(path => !all.some(other => other !== path && within(other, path))).sort(compareText);
}

/**
 * A run of one step over a copy of `session`.
 * @param {any} doc
 * @param {object} session
 * @param {Array<{ kind: string, at: string, value: unknown }>} [answers]
 * @param {{ guards?: Record<string, (context: object, input: object | null) => unknown> }} [options] `guards`:
 *   functions that decide named guards without an expression, by guard ID.
 */
export function createRun(doc, session, answers = [], { guards = {} } = {}) {
  return {
    doc,
    guards,
    kind: doc.canvases[session.canvas]?.kind,
    model: createModel(doc, session.canvas),
    answers,
    cursor: 0,
    fired: 0,
    visits: 0,
    event: null,
    queue: [],
    ready: [],
    trace: [],
    state: {
      canvas: session.canvas,
      clock: session.clock,
      active: new Set(session.active),
      history: copy(session.history ?? {}),
      context: copy(session.context ?? {}),
      timers: copy(session.timers ?? []),
      tokens: copy(session.tokens ?? []),
      vars: copy(session.vars ?? {}),
      outcome: session.outcome ?? null
    }
  };
}

/** The session a finished run leaves: plain JSON, keys in a fixed order. */
export function sessionOf(run) {
  const { canvas, clock, active, history, context, timers } = run.state;
  // A machine ends when every region of its top canvas is complete (spec §16.9).
  const ended = run.model.regions(canvas).every(region => regionComplete(run, "", canvas, region.key)) ? "done" : null;
  const sortKeys = object =>
    Object.fromEntries(
      Object.keys(object)
        .sort(compareText)
        .map(key => [key, object[key]])
    );
  return {
    canvas,
    clock,
    active: [...active].sort(compareText),
    history: sortKeys(history),
    context: sortKeys(context),
    timers,
    ...(ended ? { ended } : {})
  };
}

/** Record a warning in the trace. */
export function warn(run, code, message, details = {}) {
  run.trace.push({ type: "warning", code, message, ...details });
}

/** The answer to a question: the next one given, checked, or a stop until the caller gives it. */
export function ask(run, question) {
  if (run.cursor >= run.answers.length) throw new NeedAnswer(question);
  const answer = run.answers[run.cursor++];
  if (answer.kind !== question.kind || answer.at !== question.at) {
    throw new EngineError("badAnswer", `An answer was given for another question (${answer.kind} at ${answer.at})`, {
      question,
      answer
    });
  }
  // A count is any whole number (simulator spec §5.4); every other question offers its answers.
  const offered =
    question.kind === "count" ?
      Number.isInteger(answer.value) && answer.value >= 0
    : question.candidates.some(candidate => candidate.value === answer.value);
  if (!offered) {
    throw new EngineError("badAnswer", `${JSON.stringify(answer.value)} is not one of this question's answers`, {
      question,
      answer
    });
  }
  run.trace.push({ type: "answered", kind: question.kind, at: question.at, value: answer.value });
  return answer.value;
}

/** The key of the machine instance a state belongs to: its owner's path, or the top canvas (spec §4.3). */
export const instanceOf = (run, path) => parentOf(path) || run.model.top;

/** A machine instance's context, made on first use (a key given at the start already holds its values). */
export function contextOf(run, key) {
  if (!Object.hasOwn(run.state.context, key)) run.state.context[key] = {};
  return run.state.context[key];
}

/** What an expression sees (spec §16.10): the event, the instance's context, and the flow's variables. */
export function dataFor(run, key, event) {
  return {
    event: event ? { name: event.name, payload: event.payload ?? null } : null,
    context: contextOf(run, key),
    vars: run.state.vars
  };
}

/**
 * Whether a condition holds: true or false when it can be evaluated, null when it cannot — no expression (only a
 * guard's name, a text) or one that fails (spec §5.7: the person is asked instead).
 */
export function judge(run, condition, key, event) {
  if (!condition) return true;
  const expr = condition.expr !== undefined ? condition.expr : run.doc.catalog.guards[condition.guard]?.expr;
  if (expr === undefined) return bound(run, condition, key, event);
  try {
    return truthy(evaluate(expr, dataFor(run, key, event)));
  } catch (error) {
    warn(run, "unevaluated", `${error.message}; the person is asked instead`, { expr });
    return null;
  }
}

/**
 * A named guard without an expression, decided by the function the caller bound to it (the runtime's `guards`): it
 * sees a copy of the instance's context and the input; null — a question — when nothing is bound.
 */
function bound(run, condition, key, event) {
  const decide = condition.guard ? run.guards[condition.guard] : undefined;
  if (typeof decide !== "function") return null;
  const name = run.doc.catalog.guards[condition.guard]?.name ?? condition.guard;
  try {
    const verdict = decide(
      copy(contextOf(run, key)),
      event ? { name: event.name, payload: event.payload ?? null } : null
    );
    if (typeof verdict?.then === "function") throw new Error("it returned a promise, and guards are synchronous");
    return truthy(verdict);
  } catch (error) {
    throw new EngineError("guard", `The guard ${name} failed: ${error?.message ?? error}`, { guard: condition.guard });
  }
}

/** An edge's name as the figure labels it, for a question's answers (simulator spec §5.4). */
export const named = edge => {
  const name = edge.name ?? edge.label;
  return name ? { name } : {};
};

/** What a question shows about a condition: the guard's name and description, the plain text. */
export function guardInfo(run, condition) {
  if (!condition) return null;
  const guard = condition.guard ? run.doc.catalog.guards[condition.guard] : undefined;
  const info = {};
  if (guard) info.name = guard.name;
  if (condition.text) info.text = condition.text;
  if (guard?.description) info.description = guard.description;
  return info;
}

/** An expression's value for an effect, or null (with a warning) when it cannot be evaluated. */
export function valueOf(run, expr, key, event) {
  try {
    const value = evaluate(expr, dataFor(run, key, event));
    return value === undefined ? null : copy(value);
  } catch (error) {
    warn(run, "unevaluated", error.message, { expr });
    return undefined;
  }
}

/** Run effects (spec §16.10): actions are logged, emitted events queued, assignments written to the context. */
export function runEffects(run, effects, key, event, at) {
  const evaluated = map =>
    Object.fromEntries(Object.entries(map).map(([name, expr]) => [name, valueOf(run, expr, key, event) ?? null]));
  for (const effect of effects ?? []) {
    if (effect.action) {
      const entry = { type: "action", action: effect.action, args: evaluated(effect.args ?? {}), at };
      run.trace.push(entry);
      runEmbedded(run, effect.action, entry, key, event);
    } else if (effect.emit) {
      const payload = effect.payload === undefined ? null : evaluated(effect.payload);
      run.queue.push({ event: effect.emit, payload });
      run.trace.push({ type: "emitted", event: effect.emit, payload, at });
    } else {
      for (const [target, expr] of Object.entries(effect.assign)) {
        const value = valueOf(run, expr, key, event);
        if (value === undefined || !writeTarget(run, contextOf(run, key), target, value)) continue;
        run.trace.push({ type: "assigned", instance: key, path: target, value });
      }
    }
  }
}

/** How messages name a region: its own name on a canvas with regions, the canvas's name otherwise. */
function regionName(run, canvasId, key) {
  const canvas = run.doc.canvases[canvasId];
  return key ? `region ${canvas.regions?.[key]?.name ?? key} of ${canvas.name}` : canvas.name;
}

/** A transition stays in its region (spec §16.1): one that crosses into another would leave two states active there. */
function staysInRegion(run, from, to) {
  const canvasId = run.model.canvasAt(from);
  const here = run.model.regionOf(canvasId, lastOf(from));
  const there = run.model.regionOf(canvasId, lastOf(to));
  if (here === there) return;
  const message = `A transition cannot cross from ${regionName(run, canvasId, here)} to ${regionName(run, canvasId, there)}`;
  throw new EngineError("badTarget", message, { from, to });
}

/** Follow the one transition out of an `initial`, an `entry` or a `history` with nothing to restore (spec §16.2). */
function followOnly(run, owner, canvasId, nodeId, event) {
  const leaving = run.model.out(canvasId, nodeId);
  const node = run.doc.canvases[canvasId].nodes[nodeId];
  if (leaving.length !== 1 || triggersOf(leaving[0][1]).length) {
    const what = node.name ? `The ${node.kind} ${node.name}` : `The ${node.kind}`;
    const where = regionName(run, canvasId, run.model.regionOf(canvasId, nodeId));
    throw new EngineError("badInitial", `${what} of ${where} needs exactly one transition without a trigger`, {
      node: nodeId
    });
  }
  const [edgeId, edge] = leaving[0];
  const from = childPath(owner, nodeId);
  const to = childPath(owner, edge.to);
  staysInRegion(run, from, to);
  run.trace.push({ type: "transition", edge: edgeId, from, to });
  runEffects(run, edge.actions, owner || run.model.top, event, from);
  enter(run, to, event);
}

/** Enter a region of a machine at its `initial`, or at its only entry when it has none (spec §16.2, §16.6). */
export function enterRegion(run, owner, canvasId, key, event) {
  const nodes = run.model.nodesIn(canvasId, key);
  const initials = nodes.filter(([, node]) => node.kind === "initial");
  if (initials.length === 0) {
    // A region that starts only through entries starts at its one entry; with several, one must be chosen.
    const entries = nodes.filter(([, node]) => node.kind === "entry");
    if (entries.length === 1) return followOnly(run, owner, canvasId, entries[0][0], event);
    const choose = entries.length ? "; choose one of its entries to start from" : "";
    throw new EngineError("noStart", `${regionName(run, canvasId, key)} has no initial node${choose}`, {
      canvas: canvasId
    });
  }
  if (initials.length > 1) {
    throw new EngineError("badInitial", `${regionName(run, canvasId, key)} has ${initials.length} initial nodes`, {
      canvas: canvasId
    });
  }
  followOnly(run, owner, canvasId, initials[0][0], event);
}

/** Start a run at an `entry` of the top canvas instead of its region's `initial`. */
export function enterAtEntry(run, entryId) {
  followOnly(run, "", run.model.top, entryId, null);
}

/**
 * Enter a state, outermost first: it becomes active, its onEntry runs, then its interior's regions (spec §16.6) — at
 * their initials, or, restoring a deep history, at the states `recorded` holds.
 */
function enterState(run, path, event, recorded) {
  const node = run.model.nodeAt(path);
  run.state.active.add(path);
  run.trace.push({ type: "entered", state: path });
  runEffects(run, node.onEntry, instanceOf(run, path), event, path);
  armTimers(run, path);
  const interior = run.model.interiorOf(node);
  if (!interior) return;
  for (const region of run.model.regions(interior)) {
    const kept =
      recorded && [...recorded].find(other => parentOf(other) === path && inRegion(run, interior, other, region.key));
    if (kept) enterState(run, kept, event, recorded);
    else enterRegion(run, path, interior, region.key, event);
  }
}

/** Is the state at `path` in this region of its canvas? */
const inRegion = (run, canvasId, path, key) => run.model.regionOf(canvasId, lastOf(path)) === key;

/** Count a transition taken in this step: past LIVELOCK, the machine never settles (spec §16.12). */
function count(run) {
  if (++run.fired > LIVELOCK) {
    throw new EngineError("livelock", `More than ${LIVELOCK} transitions in one step: the machine never settles`);
  }
}

/**
 * A choice decides when it is reached (spec §16.7): the first branch, in ID order, whose guard holds; the `else` branch
 * when none does. A guard that cannot be evaluated asks which branch is taken (simulator spec §5.4), offering the
 * branches that may still decide — up to the first that holds for sure — and the `else` only when none does. Each
 * branch taken counts as a transition, so choices that lead back to themselves stop as a livelock.
 */
function enterChoice(run, path, event) {
  count(run);
  const canvasId = run.model.canvasAt(path);
  const owner = parentOf(path);
  const key = instanceOf(run, path);
  const leaving = run.model.out(canvasId, lastOf(path));
  const fallback = leaving.find(([, edge]) => edge.else);
  const branches = leaving.filter(([, edge]) => !edge.else);
  let taken = null;
  for (const [index, branch] of branches.entries()) {
    const verdict = judge(run, branch[1].guard, key, event);
    if (verdict === true) {
      taken = branch;
      break;
    }
    if (verdict === null) {
      const rest = [];
      let decided = false;
      for (const later of branches.slice(index + 1)) {
        const holds = judge(run, later[1].guard, key, event);
        if (holds === false) continue;
        rest.push(later);
        if (holds === true) {
          decided = true;
          break;
        }
      }
      const options = [branch, ...rest, ...(fallback && !decided ? [fallback] : [])];
      const chosen = ask(run, {
        kind: "choice",
        at: path,
        choice: run.model.nameAt(path),
        candidates: options.map(([edgeId, edge]) => ({
          value: edgeId,
          to: run.model.nameAt(childPath(owner, edge.to)),
          guard: edge.else ? null : guardInfo(run, edge.guard),
          ...(edge.else ? { else: true } : {}),
          ...named(edge)
        }))
      });
      taken = options.find(([edgeId]) => edgeId === chosen);
      break;
    }
  }
  taken ??= fallback;
  if (!taken) {
    throw new EngineError("stuck", `No branch of ${run.model.nameAt(path)} holds, and it has no else`, { path });
  }
  const [edgeId, edge] = taken;
  const to = childPath(owner, edge.to);
  staysInRegion(run, path, to);
  run.trace.push({ type: "transition", edge: edgeId, from: path, to });
  runEffects(run, edge.actions, key, event, path);
  enter(run, to, event);
}

/**
 * A history node restores what was active in its region when the state around it was last left — the direct child
 * (shallow) or everything inside it (deep) — or follows its own transition when there is nothing to restore (spec
 * §16.6). At the top of a run there is no state around it, so it always follows its transition.
 */
function enterHistory(run, path, event) {
  const owner = parentOf(path);
  const canvasId = run.model.canvasAt(path);
  const memory = owner ? run.state.history[owner]?.[run.model.regionOf(canvasId, lastOf(path))] : undefined;
  if (!memory) {
    // Its own transition counts, so a history that leads back to itself stops as a livelock.
    count(run);
    return followOnly(run, owner, canvasId, lastOf(path), event);
  }
  const deep = run.model.nodeAt(path).depth === "deep";
  run.trace.push({ type: "restored", history: path, state: memory.state, ...(deep ? { deep: true } : {}) });
  return enterState(run, memory.state, event, deep ? new Set(memory.inside) : undefined);
}

/** Enter the node a transition ends at. */
export function enter(run, path, event) {
  const node = run.model.nodeAt(path);
  if (node.kind === "state") return enterState(run, path, event);
  if (node.kind === "choice") return enterChoice(run, path, event);
  if (node.kind === "history") return enterHistory(run, path, event);
  throw new EngineError("badTarget", `A transition cannot end at the ${node.kind} node ${run.model.nameAt(path)}`, {
    path
  });
}

/**
 * Remember, for each state being left whose interior has a history node, what is active in that region (spec
 * §16.6): the direct child, and everything inside it.
 */
function remember(run, leaving) {
  for (const path of leaving) {
    const interior = run.model.interiorOf(run.model.nodeAt(path));
    if (!interior) continue;
    for (const region of run.model.regions(interior)) {
      if (!run.model.nodesIn(interior, region.key).some(([, node]) => node.kind === "history")) continue;
      const child = [...run.state.active].find(
        other => parentOf(other) === path && inRegion(run, interior, other, region.key)
      );
      if (!child) continue;
      const inside = [...run.state.active].filter(other => within(other, child)).sort(compareText);
      run.state.history[path] = { ...run.state.history[path], [region.key]: { state: child, inside } };
    }
  }
}

/** Leave one state: its onExit runs, then it is no longer active. */
function exitState(run, path, event) {
  const node = run.model.nodeAt(path);
  run.trace.push({ type: "exited", state: path });
  runEffects(run, node.onExit, instanceOf(run, path), event, path);
  run.state.active.delete(path);
  cancelTimers(run, path);
}

/** Read a dotted path of a value (`expiresAt`, `deadline.at`). */
function readAt(value, path) {
  return path
    .split(".")
    .reduce((here, key) => (here === null || typeof here !== "object" ? undefined : here[key]), value);
}

/**
 * When a timer armed now is due (spec §16.8): its duration from now, or the deadline its `at` reads from the context,
 * moved by its `offset`; null, with a warning, when it cannot be told.
 */
function dueOf(run, timer, key) {
  const now = parseInstant(run.state.clock);
  const calendar = timer.calendar ?? "calendar";
  const outside = () => {
    warn(run, "unevaluated", `${timer.name} is not armed: it would fall due past the year 9999`, { timer: timer.name });
    return null;
  };
  if (timer.duration !== undefined) {
    const due = addDuration(now, timer.duration, calendar);
    return due ? { due } : outside();
  }
  if (timer.at !== undefined) {
    const deadline = parseInstant(readAt(contextOf(run, key), timer.at.replace(/^context\./, "")));
    if (deadline) {
      const due = timer.offset ? addDuration(deadline, timer.offset, calendar) : deadline;
      return due ? { due, deadline } : outside();
    }
    warn(run, "unevaluated", `${timer.name} is not armed: ${timer.at} holds no date`, { timer: timer.name });
    return null;
  }
  warn(run, "unevaluated", `${timer.name} is not armed: it has neither a duration nor a deadline`, {
    timer: timer.name
  });
  return null;
}

/** The order of armed timers: by when they are due, then by what they belong to. */
const timerKey = armed =>
  `${armed.due}|${armed.state ?? armed.path}|${armed.kind}|${armed.edge ?? armed.timer}|${armed.reminder ?? ""}`;

/**
 * Arm one timer, and its reminders still to come. `armed` says what it belongs to: a state (`state`, with the edge
 * it fires) or a flow's waiting token (`path`, `token`); its reminders belong to the same.
 */
export function armTimer(run, armed, key) {
  const timer = run.doc.catalog.timers[armed.timer];
  if (!timer) throw new EngineError("dangling", `There is no timer ${armed.timer}`, { timer: armed.timer });
  const when = dueOf(run, timer, key);
  if (!when) return;
  const entry = { ...armed, due: instantOf(when.due) };
  run.state.timers.push(entry);
  run.trace.push({ type: "timerArmed", ...entry });
  const now = parseInstant(run.state.clock);
  for (const reminder of when.deadline ? (timer.reminders ?? []) : []) {
    const due = addDuration(when.deadline, reminder, timer.calendar ?? "calendar");
    if (due && due > now)
      run.state.timers.push({
        kind: "reminder",
        ...(armed.state !== undefined ? { state: armed.state } : { path: armed.path, token: armed.token }),
        timer: armed.timer,
        reminder,
        due: instantOf(due)
      });
  }
  run.state.timers.sort((a, b) => compareText(timerKey(a), timerKey(b)));
}

/** Arm the timers of a state just entered (spec §16.8): its transitions' `after`, and its `sla`. */
function armTimers(run, path) {
  const key = instanceOf(run, path);
  for (const [edgeId, edge] of run.model.leaving(path)) {
    if (edge.after !== undefined) armTimer(run, { kind: "after", state: path, edge: edgeId, timer: edge.after }, key);
  }
  const sla = run.model.nodeAt(path).sla;
  if (sla !== undefined) armTimer(run, { kind: "sla", state: path, timer: sla }, key);
}

/** Cancel the timers of a state just left. */
function cancelTimers(run, path) {
  for (const armed of run.state.timers.filter(item => item.state === path && item.kind !== "reminder")) {
    run.trace.push({ type: "timerCancelled", ...armed });
  }
  run.state.timers = run.state.timers.filter(item => item.state !== path);
}

/** Is a transition in effect at the run's clock (`effective`: from, inclusive, until, exclusive)? */
function inEffect(run, edge) {
  if (!edge.effective) return true;
  const now = parseInstant(run.state.clock);
  const from = parseInstant(edge.effective.from);
  const until = parseInstant(edge.effective.until);
  return (!from || now >= from) && (!until || now < until);
}

/** Leave a state and everything active inside it, innermost first (spec §16.6). */
function exitFrom(run, path, event) {
  const depth = item => item.split("/").length;
  const inside = [...run.state.active]
    .filter(other => within(other, path))
    .sort((a, b) => depth(b) - depth(a) || run.model.compare(b, a));
  remember(run, inside);
  for (const other of inside) exitState(run, other, event);
}

/** Is a region of a machine instance complete: is its active state terminal (spec §16.9)? */
function regionComplete(run, owner, canvasId, key) {
  const here = [...run.state.active].find(path => parentOf(path) === owner && inRegion(run, canvasId, path, key));
  return here !== undefined && run.model.nodeAt(here).terminal === true;
}

/**
 * Is a `done` trigger met for a transition leaving `path` (spec §16.9)? `true`: every region of the state's interior
 * is complete; a region ID: that region — of the state's interior, or of the transition's own canvas — is.
 */
function doneMet(run, path, done) {
  const interior = run.model.interiorOf(run.model.nodeAt(path));
  if (done === true) {
    return (
      Boolean(interior) && run.model.regions(interior).every(region => regionComplete(run, path, interior, region.key))
    );
  }
  if (interior && run.doc.canvases[interior].regions?.[done]) return regionComplete(run, path, interior, done);
  const canvasId = run.model.canvasAt(path);
  return Boolean(run.doc.canvases[canvasId].regions?.[done]) && regionComplete(run, parentOf(path), canvasId, done);
}

/**
 * Does a transition leaving `path` respond to this input: its event (`on`, `onMatch`), its call (`via`), its timer
 * fired (`after`), or — with no input — `always` and a met `done`?
 */
function respondsTo(run, path, edgeId, edge, input) {
  if (input.kind === "timer") return path === input.state && edgeId === input.edge;
  const byEvent = () =>
    input.event !== undefined &&
    Boolean(edge.on?.includes(input.event) || edge.onMatch?.some(glob => globMatches(glob, input.name)));
  if (input.kind === "event") return byEvent();
  if (input.kind === "call") return edge.via === input.call || byEvent();
  if (input.kind === "eventless")
    return edge.always === true || (edge.done !== undefined && doneMet(run, path, edge.done));
  return false;
}

/** The input of eventless transitions. */
const EVENTLESS = { kind: "eventless", label: null };

/**
 * The transition a state takes for an input, if any (spec §16.4–5): one of its own or of its region's `any` nodes,
 * whose guard holds. Several holding: the first in ID order, with a warning. Guards that cannot be evaluated make it a
 * question (simulator spec §5.4); "none" is an answer only when no other transition holds for sure.
 */
function pick(run, path, input) {
  const key = instanceOf(run, path);
  const holds = [];
  const unknown = [];
  for (const [edgeId, edge] of run.model.leaving(path)) {
    if (!respondsTo(run, path, edgeId, edge, input) || !inEffect(run, edge)) continue;
    const verdict = judge(run, edge.guard, key, input === EVENTLESS ? null : input);
    if (verdict === true) holds.push([edgeId, edge]);
    else if (verdict === null) unknown.push([edgeId, edge]);
  }
  const target = edge => run.model.nameAt(childPath(parentOf(path), edge.to));
  if (unknown.length === 0) {
    if (holds.length > 1) {
      warn(
        run,
        "ambiguous",
        `${holds.length} transitions leave ${run.model.nameAt(path)}${input.label ? ` on ${input.label}` : ""}; the first in ID order is taken`,
        { state: path, edges: holds.map(([id]) => id) }
      );
    }
    return holds.length ? { source: path, edgeId: holds[0][0], edge: holds[0][1] } : null;
  }
  const options = [...holds, ...unknown].sort(([a], [b]) => compareText(a, b));
  const question = {
    kind: "transition",
    at: path,
    state: run.model.nameAt(path),
    trigger: input.label,
    candidates: [
      ...options.map(([edgeId, edge]) => ({
        value: edgeId,
        to: target(edge),
        guard: guardInfo(run, edge.guard),
        ...named(edge)
      })),
      ...(holds.length ? [] : [{ value: null }])
    ]
  };
  const chosen = ask(run, question);
  if (chosen === null) return null;
  const [edgeId, edge] = options.find(([id]) => id === chosen);
  return { source: path, edgeId, edge };
}

/** The states a transition leaves: its source and everything active inside it (none for an internal one). */
function exitsOf(run, { source, edge }) {
  if (edge.internal) return new Set();
  return new Set([...run.state.active].filter(path => within(path, source)));
}

/**
 * The transitions an input selects (spec §16.5): from each active leaf, the innermost state that takes one; across
 * regions, transitions that leave the same states keep the one with the deeper source (ties: region order); the rest
 * fire in region order.
 */
function select(run, input) {
  const decided = new Map();
  const picked = [];
  for (const leaf of leavesOf(run.state.active).sort(run.model.compare)) {
    for (let path = leaf; path; path = parentOf(path)) {
      if (!decided.has(path)) decided.set(path, pick(run, path, input));
      const choice = decided.get(path);
      if (!choice) continue;
      if (!picked.includes(choice)) picked.push(choice);
      break;
    }
  }
  const depth = path => path.split("/").length;
  const accepted = [];
  const byPriority = [...picked].sort(
    (a, b) => depth(b.source) - depth(a.source) || run.model.compare(a.source, b.source)
  );
  for (const choice of byPriority) {
    const exits = exitsOf(run, choice);
    if (accepted.some(other => [...exits].some(path => other.exits.has(path)))) continue;
    accepted.push({ ...choice, exits });
  }
  return accepted.sort((a, b) => run.model.compare(a.source, b.source));
}

/** Take one transition (spec §16.6): exits innermost first, the transition's actions, entries outermost first. */
function take(run, { source, edgeId, edge }, event) {
  count(run);
  const target = childPath(parentOf(source), edge.to);
  staysInRegion(run, source, target);
  if (!edge.internal) exitFrom(run, source, event);
  run.trace.push({
    type: "transition",
    edge: edgeId,
    from: source,
    to: target,
    ...(edge.internal ? { internal: true } : {})
  });
  runEffects(run, edge.actions, instanceOf(run, source), event, source);
  // A call that triggers the transition runs its endpoint's or webhook's flow (mixed levels spec §4.2).
  if (edge.via && event?.call === edge.via && embeddedFlowOf(run.doc, edge.via)) {
    const entry = {
      type: "action",
      [run.doc.catalog.endpoints[edge.via] ? "endpoint" : "webhook"]: edge.via,
      at: source
    };
    run.trace.push(entry);
    runEmbedded(run, edge.via, entry, instanceOf(run, source), event);
  }
  if (!edge.internal) enter(run, target, event);
}

/**
 * Process one input — an event, a call, a timer, or an event the machine raised — to completion (spec §16.3). Each
 * input from outside is its own step for the livelock count; raised events count with the input that raised them.
 */
export function receive(run, input) {
  if (!input.internal) run.fired = 0;
  if (input.kind !== "timer") {
    const about = { ...input };
    delete about.kind;
    run.trace.push({ type: "received", ...about });
  }
  const chosen = select(run, input);
  if (chosen.length === 0) run.trace.push({ type: "nothing" });
  for (const choice of chosen) take(run, choice, input);
  settle(run);
}

/** Take eventless transitions — `always`, and `done` once met — until none is enabled (spec §16.2, §16.9). */
export function settle(run) {
  for (;;) {
    const chosen = select(run, EVENTLESS);
    if (chosen.length === 0) return;
    for (const choice of chosen) take(run, choice, null);
  }
}

/** Process the events the machine raised, one at a time, before the step ends (spec §16.3). */
export function drain(run) {
  while (run.queue.length) {
    const { event, payload } = run.queue.shift();
    const name = run.doc.catalog.events[event]?.name ?? event;
    receive(run, { kind: "event", event, name, label: name, payload, internal: true });
  }
}

/** Is a node's ID one of the top canvas's entries? */
export function isEntry(run, nodeId) {
  return run.doc.canvases[run.model.top].nodes[nodeId]?.kind === "entry";
}

/** A timer falls due (spec §16.8): an `after` fires its transition; an `sla` or a reminder only warns. */
export function fireTimer(run, armed) {
  run.trace.push({ type: "timerFired", ...armed });
  const name = run.doc.catalog.timers[armed.timer]?.name ?? armed.timer;
  if (armed.kind === "sla") {
    warn(run, "sla", `${run.model.nameAt(armed.state)} is still active past its SLA (${name})`, { state: armed.state });
  } else if (armed.kind === "reminder") {
    warn(run, "reminder", `${name}: reminder ${armed.reminder} from its deadline`, { state: armed.state });
  } else {
    receive(run, { kind: "timer", timer: armed.timer, state: armed.state, edge: armed.edge, label: name });
    drain(run);
  }
}

/**
 * Let time pass (simulator spec §5.6): a duration, firing in due order every timer due before it ends — each a step
 * of its own — or `next`, until the next timer and those due at the same instant. The clock never goes back; past
 * TIMER_FLOOD timers it stops at the last one fired.
 */
export function passTime(run, wait, fire = fireTimer) {
  const now = parseInstant(run.state.clock);
  const first = run.state.timers[0];
  if (wait === "next" && !first) {
    run.trace.push({ type: "nothing" });
    return;
  }
  const end = wait === "next" ? new Date(Math.max(now, parseInstant(first.due))) : addDuration(now, wait);
  if (!end) throw new EngineError("badInput", `A wait of ${wait} goes past the year 9999`);
  run.trace.push({ type: "waited", wait, until: instantOf(end) });
  for (let fired = 0; run.state.timers.length && parseInstant(run.state.timers[0].due) <= end; fired++) {
    if (fired === TIMER_FLOOD) {
      warn(run, "timerFlood", `More than ${TIMER_FLOOD} timers fell due in one wait; the clock stops at the last one`);
      return;
    }
    const armed = run.state.timers.shift();
    const due = parseInstant(armed.due);
    if (due > parseInstant(run.state.clock)) run.state.clock = armed.due;
    fire(run, armed);
  }
  run.state.clock = instantOf(end);
}
