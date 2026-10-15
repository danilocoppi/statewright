// What the panel says about a run (simulator spec §6.2): the clock, where the run is now. Names of states, events and
// nodes are the document's, as written; the panel's own words are the interface language's (`t`).
import { locate, reachedOf } from "statewright/simulate";

import { parseDuration } from "@/editing/triggers";

import { parseInstant } from "./values";

/**
 * An instant as the panel says it, in UTC: "Wed 7 Jan 2026, 09:00" (seconds only when there are some).
 * @param {string} iso
 * @param {string} language
 */
export function clockText(iso, language) {
  const date = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(language, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    })
      .formatToParts(date)
      .map(part => [part.type, part.value.replace(/\.$/, "")])
  );
  const time = iso.slice(11, 19);
  return `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}, ${time.endsWith(":00") ? time.slice(0, 5) : time}`;
}

/** The name a node is shown by: its name, else its kind's word. */
export const nodeName = (doc, canvas, node, t) => {
  const value = doc.canvases[canvas]?.nodes[node];
  return value?.label ?? value?.name ?? (value ? t(`inspector:kinds.node.${value.kind}`) : node);
};

/** The region a node is drawn in, when its level has several. */
function regionOf(doc, { canvas, node }) {
  const level = doc.canvases[canvas];
  if (Object.keys(level.regions ?? {}).length < 2) return null;
  return level.regions[level.nodes[node]?.region]?.name ?? null;
}

/**
 * Where an active state is, in a word: the region of it, or of the nearest state above it, in a level of several;
 * else the state above it. Null for a state of the top level's only region.
 */
function whereOf(doc, places, t) {
  for (let at = places.length - 1; at >= 0; at -= 1) {
    const region = regionOf(doc, places[at]);
    if (region) return region;
  }
  return places.length > 1 ? nodeName(doc, places[0].canvas, places[0].node, t) : null;
}

/**
 * The rows of Now (spec §6.2): each active state with its region or machine (a machine), or each token with where it
 * is and what it does (a flow).
 * @returns {Array<{ key: string, path: string, name: string, where: string | null }>}
 */
export function nowRows(doc, top, session, t) {
  if (doc.canvases[top]?.kind === "flow") return tokenRows(doc, top, session, t);
  return reachedOf(session).active.map(path => {
    const places = locate(doc, top, path);
    if (!places) return { key: path, path, name: path, where: null };
    const last = places.at(-1);
    return { key: path, path, name: nodeName(doc, last.canvas, last.node, t), where: whereOf(doc, places, t) };
  });
}

/** A flow's tokens: the node each is on, and what it does there. */
function tokenRows(doc, top, session, t) {
  return [...session.tokens]
    .sort((a, b) =>
      a.path < b.path ? -1
      : a.path > b.path ? 1
      : a.id - b.id
    )
    .map(token => {
      const places = locate(doc, top, token.path);
      if (!places) return { key: `${token.id}`, path: token.path, name: token.path, where: null };
      const last = places.at(-1);
      const owners = places.slice(0, -1).map(place => nodeName(doc, place.canvas, place.node, t));
      const doing =
        token.waiting ? t("simulate:now.waiting")
        : token.via ? t("simulate:now.joining")
        : token.body?.items ? t("simulate:now.item", { index: token.body.index + 1, count: token.body.items.length })
        : token.body?.count !== undefined ?
          t("simulate:now.item", { index: token.body.index + 1, count: token.body.count })
        : token.body?.iteration !== undefined ? t("simulate:now.round", { count: token.body.iteration + 1 })
        : token.body ? t("simulate:now.inside")
        : null;
      const where = [owners.length ? t("simulate:now.in", { names: owners.join(" / ") }) : null, doing]
        .filter(Boolean)
        .join(" · ");
      return {
        key: `${token.id}`,
        path: token.path,
        name: nodeName(doc, last.canvas, last.node, t),
        where: where || null
      };
    });
}

