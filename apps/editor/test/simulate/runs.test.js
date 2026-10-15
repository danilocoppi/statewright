import { applyBatch, check } from "statewright";
import { replay } from "statewright/simulate";
import { describe, expect, it } from "vitest";

import {
  IDLE,
  acceptAt,
  accepted,
  answer,
  back,
  begin,
  captioned,
  continueFrom,
  follow,
  followTo,
  hasNext,
  hasUnsaved,
  next,
  opening,
  presented,
  restart,
  saved,
  scenarioOf,
  show,
  shownPoint,
  stopFollowing,
  take
} from "@/simulate/runs";

import { readExample } from "../fixtures.js";

const AT = "2026-01-05T09:00:00Z";
const INIT = { at: AT, context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };
const event = id => ({ event: id });
const leaves = state => shownPoint(state).session.active.filter(path => path.includes("/"));

/** The payments lifecycle, started with its expiry deadline. */
function lifecycle(doc = readExample("payments")) {
  return { doc, state: begin(doc, opening("cnv_lifecycle"), INIT) };
}

describe("a run in the panel (simulator spec §6.2)", () => {
  it("starts at each region's initial state, as a first point with its own trace", () => {
    const { state } = lifecycle();
    expect(state.mode).toBe("run");
    expect(state.points).toHaveLength(1);
    expect(state.points[0]).toMatchObject({ do: null, answers: [] });
    expect(leaves(state)).toEqual([
      "nod_complianceHold/nod_clear",
      "nod_expiryClock/nod_running",
      "nod_sendCrossBorder/nod_awaitingFunds"
    ]);
    expect(state.points[0].trace.some(entry => entry.type === "timerArmed")).toBe(true);
  });

  it("reaches completed in Cross-border send through the questions it asks, then lets the expiry clock run out (§2)", () => {
    const { doc, state: begun } = lifecycle();
    let state = take(doc, begun, event("evt_payinConfirmed"));
    state = take(doc, state, event("evt_legCompleted"));
    expect(state.asking.question).toMatchObject({ kind: "transition", at: "nod_sendCrossBorder/nod_converting" });
    expect(state.points).toHaveLength(2);
    state = answer(doc, state, "edg_convertingPayingOut");
    state = take(doc, state, event("evt_payoutCompleted"));
    expect(state.asking.question.candidates.map(candidate => candidate.value)).toEqual([
      "edg_payingOutCompleted",
      "edg_payingOutPartiallyCompleted",
      null
    ]);
    state = answer(doc, state, "edg_payingOutCompleted");
    expect(state.asking).toBeNull();
    expect(leaves(state)).toContain("nod_sendCrossBorder/nod_completed");
    expect(state.points.at(-1).answers).toEqual([
      { kind: "transition", at: "nod_sendCrossBorder/nod_payingOut", value: "edg_payingOutCompleted" }
    ]);
    state = take(doc, state, { wait: "next" });
    expect(leaves(state)).toContain("nod_expiryClock/nod_elapsed");
    expect(state.points).toHaveLength(5);
  });

  it("goes back one step, and first leaves a question unanswered", () => {
    const { doc, state: begun } = lifecycle();
    let state = take(doc, begun, event("evt_payinConfirmed"));
    state = take(doc, state, event("evt_legCompleted"));
    state = back(state);
    expect(state.asking).toBeNull();
    expect(state.points).toHaveLength(2);
    state = back(state);
    expect(state.points).toHaveLength(1);
    expect(back(state)).toBe(state);
  });

  it("shows the run at an earlier step, and continues from there without the later steps", () => {
    const { doc, state: begun } = lifecycle();
    let state = take(doc, begun, event("evt_verifyStarted"));
    state = take(doc, state, { wait: "P2D" });
    state = take(doc, state, event("evt_verifyEnded"));
    state = show(state, 1);
    expect(leaves(state)).toContain("nod_expiryClock/nod_paused");
    expect(show(state, 3).shown).toBeNull();
    state = continueFrom(state);
    expect(state.points).toHaveLength(2);
    expect(state.shown).toBeNull();
  });

  it("keeps the run where it was when an input cannot be taken, and says why", () => {
    const { doc, state: begun } = lifecycle();
    const state = take(doc, begun, event("evt_gone"));
    expect(state.points).toHaveLength(1);
    expect(state.failure).toMatchObject({ code: "dangling", message: "There is no event evt_gone" });
  });

  it("goes back to the Start panel when a question asked while starting is left, after starting over too", () => {
    const doc = readExample("payout-batch");
    let state = begin(doc, opening("cnv_payOutBatch"), { at: AT });
    expect(state).toMatchObject({ mode: "start", points: [] });
    expect(back(state)).toMatchObject({ mode: "start", asking: null });
    state = answer(doc, state, 0);
    state = restart(doc, state);
    expect(state.asking.question.kind).toBe("count");
    expect(back(state)).toMatchObject({ mode: "start", asking: null, points: [] });
  });

  it("starts again from the same values", () => {
    const { doc, state: begun } = lifecycle();
    const state = restart(doc, take(doc, begun, event("evt_verifyStarted")));
    expect(state.points).toHaveLength(1);
    expect(state.init).toEqual(INIT);
  });

  it("runs a flow with its input, asking whether each call worked", () => {
    const doc = readExample("payout-batch");
    const input = { payouts: [{ amount: 120, id: "pay_1", rail: "pix" }] };
    let state = begin(doc, opening("cnv_payOutBatch"), { at: AT, input });
    expect(state.asking.question).toMatchObject({ kind: "outcome", at: "nod_each/nod_pix" });
    state = answer(doc, state, "error");
    expect(state.points).toHaveLength(1);
    expect(state.points[0].answers).toEqual([{ kind: "outcome", at: "nod_each/nod_pix", value: "error" }]);
    expect(shownPoint(state).session.active).toEqual(["nod_confirm"]);
    state = take(doc, state, event("evt_bankConfirmed"));
    expect(shownPoint(state).session.ended).toBe("failure");
  });
});

