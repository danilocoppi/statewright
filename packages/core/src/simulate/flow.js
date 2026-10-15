// A run of a flow (Core spec §16.13, simulator spec §5.9): a token starts at `start` and moves through the nodes; a
// step goes on until every token has ended, waits, or needs an answer. A token's path is its node's ID, under the
// `while`, `forEach` and `subflow` nodes whose bodies hold it (simulator spec §4.3).
import { evaluate } from "../logic/index.js";
import { compareText, sorted } from "../rules/facts.js";
import { canonicalize } from "../serialize/canonical.js";
import { EngineError, childPath, lastOf, parentOf } from "./model.js";
import { armTimer, ask, contextOf, dataFor, guardInfo, judge, named, valueOf, warn, writeTarget } from "./run.js";

/** Node visits one step may make before the flow is said never to settle (simulator spec §5.10). */
export const FLOW_LIVELOCK = 1000;

/** The kind of an edge: `next` when it has none. */
const kindOf = edge => edge.kind ?? "next";

/** The edges leaving a token's node, of one kind, in ID order. */
const edgesOf = (run, token, kind) =>
  run.model.out(run.model.canvasAt(token.path), lastOf(token.path)).filter(([, edge]) => kindOf(edge) === kind);

/** Expressions in a flow see the step's event, the run's own context and the flow's variables (spec §16.10). */
const evaluated = (run, map) =>
  Object.fromEntries(
    Object.entries(map ?? {}).map(([name, expr]) => [name, valueOf(run, expr, run.model.top, run.event) ?? null])
  );

/** The one start node of a flow canvas; a flow with none or several cannot run (simulator spec §5.10). */
function startOf(run, canvasId) {
  const canvas = run.doc.canvases[canvasId];
  const starts = sorted(canvas.nodes).filter(([, node]) => node.kind === "start");
  if (starts.length !== 1) {
    const many = starts.length ? `${starts.length} start nodes` : "no start node";
    throw new EngineError("noStart", `${canvas.name} has ${many}`, { canvas: canvasId });
  }
  return starts[0][0];
}

/** A new token at `path`, ready to run. */
function spawn(run, path, extra = {}) {
  const id = run.state.tokens.reduce((last, token) => Math.max(last, token.id), 0) + 1;
  const token = { id, path, ...extra };
  run.state.tokens.push(token);
  run.ready.push(token);
  return token;
}

/** Move a token along an edge to the node it leads to; the token runs there next. */
function move(run, token, [edgeId, edge]) {
  const to = childPath(parentOf(token.path), edge.to);
  run.trace.push({ type: "token", change: "moved", edge: edgeId, from: token.path, to });
  token.path = to;
  token.via = edgeId;
  run.ready.push(token);
}

/** Follow the first of these edges (ID order), warning when there are several; with none, the token is stuck. */
function follow(run, token, edges) {
  if (!edges.length) {
    throw new EngineError("stuck", `${run.model.nameAt(token.path)} has nowhere to go`, { path: token.path });
  }
  if (edges.length > 1) {
    warn(
      run,
      "ambiguous",
      `${edges.length} edges leave ${run.model.nameAt(token.path)}; the first in ID order is taken`,
      { path: token.path, edges: edges.map(([id]) => id) }
    );
  }
  move(run, token, edges[0]);
}

/** The name of the node an edge leads to, for a question's candidates. */
const targetName = (run, token, edge) => run.model.nameAt(childPath(parentOf(token.path), edge.to));

/**
 * Did the node fail? A node with an error edge asks (simulator spec §5.4, `outcome`); without one, it worked. When it
 * failed, the token takes its error edge.
 */
function failed(run, token) {
  const errors = edgesOf(run, token, "error");
  if (!errors.length) return false;
  const next = edgesOf(run, token, "next")[0];
  const outcome = ask(run, {
    kind: "outcome",
    at: token.path,
    node: run.model.nameAt(token.path),
    candidates: [
      { value: "ok", to: next ? targetName(run, token, next[1]) : null },
      { value: "error", to: targetName(run, token, errors[0][1]) }
    ]
  });
  if (outcome === "ok") return false;
  follow(run, token, errors);
  return true;
}