/**
 * Since which point a state has been active without a break, up to the point shown (0: the start).
 * @param {object[]} points
 * @param {number} shown
 * @param {string} path
 */
export function activeSince(points, shown, path) {
  let since = shown;
  while (since > 0 && points[since - 1].session.active.includes(path)) since -= 1;
  return since;
}

/** The element an engine error names: the node at the end of a path, a transition's source, a level, a timer. */
export function elementOf(details) {
  const path = details?.path ?? details?.from;
  if (typeof path === "string") return path.slice(path.lastIndexOf("/") + 1);
  return details?.canvas ?? details?.timer ?? null;
}

/** The name of the node at the end of a path, or the path itself when the document no longer has it. */
export function pathName(doc, top, path, t) {
  const places = locate(doc, top, path);
  const last = places?.at(-1);
  if (last) return nodeName(doc, last.canvas, last.node, t);
  // A step of an action's flow, run inside a machine's step (mixed levels spec §4.2): its node, wherever it is.
  const id = path.slice(path.lastIndexOf("/") + 1);
  const canvas = Object.keys(doc.canvases).find(key => doc.canvases[key].nodes[id]);
  return canvas ? nodeName(doc, canvas, id, t) : path;
}

/**
 * Where a move leads (spec §6.2: "→ paused", "asks · 2 ways"): the states or nodes it reaches, a question it asks, an
 * ending, a state it stays in, or a stop.
 * @returns {{ kind: "to", names: string[] } | { kind: "asks" | "stays" | "ends" | "error", text: string }}
 */
export function outcomeOf(doc, top, move, t) {
  const { outcome } = move;
  if (outcome.asks) {
    const ways = (outcome.asks.candidates ?? []).filter(candidate => candidate.value !== null).length;
    return { kind: "asks", text: ways > 1 ? t("simulate:moves.asksWays", { count: ways }) : t("simulate:moves.asks") };
  }
  if (outcome.error) return { kind: "error", text: t("simulate:moves.cannot") };
  if (outcome.ended && !outcome.to.length) return { kind: "ends", text: t(`simulate:moves.ends.${outcome.ended}`) };
  if (!outcome.to.length) return { kind: "stays", text: t("simulate:moves.stays") };
  return { kind: "to", names: outcome.to.map(path => pathName(doc, top, path, t)) };
}

/** A span of time in short words, its two largest units: "10 d", "9 d 23 h", "15 min", "30 s". */
export function spanText(seconds) {
  const units = [
    ["d", 86_400],
    ["h", 3_600],
    ["min", 60],
    ["s", 1]
  ];
  const parts = [];
  let left = Math.max(0, Math.round(seconds));
  for (const [unit, size] of units) {
    const count = Math.floor(left / size);
    left -= count * size;
    if (count && parts.length < 2) parts.push(`${count} ${unit}`);
    else if (parts.length) break;
  }
  return parts.join(" ") || "0 s";
}

/** How far a moment is from the clock, in seconds. */
export const secondsBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / 1000;

/** The ISO 8601 duration from one moment to a later one (`P9DT23H`), for a wait. */
export function durationUntil(from, to) {
  let left = Math.max(0, Math.round(secondsBetween(from, to)));
  const days = Math.floor(left / 86_400);
  left -= days * 86_400;
  const hours = Math.floor(left / 3_600);
  left -= hours * 3_600;
  const minutes = Math.floor(left / 60);
  const seconds = left - minutes * 60;
  const time = `${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds ? `${seconds}S` : ""}`;
  const duration = `P${days ? `${days}D` : ""}${time ? `T${time}` : ""}`;
  return duration === "P" ? "PT0S" : duration;
}

/** The catalog type of what an input carries: an event's payload, an endpoint's request, a webhook's payload. */
export function payloadTypeOf(doc, input) {
  if (input.event) return doc.catalog.events[input.event]?.payload ?? null;
  if (input.call)
    return doc.catalog.endpoints[input.call]?.request ?? doc.catalog.webhooks[input.call]?.payload ?? null;
  return null;
}

