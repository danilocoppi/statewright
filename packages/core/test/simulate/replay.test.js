import { describe, expect, it } from "vitest";
import { moves, reachedOf, replay, start, step } from "../../src/simulate/index.js";
import { paymentsDoc } from "../helpers.js";
import { AT, begin, docOf, events, machine } from "./helpers.js";

/** An order: created, then paid, cancelled, or expired after two hours. */
function order(extraEdges = {}, extraNodes = {}) {
  return docOf(
    {
      cnv_order: machine(
        "Order",
        {
          nod_start: { kind: "initial" },
          nod_created: { kind: "state", name: "created" },
          nod_paid: { kind: "state", name: "paid" },
          nod_cancelled: { kind: "state", name: "cancelled", terminal: true },
          nod_expired: { kind: "state", name: "expired", terminal: true },
          ...extraNodes
        },
        {
          edg_begin: { from: "nod_start", to: "nod_created" },
          edg_pay: { from: "nod_created", to: "nod_paid", on: ["evt_paid"] },
          edg_cancel: { from: "nod_created", to: "nod_cancelled", via: "ept_cancel" },
          edg_expire: { from: "nod_created", to: "nod_expired", after: "tmr_ttl" },
          ...extraEdges
        }
      )
    },
    {
      events: events("paid", "leg.started", "leg.halted", "refund.asked"),
      endpoints: { ept_cancel: { name: "Cancel", method: "POST", path: "/orders/{id}/cancel" } },
      timers: { tmr_ttl: { name: "ttl", duration: "PT2H" } }
    }
  );
}

describe("moves: what can happen now (simulator spec §5.2)", () => {
  it("lists each event, call and timer an active state responds to, with where it leads", () => {
    const doc = order();
    const region = { key: "", name: "Order" };
    expect(moves(doc, begin(doc).session)).toEqual([
      {
        do: { event: "evt_paid" },
        label: "paid",
        kind: "event",
        region,
        edges: ["edg_pay"],
        outcome: { to: ["nod_paid"] }
      },
      {
        do: { call: "ept_cancel" },
        label: "POST /orders/{id}/cancel",
        kind: "call",
        region,
        edges: ["edg_cancel"],
        outcome: { to: ["nod_cancelled"] }
      },
      {
        do: { wait: "PT2H" },
        label: "ttl",
        kind: "timer",
        region,
        due: "2026-01-05T11:00:00Z",
        edges: ["edg_expire"],
        outcome: { to: ["nod_expired"] }
      }
    ]);
  });

  it("offers the catalog events an onMatch pattern matches, and an any node's transitions", () => {
    const doc = order(
      {
        edg_legs: { from: "nod_created", to: "nod_paid", onMatch: ["leg.*"] },
        edg_refund: { from: "nod_any", to: "nod_cancelled", on: ["evt_refundAsked"] }
      },
      { nod_any: { kind: "any" } }
    );
    const labels = moves(doc, begin(doc).session).map(move => move.label);
    expect(labels).toEqual(["leg.halted", "leg.started", "paid", "refund.asked", "POST /orders/{id}/cancel", "ttl"]);
  });

  it("says when a move asks, and leaves out a move whose guard does not hold", () => {
    const doc = order();
    doc.canvases.cnv_order.edges.edg_pay.guard = { text: "paid in full" };
    doc.canvases.cnv_order.edges.edg_cancel.guard = { expr: false };
    const listed = moves(doc, begin(doc).session);
    expect(listed.map(move => move.label)).toEqual(["paid", "ttl"]);
    expect(listed[0].outcome.asks).toMatchObject({ kind: "transition", at: "nod_created" });
  });

  it("groups the payments lifecycle's moves by the region they belong to", () => {
    const doc = paymentsDoc();
    const { session } = start(doc, {
      canvas: "cnv_lifecycle",
      at: AT,
      context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } }
    });
    expect(moves(doc, session).map(move => [move.region.name, move.label, move.outcome.to])).toEqual([
      ["Compliance hold", "hold.opened", ["nod_complianceHold/nod_inReview"]],
      ["Expiry clock", "parent.final", ["nod_expiryClock/nod_stopped"]],
      ["Expiry clock", "payin.detected", ["nod_expiryClock/nod_stopped"]],
      ["Expiry clock", "verify.started", ["nod_expiryClock/nod_paused"]],
      ["Expiry clock", "timer.expiry", ["nod_expiryClock/nod_elapsed"]],
      ["Phase", "ops.cancel", ["nod_sendCrossBorder/nod_cancelled"]],
      ["Phase", "owner.cancel", ["nod_sendCrossBorder/nod_cancelled"]],
      ["Phase", "payin.confirmed", ["nod_sendCrossBorder/nod_converting"]],
      // An internal self-transition: the quote is refreshed and the state stays.
      ["Phase", "quote_ttl", []]
    ]);
  });
});