describe("saved scenarios in the panel (simulator spec §6.4)", () => {
  it("follows a saved scenario one step at a time, each step the same as recorded", () => {
    const doc = readExample("payments");
    let state = follow(doc, IDLE, "scn_paysInTime");
    expect(state).toMatchObject({ mode: "run", canvas: "cnv_lifecycle", init: INIT });
    expect(state.points[0]).toMatchObject({ recorded: 0, status: "same" });
    while (hasNext(state)) state = next(doc, state);
    expect(state.points.map(point => point.status)).toEqual(["same", "same", "same", "same", "same"]);
    expect(state.points[1].caption).toBe("The payer's money is seen: the expiry clock stops.");
    expect(next(doc, state)).toBe(state);
    expect(hasUnsaved(state)).toBe(false);
  });

  it("shows where a scenario now goes elsewhere, and accepts the new path", () => {
    const doc = structuredClone(readExample("payments"));
    doc.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped";
    const state = followTo(doc, IDLE, "scn_verificationPausesTheClock", 3);
    expect(state.points).toHaveLength(4);
    expect(state.points[3]).toMatchObject({ status: "diverged", reason: "reached" });
    expect(hasNext(state)).toBe(false);
    const change = acceptAt(doc, state, 3);
    expect(change.dropped).toBe(0);
    expect(change.steps.at(-1).reached.active).toContain("nod_expiryClock/nod_stopped");
    const stored = applyBatch(doc, [
      { type: "scenario.update", args: { id: "scn_verificationPausesTheClock", set: { steps: change.steps } } }
    ]).doc;
    expect(replay(stored, stored.annotations.scenarios.scn_verificationPausesTheClock).first).toBeNull();
    const after = accepted(state, change);
    expect(after.points.map(point => point.status)).toEqual(["same", "same", "same", "same"]);
    expect(after.script.recorded).toHaveLength(4);
  });

  it("says how many later steps a new path drops when they can no longer be taken", () => {
    const doc = structuredClone(readExample("payments"));
    doc.canvases.cnv_crossBorderSend.edges.edg_awaitingFundsConverting.to = "nod_payingOut";
    const state = followTo(doc, IDLE, "scn_paysInTime", 2);
    expect(state.points[2]).toMatchObject({ status: "diverged", reason: "reached" });
    const change = acceptAt(doc, state, 2);
    expect(change.dropped).toBe(2);
    expect(change.steps).toHaveLength(2);
  });

  it("stops at a recorded step that can no longer be taken, which the new path drops with the steps after it", () => {
    const doc = structuredClone(readExample("payments"));
    doc.annotations.scenarios.scn_paysInTime.steps[2].do = { event: "evt_gone" };
    const state = followTo(doc, IDLE, "scn_paysInTime", 3);
    expect(state.points).toHaveLength(3);
    expect(state.failure).toMatchObject({ code: "dangling", replaying: { recorded: 3 } });
    expect(hasNext(state)).toBe(false);
    const change = acceptAt(doc, state, 3);
    expect(change.dropped).toBe(2);
    expect(change.steps).toHaveLength(2);
  });

  it("asks again when recorded answers no longer fit, and drops answers nothing asks for", () => {
    const doc = readExample("payments");
    const wrong = structuredClone(doc);
    wrong.annotations.scenarios.scn_paysInTime.steps[2].answers[0].value = "edg_gone";
    let state = followTo(wrong, IDLE, "scn_paysInTime", 3);
    expect(state.asking.question).toMatchObject({ at: "nod_sendCrossBorder/nod_converting" });
    state = answer(wrong, state, "edg_convertingPayingOut");
    expect(state.points[3]).toMatchObject({ status: "diverged", reason: "question" });

    const extra = structuredClone(doc);
    extra.annotations.scenarios.scn_paysInTime.steps[0].answers = [
      { kind: "transition", at: "nod_expiryClock/nod_running", value: "edg_x" }
    ];
    state = followTo(extra, IDLE, "scn_paysInTime", 1);
    expect(state.points[1]).toMatchObject({ status: "diverged", reason: "answers", answers: [] });
  });

  it("presents a scenario with every recorded step taken: from its start, or from the point a run shows", () => {
    const doc = readExample("payments");
    const loaded = presented(doc, IDLE, "scn_verificationPausesTheClock");
    expect(loaded).toMatchObject({ mode: "run", shown: 0, script: { following: true } });
    expect(loaded.points.map(point => point.status)).toEqual(["same", "same", "same", "same"]);

    const followed = next(doc, follow(doc, IDLE, "scn_verificationPausesTheClock"));
    const shown = presented(doc, followed, null);
    expect(shown.points).toHaveLength(4);
    expect(shown.shown).toBe(1);
    expect(presented(doc, show(shown, null), null).shown).toBeNull();
  });

  it("stops following where the person says, and goes on as their own run", () => {
    const doc = readExample("payments");
    let state = next(doc, follow(doc, IDLE, "scn_paysInTime"));
    state = stopFollowing(state);
    expect(hasNext(state)).toBe(false);
    state = take(doc, state, event("evt_holdOpened"));
    expect(hasUnsaved(state)).toBe(true);
  });

  it("saves a run as a scenario that replays the same, and keeps captions with their steps", () => {
    const { doc, state: begun } = lifecycle();
    let state = take(doc, begun, event("evt_verifyStarted"));
    state = take(doc, state, { wait: "P2D" });
    state = captioned(state, 1, "  The clock stops.  ").state;
    expect(hasUnsaved(state)).toBe(true);
    const scenario = scenarioOf(state, { name: "Paused", description: "" });
    expect(scenario).toEqual({
      name: "Paused",
      canvas: "cnv_lifecycle",
      start: INIT,
      steps: [
        { do: event("evt_verifyStarted"), caption: "The clock stops.", reached: expect.any(Object) },
        { do: { wait: "P2D" }, reached: expect.any(Object) }
      ]
    });
    const result = applyBatch(doc, [{ type: "scenario.add", args: { scenario } }]);
    expect(check(result.doc).filter(problem => problem.code === "scenario.diverged")).toEqual([]);
    state = saved(state, result.created[0], scenario);
    expect(hasUnsaved(state)).toBe(false);
    const { steps } = captioned(state, 2, "Two days pass.");
    expect(steps.map(item => item.caption)).toEqual(["The clock stops.", "Two days pass."]);
    expect(captioned(begun, 0, "x").steps).toBeNull();
  });
});