/** An input as the panel names it: an event's name, a call's method and path (or webhook's name), a wait. */
export function inputLabel(doc, input, t) {
  if (input.event) return doc.catalog.events[input.event]?.name ?? input.event;
  if (input.call) {
    const endpoint = doc.catalog.endpoints[input.call];
    return endpoint ? `${endpoint.method} ${endpoint.path}` : (doc.catalog.webhooks[input.call]?.name ?? input.call);
  }
  return input.wait === "next" ?
      t("simulate:time.next")
    : t("simulate:time.later", { span: durationText(input.wait, t) });
}

const DURATION_PARTS = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const DURATION_UNITS = ["year", "month", "week", "day", "hour", "minute", "second"];

/** An ISO 8601 duration in words of the interface language: "2 days", "1 hour 30 minutes"; as written if unread. */
export function durationText(iso, t) {
  const match = DURATION_PARTS.exec(iso);
  if (!match) return iso;
  const parts = DURATION_UNITS.flatMap((unit, index) => {
    const count = Number(match[index + 1] ?? 0);
    return count ? [t(`simulate:time.units.${unit}`, { count })] : [];
  });
  return parts.join(" ") || t("simulate:time.units.second", { count: 0 });
}

/**
 * What a wait of any length is, from what was typed: a duration ("2 days", PT90M) or a moment after the clock
 * (`2026-01-20 09:00`).
 * @returns {{ wait: string, until?: string } | null}
 */
export function waitOf(text, clock) {
  const duration = parseDuration(text);
  if (duration) return { wait: duration };
  const until = parseInstant(text);
  if (!until || Date.parse(until) <= Date.parse(clock)) return null;
  return { wait: durationUntil(clock, until), until };
}

/** The leaf paths of a session: the states (or tokens) nothing else is active inside. */
const leavesOf = session => reachedOf(session).active;

/**
 * A step's line (spec §6.2: "one line per step (input and outcome)"): what was done, and where it led — the states or
 * nodes it reached, how the run ended, or that nothing happened.
 * @returns {{ input: string, outcome: string }}
 */
export function stepLine(doc, top, before, point, t) {
  const input = point.do ? inputLabel(doc, point.do, t) : t("simulate:steps.start");
  const had = new Set(before ? leavesOf(before.session) : []);
  const reached = [...new Set(leavesOf(point.session).filter(path => !had.has(path)))];
  if (point.session.ended && point.session.ended !== before?.session.ended) {
    return { input, outcome: t(`simulate:moves.ends.${point.session.ended}`) };
  }
  if (reached.length) return { input, outcome: `→ ${reached.map(path => pathName(doc, top, path, t)).join(", ")}` };
  if (point.do?.wait !== undefined) {
    const fired = point.trace
      .filter(entry => entry.type === "timerFired")
      .map(entry => doc.catalog.timers[entry.timer]?.name ?? entry.timer);
    const names = [...new Set(fired)].join(", ");
    return { input, outcome: names ? t("simulate:steps.fired", { names }) : t("simulate:steps.nothingDue") };
  }
  if (point.trace.some(entry => entry.type === "nothing")) return { input, outcome: t("simulate:steps.nothing") };
  return { input, outcome: t("simulate:steps.stays") };
}

