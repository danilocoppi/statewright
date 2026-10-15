import { moves, start, step, storyOf } from "statewright/simulate";
import { describe, expect, it } from "vitest";

import { FIT, fitFor, inspectorSpace, STAGE_ROOM } from "@/canvas/viewport";
import { marksFor } from "@/simulate/marks";

import { readExample } from "../fixtures.js";

const AT = "2026-01-05T09:00:00Z";
const INIT = { at: AT, context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };

/** The payments lifecycle, started, with what can happen from there. */
function lifecycle() {
  const doc = readExample("payments");
  const { session } = start(doc, { canvas: "cnv_lifecycle", ...INIT });
  return { doc, session, moves: moves(doc, session) };
}

describe("the run's marks on a level (simulator spec §6.3)", () => {
  it("marks the boxes the run is inside, with the states active in each", () => {
    const { doc, session, moves: listed } = lifecycle();
    const marks = marksFor(doc, "cnv_lifecycle", { top: "cnv_lifecycle", session, moves: listed });
    expect(Object.fromEntries(marks.nodes)).toEqual({
      nod_complianceHold: { kind: "inside", leaves: ["nod_complianceHold/nod_clear"], open: "cnv_complianceHold" },
      nod_expiryClock: { kind: "inside", leaves: ["nod_expiryClock/nod_running"], open: "cnv_expiryClock" },
      nod_sendCrossBorder: {
        kind: "inside",
        leaves: ["nod_sendCrossBorder/nod_awaitingFunds"],
        open: "cnv_crossBorderSend"
      }
    });
    expect(marks.edges.size).toBe(0);
  });

  it("marks where the run is on its level, the edges that can fire now and where they lead", () => {
    const { doc, session, moves: listed } = lifecycle();
    const marks = marksFor(doc, "cnv_expiryClock", { top: "cnv_lifecycle", session, moves: listed });
    expect(Object.fromEntries(marks.nodes)).toEqual({ nod_running: { kind: "active", tokens: 1 } });
    expect([...marks.edges.keys()].sort()).toEqual(["edg_runningElapsed", "edg_runningPaused", "edg_runningStopped"]);
    expect(marks.edges.get("edg_runningStopped").moves.map(move => move.label)).toEqual([
      "parent.final",
      "payin.detected"
    ]);
    expect([...marks.kept].sort()).toEqual(["nod_elapsed", "nod_paused", "nod_running", "nod_stopped"]);
  });

  it("marks the box a run is inside on a system level above it", () => {
    const { doc, session } = lifecycle();
    const marks = marksFor(doc, "cnv_runtime", { top: "cnv_lifecycle", session });
    expect(marks.nodes.get("nod_lifecycleEngine")).toEqual({
      kind: "inside",
      leaves: ["nod_complianceHold/nod_clear", "nod_expiryClock/nod_running", "nod_sendCrossBorder/nod_awaitingFunds"],
      open: "cnv_lifecycle"
    });
  });

  it("numbers the edges a question chooses between, as the panel numbers its answers", () => {
    const { doc, session } = lifecycle();
    let current = step(doc, session, { do: { event: "evt_payinConfirmed" } }).session;
    current = step(doc, current, {
      do: { event: "evt_legCompleted" },
      answers: [{ kind: "transition", at: "nod_sendCrossBorder/nod_converting", value: "edg_convertingPayingOut" }]
    }).session;
    const asked = step(doc, current, { do: { event: "evt_payoutCompleted" } });
    const marks = marksFor(doc, "cnv_crossBorderSend", {
      top: "cnv_lifecycle",
      session: current,
      question: asked.question
    });
    expect(marks.edges.get("edg_payingOutCompleted").number).toBe(1);
    expect(marks.edges.get("edg_payingOutPartiallyCompleted").number).toBe(2);
  });

  it("marks nothing on a level the run has nothing on", () => {
    const { doc, session } = lifecycle();
    const other = structuredClone(doc);
    other.canvases.cnv_elsewhere = { kind: "machine", name: "Elsewhere", nodes: {}, edges: {} };
    expect(marksFor(other, "cnv_elsewhere", { top: "cnv_lifecycle", session })).toBeNull();
  });

  it("counts the tokens on a flow's node, and marks the node whose body holds tokens", () => {
    const doc = readExample("payout-batch");
    const input = { payouts: [{ amount: 1, id: "pay_1", rail: "pix" }] };
    const asked = start(doc, { canvas: "cnv_payOutBatch", at: AT, input });
    const session = {
      canvas: "cnv_payOutBatch",
      tokens: [
        { id: 1, path: "nod_both" },
        { id: 2, path: "nod_both" }
      ]
    };
    expect(marksFor(doc, "cnv_payOutBatch", { top: "cnv_payOutBatch", session }).nodes.get("nod_both")).toEqual({
      kind: "active",
      tokens: 2
    });
    expect(asked.question.at).toBe("nod_each/nod_pix");
    const inBody = { canvas: "cnv_payOutBatch", tokens: [{ id: 3, path: "nod_each/nod_pix" }] };
    expect(marksFor(doc, "cnv_payOutBatch", { top: "cnv_payOutBatch", session: inBody }).nodes.get("nod_each")).toEqual(
      { kind: "inside", leaves: ["nod_each/nod_pix"], open: "cnv_payOne" }
    );
  });
});

