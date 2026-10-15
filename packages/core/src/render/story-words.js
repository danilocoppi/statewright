// The words of a scenario page (simulator spec §7.2): English, as every exported artefact is (the Editor's export
// rule), with names, captions and descriptions as the document writes them.
import { locate } from "../simulate/places.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNITS = ["year", "month", "week", "day", "hour", "minute", "second"];
const DURATION = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const ENDINGS = { done: "The run is done.", success: "The run ends in success.", failure: "The run ends in failure." };

/** An instant in UTC, as the page says it: "Wed 7 Jan 2026, 09:00" (seconds only when there are some). */
export function clockWords(iso) {
  const date = new Date(iso);
  const time = iso.slice(11, 19);
  const day = `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return `${day} ${iso.slice(0, 4)}, ${time.endsWith(":00") ? time.slice(0, 5) : time}`;
}

/** An ISO 8601 duration in words: "2 days", "1 hour 30 minutes"; as written when it cannot be read. */
export function durationWords(iso) {
  const match = DURATION.exec(iso);
  if (!match) return iso;
  const parts = UNITS.flatMap((unit, index) => {
    const count = Number(match[index + 1] ?? 0);
    return count ? [`${count} ${unit}${count === 1 ? "" : "s"}`] : [];
  });
  return parts.join(" ") || "0 seconds";
}

/** Several things in words: "a", "a and b", "a, b and c". */
export const listWords = items =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** The name of the node at the end of a run's path: its label or name, else its kind; the path when it is gone. */
export function pathWords(doc, top, path) {
  const place = locate(doc, top, path)?.at(-1);
  const node = place && doc.canvases[place.canvas].nodes[place.node];
  return node ? (node.label ?? node.name ?? node.kind) : path;
}

/** An input as the page names it: the event, the call (an endpoint's method and path), or the time that passes. */
export function inputWords(doc, input) {
  if (!input) return "Start";
  if (input.event) return doc.catalog.events[input.event]?.name ?? input.event;
  if (input.call) {
    const endpoint = doc.catalog.endpoints[input.call];
    return endpoint ? `${endpoint.method} ${endpoint.path}` : (doc.catalog.webhooks[input.call]?.name ?? input.call);
  }
  return input.wait === "next" ? "Until the next timer" : `${durationWords(input.wait)} later`;
}

/** What a question asked, by its kind, about the node at `at`. */
const QUESTIONS = {
  transition: name => `Which condition holds in ${name}?`,
  choice: name => `Which way does ${name} go?`,
  branch: name => `Does the condition of ${name} hold?`,
  case: name => `Which case does ${name} take?`,
  outcome: name => `Did ${name} work?`,
  count: name => `How many items does ${name} go through?`
};

/** The answer itself: the condition chosen and where it leads, neither, yes or no, a case, it worked, a count. */
function chosenWords(doc, top, { kind, at, value }) {
  if (kind === "outcome") return value === "ok" ? "It worked." : "It failed.";
  if (kind === "branch") return value ? "Yes." : "No.";
  if (kind === "count") return `${value}.`;
  if (value === null) return "Neither.";
  const place = locate(doc, top, at)?.at(-1);
  const edge = place && doc.canvases[place.canvas].edges[value];
  if (!edge) return `${value}.`;
  if (edge.else) return "Otherwise.";
  if (edge.kind === "default") return "Default.";
  if (edge.kind === "case") return `${JSON.stringify(edge.case)}.`;
  const guard = edge.guard?.guard ? doc.catalog.guards[edge.guard.guard]?.name : edge.guard?.text;
  const to = pathWords(doc, top, at.split("/").slice(0, -1).concat(edge.to).join("/"));
  return guard ? `${guard} → ${to}.` : `→ ${to}.`;
}

/** A question the engine asked, in words: "Which condition holds in paying_out?" */
export const questionWords = (doc, top, { kind, at }) => QUESTIONS[kind]?.(pathWords(doc, top, at)) ?? `${kind}?`;

/**
 * An answer given while a step was taken, with the question it answers (simulator spec §7.1: "Which condition holds?
 * full amount."): "Which condition holds in paying_out? full amount → completed."
 */
export function answerWords(doc, top, answer) {
  return `${questionWords(doc, top, answer)} ${chosenWords(doc, top, answer)}`;
}

/** The names of the timers or events of a trace's entries of one type, each once, in order. */
const namesOf = (trace, type, key, collection) => [
  ...new Set(trace.filter(entry => entry.type === type).map(entry => collection[entry[key]]?.name ?? entry[key]))
];

/** A trace with the entries of the actions' flows run within it, in order (mixed levels spec §4.2). */
const withSteps = trace => trace.flatMap(entry => [entry, ...withSteps(entry.steps ?? [])]);

/**
 * Who took part in a frame (mixed levels spec §4.1): the party that sent what moved each transition it took — its
 * `by`, else its event's source — and the party that receives each action it ran. "Customer sends order.pay."
 */
function rolesOf(doc, top, frame) {
  const party = id => doc.catalog.parties[id]?.name ?? id;
  const said = [];
  for (const item of frame.taken.filter(taken => !taken.initial)) {
    const edge = doc.canvases[item.canvas]?.edges[item.edge];
    const events = (edge?.on ?? []).filter(id => doc.catalog.events[id]);
    const sourced = events.find(id => ![undefined, "internal"].includes(doc.catalog.events[id].source));
    const sender = edge?.by ?? (sourced && doc.catalog.events[sourced].source);
    const event = edge?.by ? events[0] : sourced;
    if (sender && event) said.push(`${party(sender)} sends ${doc.catalog.events[event].name}.`);
  }
  for (const entry of withSteps(frame.trace)) {
    const action = entry.type === "action" && doc.catalog.actions[entry.action];
    if (action?.party) said.push(`${party(action.party)} receives ${action.name}.`);
  }
  return [...new Set(said)];
}

/**
 * What a frame did, in a sentence, for a step without a caption (simulator spec §7.1): where the run went, the timers
 * that fell due or were cancelled, the events it raised and how it ended — the input itself is shown beside it.
 * "running → paused. timer.expiry cancelled." The start says where the run starts (a flow: where it waits).
 * @param {any} doc
 * @param {string} top
 * @param {import("../simulate/story.js").Frame & { trace: object[] }} frame
 */
export function sentenceOf(doc, top, frame) {
  const name = path => pathWords(doc, top, path);
  const parts = [];
  if (frame.step === 0) {
    // A flow's tokens are left where they wait.
    const places = [...new Set(frame.active.map(name))];
    const flow = doc.canvases[top].kind === "flow";
    if (places.length) parts.push(`${flow ? "Waits at" : "Starts in"} ${listWords(places)}.`);
  } else {
    // Moves that follow each other read as one: "the bank confirms → all paid? → some to review".
    const chains = [];
    for (const item of frame.taken.filter(taken => !taken.initial)) {
      const chain = chains.at(-1);
      if (chain?.at(-1) === item.from) chain.push(item.to);
      else chains.push([item.from, item.to]);
    }
    if (chains.length) parts.push(`${listWords(chains.map(chain => chain.map(name).join(" → ")))}.`);
  }
  parts.push(...rolesOf(doc, top, frame));
  const fired = namesOf(frame.trace, "timerFired", "timer", doc.catalog.timers);
  if (fired.length) parts.push(`${listWords(fired)} ${fired.length === 1 ? "falls" : "fall"} due.`);
  const cancelled = namesOf(frame.trace, "timerCancelled", "timer", doc.catalog.timers);
  if (cancelled.length) parts.push(`${listWords(cancelled)} cancelled.`);
  const raised = namesOf(withSteps(frame.trace), "emitted", "event", doc.catalog.events);
  if (raised.length) parts.push(`Raises ${listWords(raised)}.`);
  if (frame.ended) parts.push(ENDINGS[frame.ended]);
  if (parts.length) return parts.join(" ");
  return frame.do?.wait === undefined ? "Nothing happens." : "Nothing is due.";
}

/** Why the story stops before its end, in a sentence. */
export function stoppedWords(doc, top, stopped) {
  const reason =
    stopped.question ?
      `it now asks “${questionWords(doc, top, stopped.question)}”, which the recording does not answer.`
    : stopped.message.replace(/\.?$/, ".");
  return stopped.step === 0 ?
      `The design can no longer start this scenario: ${reason}`
    : `The design no longer takes step ${stopped.step}: ${reason}`;
}