/** An answer given, as the question offered it: the condition chosen, "neither", "it worked", a count. */
function answerWords(doc, top, { kind, at, value }, t) {
  if (kind === "outcome") return t(value === "ok" ? "simulate:question.worked" : "simulate:question.failed");
  if (kind === "branch") return t(value ? "simulate:question.yes" : "simulate:question.no");
  if (kind === "count") return String(value);
  if (value === null) return t("simulate:trace.neither");
  const edge = locate(doc, top, at)?.at(-1);
  const found = edge && doc.canvases[edge.canvas]?.edges[value];
  if (!found) return String(value);
  if (found.else) return t("simulate:question.otherwise");
  if (found.kind === "default") return t("simulate:question.default");
  if (found.kind === "case") return JSON.stringify(found.case);
  const guard = found.guard?.guard ? doc.catalog.guards[found.guard.guard]?.name : found.guard?.text;
  const to = nodeName(doc, edge.canvas, found.to, t);
  return guard ? `${guard} → ${to}` : `→ ${to}`;
}

/**
 * An answer a step was taken with, after the question it answers (simulator spec §7.1: "Which condition holds? full
 * amount."): "Which condition holds in paying_out? full amount → completed".
 */
export function answerLine(doc, top, answer, t) {
  const question = t(`simulate:question.${answer.kind}`, { name: pathName(doc, top, answer.at, t) });
  return `${question} ${answerWords(doc, top, answer, t)}`;
}

/** Several things in the interface's language: "a, b and c" (English without the serial comma, as Core's page). */
const listText = (items, language) =>
  new Intl.ListFormat(language === "en" ? "en-GB" : language, { type: "conjunction" }).format(items);

/** The names of the timers or events of a trace's entries of one type, each once, in order. */
const namesIn = (trace, type, key, collection) => [
  ...new Set(trace.filter(entry => entry.type === type).map(entry => collection[entry[key]]?.name ?? entry[key]))
];

/**
 * What a frame of the stage did, in a sentence of the interface's language, for a step without a caption (simulator
 * spec §7.1): where the run went — moves that follow each other as one — the timers that fell due or were cancelled,
 * the events it raised and how it ended; the start says where the run starts (a flow: where it waits). The input is
 * shown beside it. "running → paused. timer.expiry cancelled."
 * @param {object} frame A frame of the run (Core's `frameOf`).
 */
export function sentenceOf(doc, top, frame, t, language) {
  const name = path => pathName(doc, top, path, t);
  const list = items => listText(items, language);
  const parts = [];
  if (frame.step === 0) {
    const places = [...new Set(frame.active.map(name))];
    const flow = doc.canvases[top]?.kind === "flow";
    if (places.length) parts.push(t(flow ? "simulate:stage.waits" : "simulate:stage.starts", { places: list(places) }));
  } else {
    const chains = [];
    for (const item of frame.taken.filter(taken => !taken.initial)) {
      const chain = chains.at(-1);
      if (chain?.at(-1) === item.from) chain.push(item.to);
      else chains.push([item.from, item.to]);
    }
    if (chains.length) {
      parts.push(t("simulate:stage.moves", { moves: list(chains.map(chain => chain.map(name).join(" → "))) }));
    }
  }
  const due = namesIn(frame.trace, "timerFired", "timer", doc.catalog.timers);
  if (due.length) parts.push(t("simulate:stage.due", { timers: list(due), count: due.length }));
  const cancelled = namesIn(frame.trace, "timerCancelled", "timer", doc.catalog.timers);
  if (cancelled.length) parts.push(t("simulate:stage.cancelled", { timers: list(cancelled), count: cancelled.length }));
  const raised = namesIn(frame.trace, "emitted", "event", doc.catalog.events);
  if (raised.length) parts.push(t("simulate:stage.raises", { events: list(raised) }));
  if (frame.ended) parts.push(t(`simulate:stage.ended.${frame.ended}`));
  if (parts.length) return parts.join(" ");
  return t(frame.do?.wait === undefined ? "simulate:stage.nothing" : "simulate:stage.nothingDue");
}

/** A value of the trace as data: JSON, short. */
const data = value => (value === undefined ? "" : JSON.stringify(value));

/**
 * A micro-event of a step in words (spec §5.5, §6.2), or null for what the line already says (the input received).
 * @returns {{ text: string, warning?: true } | null}
 */