/** After a node has run, its token goes on along its next edge, or its error edge when it failed. */
function onward(run, token) {
  if (!failed(run, token)) follow(run, token, edgesOf(run, token, "next"));
}

/** An `if` follows its true or false edge; a condition it cannot tell asks which (simulator spec §5.4, `branch`). */
function decideIf(run, token, node) {
  const key = run.model.top;
  const edges = { true: edgesOf(run, token, "true"), false: edgesOf(run, token, "false") };
  let holds = node.condition ? judge(run, node.condition, key, run.event) : null;
  if (holds === null) {
    holds = ask(run, {
      kind: "branch",
      at: token.path,
      node: run.model.nameAt(token.path),
      condition: guardInfo(run, node.condition),
      candidates: [true, false].map(value => {
        const edge = edges[value][0];
        return { value, to: edge ? targetName(run, token, edge[1]) : null };
      })
    });
  }
  const taken = edges[holds];
  if (!taken.length) {
    throw new EngineError("stuck", `${run.model.nameAt(token.path)} has no ${holds} edge`, { path: token.path });
  }
  follow(run, token, taken);
}

/**
 * A `switch` follows the edge whose `case` equals the value of `on` (as JSON), else its `default` edge; a value it
 * cannot tell asks which edge is taken (simulator spec §5.4, `case`).
 */
function decideSwitch(run, token, node) {
  const cases = edgesOf(run, token, "case");
  const defaults = edgesOf(run, token, "default");
  let text;
  let known = node.on !== undefined;
  if (known) {
    try {
      // The value as JSON: one JSON cannot hold (NaN, Infinity) cannot be told either.
      text = canonicalize(evaluate(node.on, dataFor(run, run.model.top, run.event)) ?? null);
    } catch (error) {
      warn(run, "unevaluated", `${error.message}; the person is asked instead`, { expr: node.on });
      known = false;
    }
  }
  if (!known) {
    const chosen = ask(run, {
      kind: "case",
      at: token.path,
      node: run.model.nameAt(token.path),
      candidates: [
        ...cases.map(([id, edge]) => ({
          value: id,
          to: targetName(run, token, edge),
          case: edge.case,
          ...named(edge)
        })),
        ...defaults.map(([id, edge]) => ({
          value: id,
          to: targetName(run, token, edge),
          default: true,
          ...named(edge)
        }))
      ]
    });
    return move(
      run,
      token,
      [...cases, ...defaults].find(([id]) => id === chosen)
    );
  }
  const matching = cases.filter(([, edge]) => canonicalize(edge.case) === text);
  if (matching.length) return follow(run, token, matching);
  if (!defaults.length) {
    const message = `No case of ${run.model.nameAt(token.path)} matches ${text}, and it has no default`;
    throw new EngineError("stuck", message, { path: token.path });
  }
  follow(run, token, defaults);
}

/** The flow a `while`, `forEach` or `subflow` runs as its body; without one, it cannot run. */
function bodyOf(run, owner, node) {
  const canvasId = node.inner ? run.model.interiorOf(node) : null;
  if (!canvasId) {
    throw new EngineError("noStart", `${run.model.nameAt(owner.path)} has no flow inside to run`, { path: owner.path });
  }
  return canvasId;
}

/** Run a body once more: a token starts at its start, under its owner's path, and the owner waits for it. */
function enterBody(run, owner, node) {
  const to = childPath(owner.path, startOf(run, bodyOf(run, owner, node)));
  run.trace.push({ type: "token", change: "moved", from: owner.path, to });
  spawn(run, to, { owner: owner.id });
}

/** An owner whose body is done goes on along its next edge (its outcome is its body's: no question is asked). */
function leave(run, owner) {
  delete owner.body;
  follow(run, owner, edgesOf(run, owner, "next"));
}

