import { describe, expect, it } from "vitest";
import { createRuntime } from "../../src/runtime/index.js";
import { warningsOf } from "../../src/runtime/warnings.js";
import { flowTieDoc, pickDoc, tieDoc, timedDoc } from "./fixtures.js";

const AT = "2026-01-09T19:00:00Z";
const DUE = "2026-01-09T20:00:00Z";
const timed = async () => (await createRuntime(timedDoc())).machine("timed.status");
const tie = async (guards, doc = tieDoc()) => (await createRuntime(doc, { guards })).machine("tie.status");
const both = { first: () => true, second: () => true };

/** In effect when the tie machine waits at AT, no longer when its timer t falls due at DUE. */
const LAPSED = { until: "2026-01-09T19:30:00Z" };

/** The tie machine, both guards holding: sent wait at AT, then t at DUE. */
async function waitedOut(doc) {
  const machine = await tie(both, doc);
  const { snapshot } = machine.start({ at: AT });
  const timedOne = machine.send(snapshot, { event: "wait", at: AT });
  return machine.send(timedOne.snapshot, { timer: "t", at: DUE });
}

/** A timed machine that has fired "due": it sits in due, its dueAt spent. */
async function atDue() {
  const machine = await timed();
  const { snapshot } = machine.start({ at: AT, context: { dueAt: DUE } });
  return { machine, due: machine.send(snapshot, { timer: "due", at: DUE }) };
}

