import i18n from "../i18n.js";

import { frameOf, moves, start, step, storyOf } from "statewright/simulate";
import { describe, expect, it } from "vitest";

import ptSimulate from "@/i18n/locales/pt-BR/simulate.json";
import {
  activeSince,
  answerLine,
  answerText,
  clockText,
  durationText,
  durationUntil,
  elementOf,
  inputLabel,
  nowRows,
  outcomeOf,
  payloadTypeOf,
  questionText,
  sentenceOf,
  spanText,
  stepLine,
  traceLines,
  waitOf,
  whyAsked
} from "@/simulate/words";

import { readExample } from "../fixtures.js";

const t = i18n.t.bind(i18n);
const AT = "2026-01-05T09:00:00Z";

describe("what the panel says about a run (simulator spec §6.2)", () => {
  it("says the clock in the interface language, in UTC, with seconds only when there are some", () => {
    expect(clockText("2026-01-07T09:00:00Z", "en")).toBe("Wed 7 Jan 2026, 09:00");
    expect(clockText("2026-01-07T09:00:30Z", "en")).toBe("Wed 7 Jan 2026, 09:00:30");
    expect(clockText("2026-01-07T09:00:00Z", "pt-BR")).toBe("qua 7 jan 2026, 09:00");
    expect(clockText("2026-01-07T09:00:00Z", "es")).toBe("mié 7 ene 2026, 09:00");
  });

  it("names each active state with the region it is in", () => {
    const doc = readExample("payments");
    const { session } = start(doc, { canvas: "cnv_lifecycle", at: AT });
    expect(nowRows(doc, "cnv_lifecycle", session, t).map(row => [row.name, row.where])).toEqual([
      ["clear", "Compliance hold"],
      ["running", "Expiry clock"],
      ["awaiting_funds", "Phase"]
    ]);
  });

  it("names a flow's tokens with the nodes that hold them and what they do there", () => {
    const doc = readExample("payout-batch");
    const input = { payouts: [{ amount: 1, id: "pay_1", rail: "pix" }] };
    const answers = [{ kind: "outcome", at: "nod_each/nod_pix", value: "ok" }];
    const { session } = start(doc, { canvas: "cnv_payOutBatch", at: AT, input, answers });
    expect(nowRows(doc, "cnv_payOutBatch", session, t).map(row => [row.name, row.where])).toEqual([
      ["the bank confirms", "waiting"]
    ]);
    const asked = start(doc, { canvas: "cnv_payOutBatch", at: AT, input });
    expect(asked.status).toBe("needs");
  });

  it("finds since when a state has been active, and the element an engine error names", () => {
    const points = [["a"], ["a", "b"], ["b"], ["b"]].map(active => ({ session: { active } }));
    expect(activeSince(points, 3, "b")).toBe(1);
    expect(activeSince(points, 0, "a")).toBe(0);
    expect(elementOf({ path: "nod_each/nod_pix" })).toBe("nod_pix");
    expect(elementOf({ from: "nod_a", to: "nod_b" })).toBe("nod_a");
    expect(elementOf({ canvas: "cnv_x" })).toBe("cnv_x");
    expect(elementOf(undefined)).toBeNull();
  });

  it("says where each move leads: the states it reaches, a question with its ways, a state it stays in", () => {
    const doc = readExample("payments");
    const { session } = start(doc, { canvas: "cnv_lifecycle", at: AT });
    const listed = moves(doc, session);
    const said = label =>
      outcomeOf(
        doc,
        "cnv_lifecycle",
        listed.find(move => move.label === label),
        t
      );
    expect(said("verify.started")).toEqual({ kind: "to", names: ["paused"] });
    expect(said("quote_ttl")).toEqual({ kind: "stays", text: "stays" });
    const asks = { outcome: { asks: { candidates: [{ value: "a" }, { value: "b" }, { value: null }] } } };
    expect(outcomeOf(doc, "cnv_lifecycle", asks, t)).toEqual({ kind: "asks", text: "asks · 2 ways" });
    expect(outcomeOf(doc, "cnv_lifecycle", { outcome: { error: "livelock" } }, t)).toEqual({
      kind: "error",
      text: "cannot be taken"
    });
    expect(outcomeOf(doc, "cnv_lifecycle", { outcome: { to: [], ended: "success" } }, t).text).toBe(
      "→ ends in success"
    );
  });

  it("says spans of time short, durations in words, and the wait up to a moment", () => {
    expect(spanText(10 * 86_400)).toBe("10 d");
    expect(spanText(9 * 86_400 + 23 * 3_600 + 59)).toBe("9 d 23 h");
    expect(spanText(15 * 60)).toBe("15 min");
    expect(durationText("P2D", t)).toBe("2 days");
    expect(durationText("PT1H30M", t)).toBe("1 hour 30 minutes");
    expect(durationUntil("2026-01-05T09:00:00Z", "2026-01-08T12:00:00Z")).toBe("P3DT3H");
    expect(waitOf("2 days", AT)).toEqual({ wait: "P2D" });
    expect(waitOf("2026-01-08 12:00", AT)).toEqual({ wait: "P3DT3H", until: "2026-01-08T12:00:00Z" });
    expect(waitOf("2026-01-01 12:00", AT)).toBeNull();
    expect(waitOf("soon", AT)).toBeNull();
  });

  it("names inputs as the panel shows them, and finds the type of what they carry", () => {
    const doc = readExample("payments");
    expect(inputLabel(doc, { event: "evt_opsFail" }, t)).toBe("ops.fail");
    expect(inputLabel(doc, { call: "ept_createPayment" }, t)).toBe("POST /payments");
    expect(inputLabel(doc, { wait: "P2D" }, t)).toBe("2 days later");
    expect(inputLabel(doc, { wait: "next" }, t)).toBe("Until the next timer");
    expect(payloadTypeOf(doc, { event: "evt_opsFail" })).toBe("typ_failure");
    expect(payloadTypeOf(doc, { event: "evt_verifyStarted" })).toBeNull();
    expect(payloadTypeOf(doc, { wait: "P1D" })).toBeNull();
  });

  it("says a step in one line: what was done and where it led", () => {
    const doc = readExample("payments");
    const begun = start(doc, { canvas: "cnv_lifecycle", at: AT });
    const after = (point, input) => {
      const result = step(doc, point.session, { do: input });
      return { do: input, answers: [], session: result.session, trace: result.trace };
    };
    const first = { do: null, answers: [], session: begun.session, trace: begun.trace };
    const paused = after(first, { event: "evt_verifyStarted" });
    expect(stepLine(doc, "cnv_lifecycle", first, paused, t)).toEqual({ input: "verify.started", outcome: "→ paused" });
    const waited = after(paused, { wait: "PT10M" });
    expect(stepLine(doc, "cnv_lifecycle", paused, waited, t)).toEqual({
      input: "10 minutes later",
      outcome: "· nothing due"
    });
    const nothing = after(waited, { event: "evt_opsFail" });
    expect(stepLine(doc, "cnv_lifecycle", waited, nothing, t).outcome).toBe("· nothing happened");
  });

  it("says each micro-event once, with how many times it happened, warnings apart", () => {
    const doc = readExample("payments");
    const fired = { type: "timerFired", timer: "tmr_quoteTtl", state: "nod_sendCrossBorder/nod_awaitingFunds" };
    const lines = traceLines(
      doc,
      "cnv_lifecycle",
      [
        { type: "received", event: "evt_x" },
        fired,
        fired,
        fired,
        { type: "warning", code: "sla", message: "awaiting_funds is still active past its SLA" },
        { type: "assigned", path: "context.expiresAt", value: "2026-01-20T09:00:00Z" }
      ],
      t
    );
    expect(lines).toEqual([
      { text: "quote_ttl falls due", times: 3 },
      { text: "awaiting_funds is still active past its SLA", warning: true, times: 1 },
      { text: 'context.expiresAt = "2026-01-20T09:00:00Z"', times: 1 }
    ]);
  });

  it("puts each question in plain words, with its answers and why it was asked", () => {
    const transition = {
      kind: "transition",
      at: "nod_sendCrossBorder/nod_payingOut",
      state: "paying_out",
      candidates: [
        { value: "edg_a", to: "completed", guard: { text: "full amount" } },
        { value: "edg_b", to: "partially_completed", guard: { name: "Scaled payout", description: "Reduced." } },
        { value: null }
      ]
    };
    expect(questionText(transition, t)).toBe("Which condition holds in paying_out?");
    expect(transition.candidates.map(candidate => answerText(transition, candidate, t))).toEqual([
      { label: "full amount", to: "completed" },
      { label: "Scaled payout", to: "partially_completed", description: "Reduced." },
      { label: "Neither · stays in paying_out", to: null }
    ]);
    expect(whyAsked(transition, [], t)).toBe("Asked because these conditions have no expression.");
    expect(whyAsked(transition, [{ type: "warning", code: "unevaluated" }], t)).toBe(
      "Asked because a condition could not be worked out."
    );
    const outcome = { kind: "outcome", node: "send a Pix", candidates: [{ value: "ok", to: "paid" }] };
    expect(questionText(outcome, t)).toBe("Did send a Pix work?");
    expect(answerText(outcome, outcome.candidates[0], t)).toEqual({ label: "It worked", to: "paid" });
    const switching = { kind: "case", node: "which rail?" };
    expect(answerText(switching, { value: "edg_pix", to: "send a Pix", case: "pix" }, t)).toEqual({
      label: '"pix"',
      to: "send a Pix",
      mono: true
    });
    expect(answerText(switching, { value: "edg_other", to: "review", default: true }, t).label).toBe("Default");
  });
});