/** A `while` runs its body again while its condition holds; a condition it cannot tell asks (`branch`). */
function loopWhile(run, owner, node) {
  let holds = node.condition ? judge(run, node.condition, run.model.top, run.event) : null;
  if (holds === null) {
    const body = node.inner ? run.model.interiorOf(node) : null;
    const next = edgesOf(run, owner, "next")[0];
    holds = ask(run, {
      kind: "branch",
      at: owner.path,
      node: run.model.nameAt(owner.path),
      condition: guardInfo(run, node.condition),
      candidates: [
        { value: true, to: body ? run.doc.canvases[body].name : null },
        { value: false, to: next ? targetName(run, owner, next[1]) : null }
      ]
    });
  }
  if (!holds) return leave(run, owner);
  owner.body.iteration += 1;
  enterBody(run, owner, node);
}

/**
 * What a `forEach` runs over: its list (`items`), or — when it cannot be told — how many items the person says there
 * are (`count`, each item null; only the number is kept, however large).
 */
function itemsOf(run, owner, node) {
  const name = run.model.nameAt(owner.path);
  if (node.items !== undefined) {
    try {
      const value = evaluate(node.items, dataFor(run, run.model.top, run.event));
      if (Array.isArray(value)) return { items: structuredClone(value) };
      warn(run, "unevaluated", `The items of ${name} are not a list; the person is asked how many there are`, {
        expr: node.items
      });
    } catch (error) {
      warn(run, "unevaluated", `${error.message}; the person is asked instead`, { expr: node.items });
    }
  }
  return { count: ask(run, { kind: "count", at: owner.path, node: name, items: node.items ?? null }) };
}

/** A `forEach` runs its body for its next item, bound to `vars.<as>`; after the last, it goes on. */
function nextItem(run, owner, node) {
  const { items, count, index } = owner.body;
  if (index >= (items ? items.length : count)) return leave(run, owner);
  if (node.as) {
    const target = `vars.${node.as}`;
    const value = items ? structuredClone(items[index]) : null;
    if (writeTarget(run, run.state.vars, target, value)) {
      run.trace.push({ type: "assigned", path: target, value, at: owner.path });
    }
  }
  enterBody(run, owner, node);
}

/**
 * A body's token has ended. Once the body has none left, its owner goes on: a failed body fails its owner (its error
 * edge, else its token ends in failure); a `while` checks its condition again, a `forEach` takes its next item.
 */
function bodyEnded(run, ownerId, outcome) {
  const owner = run.state.tokens.find(token => token.id === ownerId);
  if (outcome === "failure") owner.body.failed = true;
  if (run.state.tokens.some(token => token.owner === ownerId)) return;
  const node = run.model.nodeAt(owner.path);
  if (owner.body.failed) {
    delete owner.body;
    const errors = edgesOf(run, owner, "error");
    return errors.length ? follow(run, owner, errors) : finish(run, owner, "failure");
  }
  if (node.kind === "while") return loopWhile(run, owner, node);
  if (node.kind === "forEach") {
    owner.body.index += 1;
    return nextItem(run, owner, node);
  }
  leave(run, owner);
}

/** A `parallel` forks a token along each of its next edges, in ID order: the token itself takes the first. */
function fork(run, token) {
  const edges = edgesOf(run, token, "next");
  if (!edges.length) {
    throw new EngineError("stuck", `${run.model.nameAt(token.path)} has nowhere to go`, { path: token.path });
  }
  const to = edges.map(([, edge]) => childPath(parentOf(token.path), edge.to));
  run.trace.push({ type: "token", change: "forked", from: token.path, to, edges: edges.map(([id]) => id) });
  edges.forEach(([edgeId], index) => {
    if (index > 0) return spawn(run, to[index], { ...(token.owner ? { owner: token.owner } : {}), via: edgeId });
    token.path = to[0];
    token.via = edgeId;
    run.ready.push(token);
  });
}