describe("warnings on accepted results (W2)", () => {
  it("is an empty list when nothing was wrong", async () => {
    const result = (await timed()).start({ at: AT, context: { dueAt: DUE } });
    expect(result.warnings).toEqual([]);
  });

  it("reports a timer it could not arm because the context has no date, naming the state", async () => {
    const result = (await timed()).start({ at: AT, context: {} });
    expect(result.warnings).toStrictEqual([
      {
        code: "timerNotArmed",
        timer: "due",
        message: "due is not armed: context.dueAt holds no date",
        state: "waiting"
      }
    ]);
    expect(result.effects.timers.schedule).toEqual([]);
  });

  it("reports a timer whose context path holds a string that is not a date", async () => {
    const result = (await timed()).start({ at: AT, context: { dueAt: "tomorrow" } });
    expect(result.warnings.map(w => [w.code, w.state])).toEqual([["timerNotArmed", "waiting"]]);
  });

  it("reports a timer not armed on a send whose payload lacks the date", async () => {
    const { machine, due } = await atDue();
    expect(due.warnings).toEqual([]);
    const without = machine.send(due.snapshot, { event: "snooze", payload: {}, at: "2026-01-09T20:01:00Z" });
    expect(without.warnings.map(w => [w.code, w.timer, w.state])).toEqual([["timerNotArmed", "snooze", "snoozed"]]);
    const dated = machine.send(due.snapshot, {
      event: "snooze",
      payload: { until: "2026-01-09T21:00:00Z" },
      at: "2026-01-09T20:01:00Z"
    });
    expect(dated.warnings).toEqual([]);
  });

  it("names an interior state by its path; an assign on a top-level edge does not feed an interior's timer", async () => {
    const { machine, due } = await atDue();
    const held = machine.send(due.snapshot, {
      event: "hold",
      payload: { releaseAt: "2026-01-10T19:00:00Z" },
      at: "2026-01-09T20:02:00Z"
    });
    expect(held.state).toBe("holding/inside");
    expect(held.warnings.map(w => [w.code, w.timer, w.state])).toEqual([
      ["timerNotArmed", "release", "holding/inside"]
    ]);
    expect(held.snapshot.session.context.cnv_timed.releaseAt).toBe("2026-01-10T19:00:00Z");
  });

  it("reports a tie between two transitions on one event, naming the edges", async () => {
    const machine = await tie(both);
    const { snapshot } = machine.start({ at: AT });
    const result = machine.send(snapshot, { event: "go", at: AT });
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "ambiguous", state: "waiting", edges: ["edg_first", "edg_second"] })
    ]);
  });

  it("reports a tie between the branches of a choice, and takes the first", async () => {
    const machine = await tie(both);
    const { snapshot } = machine.start({ at: AT });
    const result = machine.send(snapshot, { event: "decide", at: AT });
    expect(result.state).toBe("first");
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "ambiguous", state: "which?", edges: ["edg_whichFirst", "edg_whichSecond"] })
    ]);
  });

  it("reports a tie between two transitions on one timer", async () => {
    const machine = await tie(both);
    const { snapshot } = machine.start({ at: AT });
    const timedOne = machine.send(snapshot, { event: "wait", at: AT });
    const result = machine.send(timedOne.snapshot, { timer: "t", at: DUE });
    expect(result.state).toBe("first");
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "ambiguous",
        state: "timed",
        edges: ["edg_timedFirst", "edg_timedSecond"],
        timer: "t"
      })
    ]);
  });

  it("does not count a transition on the timer that is out of effect when the timer falls due", async () => {
    const doc = tieDoc();
    doc.canvases.cnv_tie.edges.edg_timedSecond.effective = LAPSED;
    const result = await waitedOut(doc);
    expect([result.state, result.warnings]).toEqual(["first", []]);
  });

  it("does not warn when the armed transition is out of effect: the next one on the timer is taken alone", async () => {
    const doc = tieDoc();
    doc.canvases.cnv_tie.edges.edg_timedFirst.effective = LAPSED;
    const result = await waitedOut(doc);
    expect([result.state, result.warnings]).toEqual(["second", []]);
  });

  it("neither asks about nor warns of a later branch that nothing decides", async () => {
    const doc = tieDoc();
    doc.canvases.cnv_tie.edges.edg_whichSecond.guard = { text: "a person decides" };
    const machine = await tie(both, doc);
    const { snapshot } = machine.start({ at: AT });
    const result = machine.send(snapshot, { event: "decide", at: AT });
    expect(result.refused).toBeUndefined();
    expect(result.state).toBe("first");
    expect(result.warnings).toEqual([]);
  });

  it("stays inert when a later guard throws or returns a promise", async () => {
    for (const second of [
      () => {
        throw new Error("boom");
      },
      () => Promise.resolve(true)
    ]) {
      const machine = await tie({ first: () => true, second });
      const { snapshot } = machine.start({ at: AT });
      const result = machine.send(snapshot, { event: "decide", at: AT });
      expect(result.refused).toBeUndefined();
      expect([result.state, result.warnings]).toEqual(["first", []]);
    }
  });

  it("skips a placeholder guard that throws, in a choice and on a timer: no warning, no question, no refusal", async () => {
    const notYet = name => () => {
      throw new Error(`guard ${name} lands in S3`);
    };
    const machine = await tie({ first: () => true, second: notYet("second") });
    const { snapshot } = machine.start({ at: AT });
    const decided = machine.send(snapshot, { event: "decide", at: AT });
    expect([decided.refused, decided.state, decided.warnings]).toEqual([undefined, "first", []]);
    const timedOne = machine.send(snapshot, { event: "wait", at: AT });
    const fired = machine.send(timedOne.snapshot, { timer: "t", at: DUE });
    expect([fired.refused, fired.state, fired.warnings]).toEqual([undefined, "first", []]);
  });

  it("judges later branches with the input the taken branch saw", async () => {
    const guards = { big: (context, input) => input.payload.n > 1, positive: (context, input) => input.payload.n > 0 };
    const machine = (await createRuntime(pickDoc(), { guards })).machine("pick.status");
    const { snapshot } = machine.start({ at: AT });
    const two = machine.send(snapshot, { event: "decide", payload: { n: 2 }, at: AT });
    expect(two.state).toBe("big");
    expect(two.warnings).toEqual([
      expect.objectContaining({ code: "ambiguous", state: "which?", edges: ["edg_whichBig", "edg_whichPositive"] })
    ]);
    const one = machine.send(snapshot, { event: "decide", payload: { n: 1 }, at: AT });
    expect([one.state, one.warnings]).toEqual(["positive", []]);
  });

  it("reports the tie of a flow an action runs within the step, as the flow gave it: a path, not a state", async () => {
    const machine = (await createRuntime(flowTieDoc())).machine("flowTie.status");
    const { snapshot } = machine.start({ at: AT });
    const result = machine.send(snapshot, { event: "check", at: AT });
    expect(result.state).toBe("checked");
    expect(result.warnings).toStrictEqual([
      {
        code: "ambiguous",
        message: "2 edges leave check; the first in ID order is taken",
        path: "nod_check",
        edges: ["edg_a", "edg_b"]
      }
    ]);
  });

  it("passes a flow's tie through unchanged: it has a path, not a state", () => {
    const entry = {
      type: "warning",
      code: "ambiguous",
      message: "2 edges leave check; the first in ID order is taken",
      path: "nod_holding/nod_check",
      edges: ["edg_a", "edg_b"]
    };
    expect(warningsOf(timedDoc(), "cnv_timed", [entry])).toStrictEqual([
      {
        code: "ambiguous",
        message: "2 edges leave check; the first in ID order is taken",
        path: "nod_holding/nod_check",
        edges: ["edg_a", "edg_b"]
      }
    ]);
  });
});
