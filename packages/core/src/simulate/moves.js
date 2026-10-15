// What can happen now (simulator spec §5.2, §6.2): the inputs that would take a transition from the active states — or,
// in a flow, what its waiting tokens wait for — each tried on a copy of the session to tell where it leads.
import { compareText, sorted } from "../rules/facts.js";
import { createModel } from "./model.js";
import { globMatches, leavesOf } from "./run.js";
import { durationBetween, parseInstant } from "./time.js";

/** The order of moves inside a region: events, then calls, then timers; then by name. */
const RANK = { event: 0, call: 1, timer: 2 };

/** The edges of trace entries, once each, in ID order. */
const edgesOf = entries => [...new Set(entries.map(entry => entry.edge))].sort(compareText);

/** Moves in their order: by region, then events, calls and timers, then when they are due and by name. */
const inOrder = (moves, regionOrder) =>
  moves.sort(
    (a, b) =>
      regionOrder(a.region.key) - regionOrder(b.region.key) ||
      RANK[a.kind] - RANK[b.kind] ||
      compareText(a.due ?? "", b.due ?? "") ||
      compareText(a.label, b.label)
  );

/**
 * A flow's moves (simulator spec §5.2: "what each wait waits for"): the events its waiting tokens wait for and the
 * timers of their waits, each with the tokens it leads to, and how the run ends when it does.
 */
function flowMovesOf(doc, session, take) {
  const model = createModel(doc, session.canvas);
  const region = { key: "", name: doc.canvases[session.canvas].name };
  const found = new Map();
  const offer = (kind, input, label, extra = {}) => {
    const id = JSON.stringify(input);
    if (!found.has(id)) found.set(id, { do: input, label, kind, region, ...extra });
  };
  for (const token of session.tokens.filter(item => item.waiting).sort((a, b) => compareText(a.path, b.path))) {
    for (const event of model.nodeAt(token.path).on ?? []) {
      offer("event", { event }, doc.catalog.events[event]?.name ?? event);
    }
  }
  const now = parseInstant(session.clock);
  for (const armed of session.timers.filter(item => item.kind === "wait")) {
    const input = { wait: durationBetween(now, parseInstant(armed.due)) };
    offer("timer", input, doc.catalog.timers[armed.timer]?.name ?? armed.timer, { due: armed.due });
  }
  const before = new Set(leavesOf(session.active));
  const waiting = new Set(session.tokens.filter(token => token.waiting).map(token => token.path));
  const moves = [...found.values()].map(move => {
    const result = take(doc, session, { do: move.do });
    // The edges its waiting tokens leave by (simulator spec §6.3: the canvas draws them as what can happen now).
    const edges = edgesOf(
      result.trace.filter(entry => entry.type === "token" && entry.change === "moved" && waiting.has(entry.from))
    );
    if (result.status === "needs") return { ...move, edges, outcome: { asks: result.question } };
    if (result.status === "error") return { ...move, edges, outcome: { error: result.code } };
    const to = [...new Set(leavesOf(result.session.active))].filter(path => !before.has(path));
    return { ...move, edges, outcome: { to, ...(result.session.ended ? { ended: result.session.ended } : {}) } };
  });
  return inOrder(moves, () => 0);
}

/**
 * The moves a session offers: every event (and every catalog event an `onMatch` pattern matches), call and armed
 * `after` timer that a transition of an active state — its own, its region's `any` nodes', an enclosing state's —
 * responds to, with where it leads. Moves that would change nothing (their guards false) are left out.
 * @param {any} doc
 * @param {object} session
 * @param {(doc: any, session: object, input: object) => object} take The engine's `step`.
 * @returns {Array<{ do: object, label: string, kind: "event" | "call" | "timer", region: { key: string, name: string },
 *   edges: string[], outcome: { to: string[] } | { asks: object } | { error: string }, due?: string }>} `edges`: the
 *   transitions the move takes from the active states, or those its question chooses between.
 */
export function movesOf(doc, session, take) {
  if (doc.canvases[session.canvas]?.kind === "flow") return flowMovesOf(doc, session, take);
  const model = createModel(doc, session.canvas);
  const regionOfPath = path => {
    const key = model.regionOf(session.canvas, path.split("/")[0]);
    return { key, name: model.regions(session.canvas).find(region => region.key === key).name };
  };
  const found = new Map();
  const offer = (path, kind, input, label, extra = {}) => {
    const id = JSON.stringify(input);
    if (!found.has(id)) found.set(id, { do: input, label, kind, region: regionOfPath(path), ...extra });
  };
  const events = sorted(doc.catalog.events);
  for (const path of [...session.active].sort(compareText)) {
    for (const [, edge] of model.leaving(path)) {
      for (const event of edge.on ?? []) offer(path, "event", { event }, doc.catalog.events[event]?.name ?? event);
      for (const pattern of edge.onMatch ?? []) {
        for (const [event, item] of events) {
          if (globMatches(pattern, item.name)) offer(path, "event", { event }, item.name);
        }
      }
      if (edge.via !== undefined) {
        const endpoint = doc.catalog.endpoints[edge.via];
        offer(
          path,
          "call",
          { call: edge.via },
          endpoint ? `${endpoint.method} ${endpoint.path}` : doc.catalog.webhooks[edge.via]?.name
        );
      }
    }
  }
  const now = parseInstant(session.clock);
  for (const armed of session.timers.filter(item => item.kind === "after")) {
    const input = { wait: durationBetween(now, parseInstant(armed.due)) };
    offer(armed.state, "timer", input, doc.catalog.timers[armed.timer]?.name ?? armed.timer, { due: armed.due });
  }

  const active = new Set(session.active);
  const moves = [];
  for (const move of found.values()) {
    const result = take(doc, session, { do: move.do });
    // The transitions it takes from the states active now, and those a question it asks there chooses between
    // (simulator spec §6.3: the canvas draws them as what can happen now).
    const taken = result.trace.filter(entry => entry.type === "transition" && active.has(entry.from));
    const offered =
      result.question?.kind === "transition" && active.has(result.question.at) ?
        result.question.candidates
          .filter(candidate => candidate.value !== null)
          .map(candidate => ({ edge: candidate.value }))
      : [];
    const edges = edgesOf([...taken, ...offered]);
    if (result.status === "needs") moves.push({ ...move, edges, outcome: { asks: result.question } });
    else if (result.status === "error") moves.push({ ...move, edges, outcome: { error: result.code } });
    else if (result.trace.some(entry => entry.type === "transition")) {
      // Where it leads: the states it enters that are still active, innermost, when it ends.
      const leaves = new Set(leavesOf(result.session.active));
      const to = result.trace
        .filter(entry => entry.type === "entered" && leaves.has(entry.state))
        .map(entry => entry.state);
      moves.push({ ...move, edges, outcome: { to: [...new Set(to)].sort(compareText) } });
    }
  }
  return inOrder(moves, key => model.regions(session.canvas).findIndex(region => region.key === key));
}