/**
 * A `join` holds the tokens that come in until one has come in on each of its incoming edges; then the oldest goes on
 * and the others end there.
 */
function join(run, token, via) {
  token.via = via;
  const incoming = run.model.into(run.model.canvasAt(token.path), lastOf(token.path)).map(([id]) => id);
  const held = run.state.tokens.filter(
    other => other.path === token.path && other.owner === token.owner && other.via !== undefined
  );
  const arrived = incoming.map(edgeId => held.filter(other => other.via === edgeId).sort((a, b) => a.id - b.id)[0]);
  if (arrived.some(other => !other)) return;
  const [kept, ...merged] = arrived.sort((a, b) => a.id - b.id);
  run.state.tokens = run.state.tokens.filter(other => !merged.includes(other));
  // A token that came in but has not run here yet is done with: the one that goes on is queued once, below.
  run.ready = run.ready.filter(other => !arrived.includes(other));
  delete kept.via;
  run.trace.push({ type: "token", change: "joined", at: kept.path, edges: incoming });
  onward(run, kept);
}

/** A `wait` holds its token until one of its events comes or its timer falls due (simulator spec §5.9). */
function waitAt(run, token, node) {
  token.waiting = true;
  if (node.after !== undefined) {
    armTimer(run, { kind: "wait", path: token.path, token: token.id, timer: node.after }, run.model.top);
  }
}

/** A waiting token goes on: its timers are cancelled, and it leaves along its next edge (or its error edge). */
function release(run, token) {
  delete token.waiting;
  for (const armed of run.state.timers.filter(item => item.token === token.id && item.kind === "wait")) {
    run.trace.push({ type: "timerCancelled", ...armed });
  }
  run.state.timers = run.state.timers.filter(item => item.token !== token.id);
  onward(run, token);
}

/**
 * A token ends with an outcome: in a body, its owner hears of it; at the top, the run's outcome is the worst of its
 * ends ("failure" wins).
 */
function finish(run, token, outcome) {
  run.state.tokens = run.state.tokens.filter(other => other !== token);
  run.trace.push({ type: "token", change: "ended", at: token.path, outcome });
  if (token.owner) return bodyEnded(run, token.owner, outcome);
  if (run.state.outcome !== "failure") run.state.outcome = outcome;
}

/** Write an `assign` node's values into the flow's variables or its context. */
function assign(run, token, set) {
  for (const [target, expr] of Object.entries(set ?? {})) {
    const value = valueOf(run, expr, run.model.top, run.event);
    const holder = target.startsWith("vars.") ? run.state.vars : contextOf(run, run.model.top);
    if (value === undefined || !writeTarget(run, holder, target, value)) continue;
    run.trace.push({ type: "assigned", path: target, value, at: token.path });
  }
}

/** Run the node a token is at, and send the token on. */
function visit(run, token) {
  const node = run.model.nodeAt(token.path);
  const at = token.path;
  const via = token.via;
  delete token.via;
  switch (node.kind) {
    case "start":
      return onward(run, token);
    case "end":
      return finish(run, token, node.outcome ?? "success");
    case "action":
      run.trace.push({ type: "action", action: node.action, args: evaluated(run, node.args), at });
      return onward(run, token);
    case "call":
      run.trace.push({
        type: "action",
        ...(node.endpoint ? { endpoint: node.endpoint } : {}),
        ...(node.request ? { request: node.request } : {}),
        ...(node.party ? { party: node.party } : {}),
        at
      });
      return onward(run, token);
    case "webhook":
      run.trace.push({ type: "action", webhook: node.webhook, at });
      return onward(run, token);
    case "emit":
      run.trace.push({
        type: "emitted",
        event: node.event,
        payload: node.payload === undefined ? null : evaluated(run, node.payload),
        at
      });
      return onward(run, token);
    case "assign":
      assign(run, token, node.set);
      return onward(run, token);
    case "if":
      if (!failed(run, token)) decideIf(run, token, node);
      return;
    case "switch":
      if (!failed(run, token)) decideSwitch(run, token, node);
      return;
    case "while":
      token.body = { iteration: 0 };
      return loopWhile(run, token, node);
    case "forEach":
      token.body = { ...itemsOf(run, token, node), index: 0 };
      return nextItem(run, token, node);
    case "subflow":
      token.body = {};
      return enterBody(run, token, node);
    case "parallel":
      if (!failed(run, token)) fork(run, token);
      return;
    case "join":
      return join(run, token, via);
    case "wait":
      return waitAt(run, token, node);
    default:
      throw new EngineError("badTarget", `A flow cannot run the ${node.kind} node ${run.model.nameAt(at)}`, {
        path: at
      });
  }
}