describe("framing a level beside the simulation panel", () => {
  it("leaves the panel's room on the right, and the usual air elsewhere", () => {
    expect(fitFor(1440, { beside: true })).toEqual({
      ...FIT,
      padding: { top: FIT.padding, bottom: FIT.padding, left: FIT.padding, right: `${inspectorSpace()}px` }
    });
    expect(fitFor(1440)).toEqual(FIT);
  });
});

describe("the marks of a step on the stage (simulator spec §7.1)", () => {
  /** A frame of the scenario where verification pauses the clock. */
  function frame(index) {
    const doc = readExample("payments");
    return { doc, frame: storyOf(doc, doc.annotations.scenarios.scn_verificationPausesTheClock).frames[index] };
  }

  it("marks the edges a step took, where the run came from, and when each box shows the run", () => {
    const { doc, frame: paused } = frame(1);
    const run = { top: "cnv_lifecycle", session: { active: paused.active }, taken: paused.taken, each: 600 };
    const marks = marksFor(doc, "cnv_expiryClock", { ...run, session: sessionOf(doc, 1) });
    expect(marks.edges.get("edg_runningPaused")).toEqual({ moves: [], fired: { at: 0, each: 600 } });
    expect(marks.nodes.get("nod_running")).toEqual({ kind: "left", at: 0 });
    expect(marks.nodes.get("nod_paused")).toEqual({ kind: "active", tokens: 1, at: 600 });
    expect([...marks.kept].sort()).toEqual(["nod_paused", "nod_running"]);
    // Shown at once: everything is there from the start.
    const still = marksFor(doc, "cnv_expiryClock", { ...run, session: sessionOf(doc, 1), each: 0 });
    expect(still.edges.get("edg_runningPaused").fired).toEqual({ at: 0, each: 0 });
    expect(still.nodes.get("nod_paused").at).toBe(0);
  });

  it("plays the edges a step took on a level one after the other, the whole within 2.4 s", () => {
    const { doc, frame: begun } = frame(0);
    const marks = marksFor(doc, "cnv_lifecycle", {
      top: "cnv_lifecycle",
      session: sessionOf(doc, 0),
      taken: begun.taken,
      each: 600
    });
    expect([...marks.edges.values()].map(mark => mark.fired.at)).toEqual([0, 600, 1200]);
    // Initial transitions only lead the run in: they leave nothing behind.
    expect([...marks.nodes.values()].every(mark => mark.kind === "inside")).toBe(true);
  });
});

describe("the motion of a step that takes many edges on one level", () => {
  it("shares 2.4 s among them, one after the other", () => {
    const doc = readExample("payout-batch");
    const scenario = doc.annotations.scenarios.scn_aPayoutIsRefused;
    const { session } = start(doc, { canvas: scenario.canvas, ...scenario.start });
    const [begun] = storyOf(doc, scenario).frames;
    const marks = marksFor(doc, "cnv_payOutBatch", { top: "cnv_payOutBatch", session, taken: begun.taken, each: 600 });
    const fired = [...marks.edges.values()].map(mark => mark.fired);
    expect(fired.length).toBeGreaterThan(4);
    for (const [order, { at, each }] of fired.entries()) {
      expect(each).toBeCloseTo(2400 / fired.length);
      expect(at).toBeCloseTo(order * each);
    }
  });
});

/** The session after a point of the scenario where verification pauses the clock. */
function sessionOf(doc, index) {
  const scenario = doc.annotations.scenarios.scn_verificationPausesTheClock;
  let result = start(doc, { canvas: scenario.canvas, ...scenario.start });
  for (const recorded of scenario.steps.slice(0, index)) {
    result = step(doc, result.session, { do: recorded.do, answers: recorded.answers ?? [] });
  }
  return result.session;
}

describe("framing a level on the stage", () => {
  it("leaves room above for the scenario's name and below for the step's card, and may enlarge a small level", () => {
    expect(fitFor(1440, { stage: true })).toEqual({
      ...FIT,
      maxZoom: 1.5,
      padding: {
        top: `${STAGE_ROOM.top}px`,
        bottom: `${STAGE_ROOM.bottom}px`,
        left: `${STAGE_ROOM.side}px`,
        right: `${STAGE_ROOM.side}px`
      }
    });
  });
});