export function traceLine(doc, top, entry, t) {
  const name = path => pathName(doc, top, path, t);
  const timer = id => doc.catalog.timers[id]?.name ?? id;
  const event = id => doc.catalog.events[id]?.name ?? id;
  switch (entry.type) {
    case "received":
      return null;
    case "transition": {
      const text = t("simulate:trace.transition", { from: name(entry.from), to: name(entry.to) });
      const sender = senderOf(doc, entry.edge);
      return { text: sender ? t("simulate:trace.sentBy", { move: text, party: sender }) : text };
    }
    case "entered":
      return { text: t("simulate:trace.entered", { state: name(entry.state) }) };
    case "exited":
      return { text: t("simulate:trace.exited", { state: name(entry.state) }) };
    case "restored":
      return { text: t("simulate:trace.restored", { state: name(entry.state) }) };
    case "action":
      return {
        text:
          entry.action && doc.catalog.actions[entry.action]?.party ?
            t("simulate:trace.actionFor", {
              action: doc.catalog.actions[entry.action].name,
              party:
                doc.catalog.parties[doc.catalog.actions[entry.action].party]?.name ??
                doc.catalog.actions[entry.action].party
            })
          : entry.action ?
            t("simulate:trace.action", { action: doc.catalog.actions[entry.action]?.name ?? entry.action })
          : entry.webhook ?
            t("simulate:trace.webhook", { webhook: doc.catalog.webhooks[entry.webhook]?.name ?? entry.webhook })
          : t(entry.party ? "simulate:trace.callBy" : "simulate:trace.call", {
              call:
                entry.endpoint ?
                  inputLabel(doc, { call: entry.endpoint }, t)
                : `${entry.request?.method ?? ""} ${entry.request?.url ?? ""}`.trim(),
              // Who performs it (mixed levels spec §4.4): its party, else its lane's.
              party: doc.catalog.parties[entry.party]?.name ?? entry.party
            })
      };
    case "emitted":
      return { text: t("simulate:trace.emitted", { event: event(entry.event) }) };
    case "assigned":
      return { text: t("simulate:trace.assigned", { path: entry.path, value: data(entry.value) }) };
    case "timerArmed":
      return { text: t("simulate:trace.armed", { timer: timer(entry.timer) }) };
    case "timerCancelled":
      return { text: t("simulate:trace.cancelled", { timer: timer(entry.timer) }) };
    case "timerFired":
      return { text: t("simulate:trace.fired", { timer: timer(entry.timer) }) };
    case "token":
      if (entry.change === "moved")
        return { text: t("simulate:trace.transition", { from: name(entry.from), to: name(entry.to) }) };
      if (entry.change === "forked") {
        return { text: t("simulate:trace.forked", { to: entry.to.map(name).join(", ") }) };
      }
      if (entry.change === "joined") return { text: t("simulate:trace.joined", { at: name(entry.at) }) };
      return {
        text: t(entry.outcome === "failure" ? "simulate:trace.endedFailure" : "simulate:trace.endedSuccess", {
          at: name(entry.at)
        })
      };
    case "answered":
      return { text: t("simulate:trace.answered", { answer: answerWords(doc, top, entry, t) }) };
    case "waited":
      return { text: t("simulate:trace.waited", { span: durationText(entry.wait, t) }) };
    case "nothing":
      return { text: t("simulate:trace.nothing") };
    case "warning":
      return { text: entry.message, warning: true };
    default:
      return { text: entry.type };
  }
}

/**
 * A step's micro-events in words, the same one said once with how many times it happened (spec §6.2: "quote_ttl fired
 * 192 times"), in the order each first happened.
 * @returns {Array<{ text: string, warning?: true, times: number }>}
 */