/** Move the ready tokens until none is: each has ended, waits, or the step needs an answer. */
function advance(run) {
  while (run.ready.length) {
    if (++run.visits > FLOW_LIVELOCK) {
      // A finite list can reach the limit too (simulator spec §5.10), so the message does not call the flow endless.
      const message = `More than ${FLOW_LIVELOCK} node visits in one step: a loop that does not end, or more than a step can run`;
      throw new EngineError("livelock", message);
    }
    visit(run, run.ready.shift());
  }
}

/** Start a flow: one token at its start (simulator spec §5.9). */
export function startFlow(run) {
  spawn(run, startOf(run, run.model.top));
  advance(run);
}

/**
 * An event or a call on a flow (simulator spec §5.9): the tokens waiting for its event go on, in path order; with none,
 * nothing happens.
 */
export function receiveFlow(run, input) {
  run.visits = 0;
  run.event = input.event !== undefined ? { name: input.name, payload: input.payload ?? null } : null;
  const about = { ...input };
  delete about.kind;
  run.trace.push({ type: "received", ...about });
  const waiting =
    input.event === undefined ?
      []
    : run.state.tokens
        .filter(token => token.waiting && run.model.nodeAt(token.path).on?.includes(input.event))
        .sort((a, b) => compareText(a.path, b.path) || a.id - b.id);
  if (!waiting.length) {
    run.trace.push({ type: "nothing" });
    return;
  }
  for (const token of waiting) release(run, token);
  advance(run);
}

/**
 * A flow's timer falls due (simulator spec §5.6): a wait's timer lets its token go on, as a step of its own; a reminder
 * only warns.
 */
export function fireWait(run, armed) {
  run.trace.push({ type: "timerFired", ...armed });
  if (armed.kind === "reminder") {
    const name = run.doc.catalog.timers[armed.timer]?.name ?? armed.timer;
    warn(run, "reminder", `${name}: reminder ${armed.reminder} from its deadline`, { path: armed.path });
    return;
  }
  const token = run.state.tokens.find(other => other.id === armed.token);
  if (!token?.waiting) return;
  run.visits = 0;
  run.event = null;
  release(run, token);
  advance(run);
}

/** The session a finished flow step leaves: plain JSON, its tokens in ID order. */
export function flowSessionOf(run) {
  const { canvas, clock, tokens, vars, context, timers, outcome } = run.state;
  const ended = tokens.length === 0 ? (outcome ?? "success") : null;
  return {
    canvas,
    clock,
    active: tokens.map(token => token.path).sort(compareText),
    tokens: [...tokens]
      .sort((a, b) => a.id - b.id)
      .map(({ id, path, owner, via, waiting, body }) => ({
        id,
        path,
        ...(owner ? { owner } : {}),
        ...(via ? { via } : {}),
        ...(waiting ? { waiting } : {}),
        ...(body ? { body } : {})
      })),
    vars,
    context: Object.fromEntries(
      Object.keys(context)
        .sort(compareText)
        .map(key => [key, context[key]])
    ),
    timers,
    ...(ended ? { ended }
    : outcome ? { outcome }
    : {})
  };
}