describe("what the stage says about a step (simulator spec §7.1)", () => {
  /** The frames of a scenario of an example, its captions left out. */
  function frames(name, id) {
    const doc = readExample(name);
    const scenario = doc.annotations.scenarios[id];
    return { doc, top: scenario.canvas, frames: storyOf(doc, scenario).frames };
  }

  it("says what a step did when it has no caption: where the run went, its timers, how it ended", () => {
    const { doc, top, frames: told } = frames("payments", "scn_verificationPausesTheClock");
    expect(told.map(frame => sentenceOf(doc, top, frame, t, "en"))).toEqual([
      "Starts in clear, running and awaiting_funds.",
      "running → paused. timer.expiry cancelled.",
      "awaiting_funds → awaiting_funds. quote_ttl falls due.",
      "paused → running."
    ]);
    const batch = frames("payout-batch", "scn_aPayoutIsRefused");
    expect(batch.frames.map(frame => sentenceOf(batch.doc, batch.top, frame, t, "en"))).toEqual([
      "Waits at the bank confirms. Raises batch.paid.",
      "the bank confirms → all paid? → some to review. confirmation window cancelled. The run ends in failure."
    ]);
  });

  it("says it in the interface's language, names as the document writes them", () => {
    i18n.addResourceBundle("pt-BR", "simulate", ptSimulate);
    const pt = i18n.getFixedT("pt-BR");
    const { doc, top, frames: told } = frames("payments", "scn_verificationPausesTheClock");
    expect(told.map(frame => sentenceOf(doc, top, frame, pt, "pt-BR"))).toEqual([
      "Começa em clear, running e awaiting_funds.",
      "running → paused. timer.expiry é cancelado.",
      "awaiting_funds → awaiting_funds. quote_ttl vence.",
      "paused → running."
    ]);
  });

  it("says when nothing happened, or nothing fell due", () => {
    const doc = readExample("payments");
    const begun = start(doc, { canvas: "cnv_lifecycle", at: AT });
    const point = input => ({ step: 1, do: input, ...step(doc, begun.session, { do: input }) });
    const frame = input => frameOf(doc, "cnv_lifecycle", point(input), "cnv_lifecycle");
    expect(sentenceOf(doc, "cnv_lifecycle", frame({ event: "evt_verifyEnded" }), t, "en")).toBe("Nothing happens.");
    expect(sentenceOf(doc, "cnv_lifecycle", frame({ wait: "PT1M" }), t, "en")).toBe("Nothing is due.");
  });

  it("puts each answer after the question it answers", () => {
    const doc = readExample("payments");
    const [, , , , paid] = storyOf(doc, doc.annotations.scenarios.scn_paysInTime).frames;
    expect(paid.answers.map(answer => answerLine(doc, "cnv_lifecycle", answer, t))).toEqual([
      "Which condition holds in paying_out? full amount → completed"
    ]);
  });
});