export function traceLines(doc, top, trace, t, depth = 0, lines = new Map()) {
  for (const entry of trace) {
    const line = traceLine(doc, top, entry, t);
    if (line) {
      const key = `${depth}${line.warning ? "!" : ""}${line.text}`;
      if (lines.has(key)) lines.get(key).times += 1;
      else lines.set(key, { ...line, times: 1, ...(depth ? { depth } : {}) });
    }
    // An action's flow run within the step: its lines under the action's (mixed levels spec §4.2).
    if (entry.steps) traceLines(doc, top, entry.steps, t, depth + 1, lines);
  }
  return [...lines.values()];
}

/** Who sent what moved a transition (mixed levels spec §4.1): its `by`, else its event's source; null when nobody. */
function senderOf(doc, edgeId) {
  const edge = Object.values(doc.canvases).find(canvas => canvas.edges[edgeId])?.edges[edgeId];
  const sourced = (edge?.on ?? [])
    .map(id => doc.catalog.events[id]?.source)
    .find(source => source && source !== "internal");
  const party = edge?.by ?? sourced;
  return party ? (doc.catalog.parties[party]?.name ?? party) : null;
}

/** A question in plain words (spec §6.2, mockup 03: "Which condition holds in paying_out?"). */
export function questionText(question, t) {
  const name = question.state ?? question.choice ?? question.node;
  return t(`simulate:question.${question.kind}`, { name });
}

/** What a condition shows: its guard's name, else its words. */
const conditionOf = guard => guard?.name ?? guard?.text ?? null;

/**
 * One answer a question offers, in words: what it says, where it leads, and the condition's description.
 * @returns {{ label: string, to: string | null, mono?: true, description?: string }}
 */
export function answerText(question, candidate, t) {
  const to = candidate.to ?? null;
  switch (question.kind) {
    case "transition":
    case "choice":
      if (candidate.value === null)
        return { label: t("simulate:question.neither", { name: question.state }), to: null };
      if (candidate.else) return { label: t("simulate:question.otherwise"), to };
      return {
        label: conditionOf(candidate.guard) ?? candidate.name ?? t("simulate:question.unconditioned"),
        to,
        ...(candidate.guard?.description ? { description: candidate.guard.description } : {})
      };
    case "branch":
      return { label: t(candidate.value ? "simulate:question.yes" : "simulate:question.no"), to };
    case "case":
      return candidate.default ?
          { label: t("simulate:question.default"), to }
        : { label: JSON.stringify(candidate.case), to, mono: true };
    case "outcome":
      return { label: t(candidate.value === "ok" ? "simulate:question.worked" : "simulate:question.failed"), to };
    default:
      return { label: String(candidate.value), to };
  }
}

/** Why the engine asks (spec §5.4, §5.7): no expression to work it out, or one that could not be. */
export function whyAsked(question, trace, t) {
  if (question.kind === "outcome") return t("simulate:question.why.outcome");
  if (question.kind === "count") return t("simulate:question.why.count");
  if (question.kind === "case") return t("simulate:question.why.case");
  const failed = trace.some(entry => entry.type === "warning" && entry.code === "unevaluated");
  return t(failed ? "simulate:question.why.failed" : "simulate:question.why.unwritten");
}

/**
 * How a step that replays a recording now goes elsewhere (spec §6.4: "Recorded: paused · Now: running").
 * @param {object} point The step as it is now.
 * @param {object} kept Its recording.
 */
export function divergedText(doc, top, point, kept, t) {
  if (point.reason === "question") return t("simulate:diverged.question");
  if (point.reason === "answers") return t("simulate:diverged.answers");
  const now = reachedOf(point.session);
  const was = kept.reached ?? { active: [] };
  const say = (reached, other) => {
    const only = reached.active.filter(path => !other.active.includes(path));
    const names = only.map(path => pathName(doc, top, path, t));
    if (reached.ended && reached.ended !== other.ended) names.push(t(`simulate:diverged.ended.${reached.ended}`));
    return names.join(", ") || t("simulate:diverged.same");
  };
  return t("simulate:diverged.reached", { recorded: say(was, now), now: say(now, was) });
}