/** A scenario recorded from a run of `canvas`: each input with what it reached. */
function record(doc, init, inputs, canvas = doc.root) {
  let result = start(doc, { canvas, ...init });
  const steps = [];
  for (const input of inputs) {
    result = step(doc, result.session, input);
    steps.push({
      do: input.do,
      ...(input.answers ? { answers: input.answers } : {}),
      reached: reachedOf(result.session)
    });
  }
  return { name: "Recorded", canvas, start: init, steps };
}

describe("replay: running a scenario again (simulator spec §4.6)", () => {
  const inputs = [{ do: { wait: "PT1H" } }, { do: { event: "evt_paid" } }];

  it("finds a recorded run the same at every step", () => {
    const doc = order();
    const scenario = record(doc, { at: AT }, inputs);
    expect(replay(doc, scenario)).toEqual({
      start: { status: "same" },
      steps: [
        { status: "same", recorded: { active: ["nod_created"] }, now: { active: ["nod_created"] } },
        { status: "same", recorded: { active: ["nod_paid"] }, now: { active: ["nod_paid"] } }
      ],
      first: null
    });
  });

  it("finds the first step that goes elsewhere once the design changes, with what was recorded and what happens now", () => {
    const scenario = record(order(), { at: AT }, inputs);
    const changed = order();
    changed.catalog.timers.tmr_ttl.duration = "PT30M";
    const result = replay(changed, scenario);
    expect(result.first).toBe(1);
    expect(result.steps[0]).toEqual({
      status: "diverged",
      recorded: { active: ["nod_created"] },
      now: { active: ["nod_expired"], ended: "done" },
      reason: "reached"
    });
    // The run goes on from where it now is: the order has expired, so paying it changes nothing either.
    expect(result.steps[1]).toMatchObject({ status: "diverged", now: { active: ["nod_expired"] }, reason: "reached" });
  });

  it("counts how the run ended as part of where it got to", () => {
    const scenario = record(order(), { at: AT }, [{ do: { call: "ept_cancel" } }]);
    expect(scenario.steps[0].reached).toEqual({ active: ["nod_cancelled"], ended: "done" });
    const open = order();
    delete open.canvases.cnv_order.nodes.nod_cancelled.terminal;
    expect(replay(open, scenario).steps[0]).toEqual({
      status: "diverged",
      recorded: { active: ["nod_cancelled"], ended: "done" },
      now: { active: ["nod_cancelled"] },
      reason: "reached"
    });
  });

  it("tells apart a question the recording does not answer, answers left over and an error, and skips what follows", () => {
    const scenario = record(order(), { at: AT }, inputs);
    const asking = order();
    asking.canvases.cnv_order.edges.edg_pay.guard = { text: "paid in full" };
    expect(replay(asking, scenario).steps[1]).toMatchObject({ status: "diverged", reason: "question" });

    const answered = record(asking, { at: AT }, [
      inputs[0],
      { do: { event: "evt_paid" }, answers: [{ kind: "transition", at: "nod_created", value: "edg_pay" }] }
    ]);
    expect(replay(order(), answered).steps[1]).toMatchObject({ status: "diverged", reason: "answers" });

    const gone = order();
    delete gone.catalog.events.evt_paid;
    delete gone.canvases.cnv_order.edges.edg_pay;
    const lost = replay(gone, { ...scenario, steps: [scenario.steps[1], scenario.steps[0]] });
    expect(lost.steps).toMatchObject([{ status: "diverged", reason: "error" }, { status: "skipped" }]);
    expect(lost.first).toBe(1);
  });

  it("diverges at its start when the run cannot start", () => {
    const doc = order();
    const scenario = record(doc, { at: AT }, inputs);
    const result = replay(doc, { ...scenario, canvas: "cnv_nope" });
    expect(result.start).toMatchObject({ status: "diverged", reason: "error" });
    expect(result.first).toBe(0);
    expect(result.steps.map(item => item.status)).toEqual(["skipped", "skipped"]);
  });

  it("replays the spec's scenario on the payments example (§4.2)", () => {
    const doc = paymentsDoc();
    const init = { at: AT, context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };
    const inputs = [
      { do: { event: "evt_verifyStarted" } },
      { do: { wait: "P2D" } },
      { do: { event: "evt_verifyEnded" } }
    ];
    const scenario = record(doc, init, inputs, "cnv_lifecycle");
    expect(scenario.steps.map(item => item.reached.active.find(path => path.startsWith("nod_expiryClock/")))).toEqual([
      "nod_expiryClock/nod_paused",
      "nod_expiryClock/nod_paused",
      "nod_expiryClock/nod_running"
    ]);
    expect(replay(doc, scenario).first).toBeNull();
  });
});
