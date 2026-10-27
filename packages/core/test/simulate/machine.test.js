import { describe, expect, it } from "vitest";
import { executableOf, moves, reachedOf, start, step } from "../../src/simulate/index.js";
import { paymentsDoc } from "../helpers.js";
import { AT, begin, docOf, events, machine, of, types, walk } from "./helpers.js";

/** Orders: created, then paid or cancelled. */
function orders(edges = {}, catalog = {}) {
  return docOf(
    {
      cnv_orders: machine(
        "Orders",
        {
          nod_start: { kind: "initial" },
          nod_created: { kind: "state", name: "created" },
          nod_paid: { kind: "state", name: "paid" },
          nod_shipped: { kind: "state", name: "shipped" },
          nod_cancelled: { kind: "state", name: "cancelled", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_created" },
          edg_pay: { from: "nod_created", to: "nod_paid", on: ["evt_paid"] },
          edg_cancel: { from: "nod_created", to: "nod_cancelled", on: ["evt_cancelled"] },
          edg_ship: { from: "nod_paid", to: "nod_shipped", on: ["evt_shipped"] },
          ...edges
        }
      )
    },
    { events: events("paid", "cancelled", "shipped", "leg.halted", "leg.a.b", "legs"), ...catalog }
  );
}

/** A machine whose `busy` state holds two regions: a and b. */
function nested({ outer = {}, inner = {}, actions = {} } = {}) {
  const act = id => [{ action: id }];
  return docOf(
    {
      cnv_top: machine(
        "Top",
        {
          nod_start: { kind: "initial" },
          nod_idle: { kind: "state", name: "idle", onExit: act("act_exitIdle") },
          nod_busy: {
            kind: "state",
            name: "busy",
            inner: { canvas: "cnv_busy" },
            onEntry: act("act_enterBusy"),
            onExit: act("act_exitBusy")
          },
          nod_done: { kind: "state", name: "done" }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_idle" },
          edg_go: { from: "nod_idle", to: "nod_busy", on: ["evt_go"], actions: act("act_go") },
          edg_stop: { from: "nod_busy", to: "nod_done", on: ["evt_stop"] },
          ...outer
        }
      ),
      cnv_busy: machine(
        "Busy",
        {
          nod_aStart: { kind: "initial", region: "rgn_a" },
          nod_a1: {
            kind: "state",
            name: "a1",
            region: "rgn_a",
            onEntry: act("act_enterA1"),
            onExit: act("act_exitA1")
          },
          nod_a2: { kind: "state", name: "a2", region: "rgn_a" },
          nod_bStart: { kind: "initial", region: "rgn_b" },
          nod_b1: { kind: "state", name: "b1", region: "rgn_b", onEntry: act("act_enterB1") },
          nod_b2: { kind: "state", name: "b2", region: "rgn_b" }
        },
        {
          edg_aBegin: { from: "nod_aStart", to: "nod_a1" },
          edg_bBegin: { from: "nod_bStart", to: "nod_b1" },
          ...inner
        },
        { regions: { rgn_a: { name: "A" }, rgn_b: { name: "B" } } }
      )
    },
    {
      events: events("go", "stop", "next"),
      actions: Object.fromEntries(
        [
          "act_exitIdle",
          "act_enterBusy",
          "act_exitBusy",
          "act_go",
          "act_enterA1",
          "act_exitA1",
          "act_enterB1",
          ...Object.keys(actions)
        ].map(id => [id, { name: id.slice(4) }])
      )
    }
  );
}

const actionsIn = trace => of(trace, "action").map(entry => entry.action);

describe("starting a run (spec §16.2)", () => {
  it("starts each region at its initial node and follows its transition", () => {
    const result = begin(orders());
    expect(result.status).toBe("done");
    expect(result.session).toEqual({
      canvas: "cnv_orders",
      clock: AT,
      active: ["nod_created"],
      history: {},
      context: {},
      timers: []
    });
    expect(types(result.trace)).toEqual(["transition", "entered"]);
  });

  it("starts at an entry instead, when asked, and refuses a node that is not one", () => {
    const doc = orders({ edg_api: { from: "nod_api", to: "nod_paid" } });
    doc.canvases.cnv_orders.nodes.nod_api = { kind: "entry", name: "POST /orders" };
    expect(begin(doc, { entry: "nod_api" }).session.active).toEqual(["nod_paid"]);
    expect(begin(doc, { entry: "nod_created" })).toMatchObject({ status: "error", code: "badInput" });
  });

  it("enters a compound state's regions at their initials, outermost first, running onEntry in that order (§16.6)", () => {
    const result = walk(nested(), begin(nested()), "evt_go");
    expect(result.session.active).toEqual(["nod_busy", "nod_busy/nod_a1", "nod_busy/nod_b1"]);
    expect(reachedOf(result.session)).toEqual({ active: ["nod_busy/nod_a1", "nod_busy/nod_b1"] });
    expect(actionsIn(result.trace)).toEqual(["act_exitIdle", "act_go", "act_enterBusy", "act_enterA1", "act_enterB1"]);
  });

  it("tells two instances of one definition apart by their paths, each with its own context (simulator §4.3)", () => {
    const counter = machine(
      "Counter",
      { nod_start: { kind: "initial" }, nod_counting: { kind: "state", name: "counting" } },
      {
        edg_begin: { from: "nod_start", to: "nod_counting" },
        edg_tick: {
          from: "nod_counting",
          to: "nod_counting",
          on: ["evt_tick"],
          internal: true,
          actions: [{ assign: { "context.count": { "+": [{ var: "context.count" }, 1] } } }]
        }
      }
    );
    const region = (key, id) => ({
      [`nod_${key}Start`]: { kind: "initial", region: `rgn_${key}` },
      [id]: { kind: "state", name: key, region: `rgn_${key}`, inner: { definition: "def_counter" } }
    });
    const doc = docOf(
      {
        cnv_top: machine(
          "Top",
          { ...region("left", "nod_left"), ...region("right", "nod_right") },
          {
            edg_left: { from: "nod_leftStart", to: "nod_left" },
            edg_right: { from: "nod_rightStart", to: "nod_right" }
          },
          { regions: { rgn_left: { name: "Left" }, rgn_right: { name: "Right" } } }
        ),
        cnv_counter: counter
      },
      { events: events("tick") },
      { def_counter: { kind: "machine", name: "Counter", canvas: "cnv_counter" } }
    );
    const started = begin(doc, { context: { nod_left: { count: 10 }, nod_right: { count: 0 } } });
    const result = walk(doc, started, "evt_tick");
    expect(result.session.active).toEqual(["nod_left", "nod_left/nod_counting", "nod_right", "nod_right/nod_counting"]);
    expect(result.session.context).toEqual({ nod_left: { count: 11 }, nod_right: { count: 1 } });
    expect(executableOf(doc, "cnv_counter")).toEqual({ canvas: "cnv_top", kind: "machine" });
    expect(start(doc, { canvas: "cnv_counter", at: AT })).toMatchObject({
      status: "error",
      code: "notExecutable",
      message: "Counter does not run on its own; start from Top, which runs it"
    });
  });

  it("names the machines inside a system canvas, which does not run itself", () => {
    const doc = paymentsDoc();
    expect(executableOf(doc, "cnv_runtime")).toEqual({ reason: "system", inside: ["cnv_lifecycle"] });
    expect(executableOf(doc, "cnv_expiryClock")).toEqual({ canvas: "cnv_lifecycle", kind: "machine" });
    expect(start(doc, { canvas: "cnv_runtime", at: AT })).toMatchObject({ status: "error", code: "notExecutable" });
  });

  it("stops with an error, and does not run forever, when a definition contains itself", () => {
    const loop = machine(
      "Loop",
      { nod_init: { kind: "initial" }, nod_again: { kind: "state", name: "again", inner: { definition: "def_loop" } } },
      { edg_begin: { from: "nod_init", to: "nod_again" } }
    );
    const doc = docOf(
      {
        cnv_top: machine(
          "Top",
          {
            nod_init: { kind: "initial" },
            nod_outer: { kind: "state", name: "outer", inner: { definition: "def_loop" } }
          },
          { edg_begin: { from: "nod_init", to: "nod_outer" } }
        ),
        cnv_loop: loop
      },
      {},
      { def_loop: { kind: "machine", name: "Loop", canvas: "cnv_loop" } }
    );
    expect(begin(doc)).toMatchObject({ status: "error", code: "cycle", message: "again contains itself" });
  });

  it("refuses a start that cannot be: no initial node, two of them, one with a trigger, a time that is not UTC", () => {
    const without = orders();
    delete without.canvases.cnv_orders.nodes.nod_start;
    delete without.canvases.cnv_orders.edges.edg_begin;
    expect(begin(without)).toMatchObject({ code: "noStart", message: "Orders has no initial node" });
    const two = orders({ edg_again: { from: "nod_again", to: "nod_paid" } });
    two.canvases.cnv_orders.nodes.nod_again = { kind: "initial" };
    expect(begin(two)).toMatchObject({ code: "badInitial", message: "Orders has 2 initial nodes" });
    const triggered = orders();
    triggered.canvases.cnv_orders.edges.edg_begin.on = ["evt_paid"];
    expect(begin(triggered)).toMatchObject({
      code: "badInitial",
      message: "The initial of Orders needs exactly one transition without a trigger"
    });
    expect(begin(orders(), { at: "2026-01-05" })).toMatchObject({ status: "error", code: "badInput" });
  });
});

describe("events (spec §16.3–16.6)", () => {
  it("moves on an event, and an event nothing waits for makes a step where nothing happens", () => {
    const doc = orders();
    const paid = walk(doc, begin(doc), "evt_paid");
    expect(paid.session.active).toEqual(["nod_paid"]);
    expect(types(paid.trace)).toEqual(["received", "exited", "transition", "entered"]);
    expect(paid.trace[0]).toEqual({ type: "received", event: "evt_paid", name: "paid", label: "paid", payload: null });
    const ignored = walk(doc, paid, "evt_cancelled");
    expect(ignored.session).toEqual(paid.session);
    expect(types(ignored.trace)).toEqual(["received", "nothing"]);
  });

  it("refuses an event the catalog does not have, and a step that is not exactly one thing", () => {
    const doc = orders();
    const { session } = begin(doc);
    expect(step(doc, session, { do: { event: "evt_nope" } })).toMatchObject({ status: "error", code: "dangling" });
    expect(step(doc, session, { do: {} })).toMatchObject({ status: "error", code: "badInput" });
    expect(step(doc, session, { do: { event: "evt_paid", call: "ept_x" } })).toMatchObject({ code: "badInput" });
  });

  it("takes the innermost transition: a child's before its parent's (§16.5)", () => {
    const doc = nested({ inner: { edg_inner: { from: "nod_a1", to: "nod_a2", on: ["evt_stop"] } } });
    const result = walk(doc, begin(doc), "evt_go", "evt_stop");
    expect(result.session.active).toEqual(["nod_busy", "nod_busy/nod_a2", "nod_busy/nod_b1"]);
    expect(walk(doc, result, "evt_stop").session.active).toEqual(["nod_done"]);
  });

  it("keeps the deeper of two transitions that would leave the same states (§16.5)", () => {
    // Region a takes its own transition on stop; region b has none, so it reaches busy's — which would leave a too.
    const doc = nested({ inner: { edg_inner: { from: "nod_a1", to: "nod_a2", on: ["evt_stop"] } } });
    const result = walk(doc, begin(doc), "evt_go", "evt_stop");
    expect(of(result.trace, "transition").map(entry => entry.edge)).toEqual(["edg_inner"]);
  });

  it("lets every region take its own transition, in region order (§16.5)", () => {
    const doc = nested({
      inner: {
        edg_bNext: { from: "nod_b1", to: "nod_b2", on: ["evt_next"] },
        edg_aNext: { from: "nod_a1", to: "nod_a2", on: ["evt_next"] }
      }
    });
    const result = walk(doc, begin(doc), "evt_go", "evt_next");
    expect(of(result.trace, "transition").map(entry => entry.edge)).toEqual(["edg_aNext", "edg_bNext"]);
    expect(result.session.active).toEqual(["nod_busy", "nod_busy/nod_a2", "nod_busy/nod_b2"]);
  });

  it("refuses a transition that crosses from one region to another, even into a region that is gone (§16.1)", () => {
    const doc = nested({ inner: { edg_cross: { from: "nod_a1", to: "nod_b2", on: ["evt_next"] } } });
    const busy = walk(doc, begin(doc), "evt_go");
    expect(walk(doc, busy, "evt_next")).toMatchObject({
      status: "error",
      code: "badTarget",
      message: "A transition cannot cross from region A of Busy to region B of Busy"
    });
    doc.canvases.cnv_busy.nodes.nod_b2.region = "rgn_gone";
    expect(walk(doc, busy, "evt_next")).toMatchObject({ status: "error", code: "badTarget" });
    expect(moves(doc, busy.session).find(move => move.label === "next").outcome).toEqual({ error: "badTarget" });
  });

  it("applies an any node's transitions to every state of its region but the excepted and terminal ones (§16.4)", () => {
    const doc = orders({ edg_abort: { from: "nod_any", to: "nod_cancelled", on: ["evt_legHalted"] } });
    doc.canvases.cnv_orders.nodes.nod_any = { kind: "any", except: ["nod_paid"] };
    expect(walk(doc, begin(doc), "evt_legHalted").session.active).toEqual(["nod_cancelled"]);
    const paid = walk(doc, begin(doc), "evt_paid");
    expect(walk(doc, paid, "evt_legHalted").session.active).toEqual(["nod_paid"]);
    const cancelled = walk(doc, begin(doc), "evt_cancelled");
    expect(types(walk(doc, cancelled, "evt_legHalted").trace)).toEqual(["received", "nothing"]);
  });

  it("takes the first of two transitions that both hold, in ID order, and warns (§16.5)", () => {
    const doc = orders({ edg_alsoPay: { from: "nod_created", to: "nod_cancelled", on: ["evt_paid"] } });
    const result = walk(doc, begin(doc), "evt_paid");
    expect(result.session.active).toEqual(["nod_cancelled"]);
    expect(of(result.trace, "warning")).toEqual([
      {
        type: "warning",
        code: "ambiguous",
        message: "2 transitions leave created on paid; the first in ID order is taken",
        state: "nod_created",
        edges: ["edg_alsoPay", "edg_pay"]
      }
    ]);
  });

  it("exits innermost first, runs the transition's actions, then enters outermost first (§16.6)", () => {
    const doc = nested({
      outer: { edg_stop: { from: "nod_busy", to: "nod_idle", on: ["evt_stop"], actions: [{ action: "act_go" }] } }
    });
    const result = walk(doc, begin(doc), "evt_go", "evt_stop");
    expect(types(result.trace).filter(type => type === "exited" || type === "entered")).toEqual([
      "exited",
      "exited",
      "exited",
      "entered"
    ]);
    expect(of(result.trace, "exited").map(entry => entry.state)).toEqual([
      "nod_busy/nod_b1",
      "nod_busy/nod_a1",
      "nod_busy"
    ]);
    expect(actionsIn(result.trace)).toEqual(["act_exitA1", "act_exitBusy", "act_go"]);
  });

  it("runs an internal self-transition's actions without leaving; an external one leaves and enters again", () => {
    const self = internal => ({
      edg_self: {
        from: "nod_busy",
        to: "nod_busy",
        on: ["evt_next"],
        ...(internal ? { internal: true } : {}),
        actions: [{ action: "act_go" }]
      }
    });
    const inside = nested({ outer: self(true) });
    const kept = walk(inside, begin(inside), "evt_go", "evt_next");
    expect(types(kept.trace)).toEqual(["received", "transition", "action"]);
    expect(kept.trace[1]).toMatchObject({ internal: true });
    const outside = nested({ outer: self(false) });
    const again = walk(outside, begin(outside), "evt_go", "evt_next");
    expect(of(again.trace, "entered").map(entry => entry.state)).toEqual([
      "nod_busy",
      "nod_busy/nod_a1",
      "nod_busy/nod_b1"
    ]);
  });
});

describe("guards, effects and data (spec §16.3, §16.10)", () => {
  const enough = { ">=": [{ var: "event.payload.amount" }, { var: "context.total" }] };

  it("evaluates a guard's expression against the event's payload and the machine's context", () => {
    const doc = orders();
    doc.canvases.cnv_orders.edges.edg_pay.guard = { expr: enough };
    const started = begin(doc, { context: { cnv_orders: { total: 100 } } });
    const short = walk(doc, started, { do: { event: "evt_paid", payload: { amount: 50 } } });
    expect(short.session.active).toEqual(["nod_created"]);
    expect(walk(doc, short, { do: { event: "evt_paid", payload: { amount: 120 } } }).session.active).toEqual([
      "nod_paid"
    ]);
  });

  it("uses a catalog guard's expression when the transition names the guard", () => {
    const doc = orders({}, { guards: { grd_enough: { name: "Enough", expr: enough } } });
    doc.canvases.cnv_orders.edges.edg_pay.guard = { guard: "grd_enough" };
    const started = begin(doc, { context: { cnv_orders: { total: 100 } } });
    expect(walk(doc, started, { do: { event: "evt_paid", payload: { amount: 50 } } }).session.active).toEqual([
      "nod_created"
    ]);
  });

  it("writes assignments into the machine's context and raises emitted events before the step ends (§16.3)", () => {
    const doc = orders();
    doc.canvases.cnv_orders.edges.edg_pay.actions = [
      { assign: { "context.paid.amount": { var: "event.payload.amount" } } },
      { emit: "evt_shipped", payload: { by: "warehouse" } }
    ];
    const result = walk(doc, begin(doc), { do: { event: "evt_paid", payload: { amount: 120 } } });
    expect(result.session.active).toEqual(["nod_shipped"]);
    expect(result.session.context).toEqual({ cnv_orders: { paid: { amount: 120 } } });
    expect(of(result.trace, "emitted")).toEqual([
      { type: "emitted", event: "evt_shipped", payload: { by: "warehouse" }, at: "nod_created" }
    ]);
    expect(of(result.trace, "received").map(entry => [entry.name, entry.internal ?? false])).toEqual([
      ["paid", false],
      ["shipped", true]
    ]);
  });

  it("writes only the context's own values: a target through __proto__ is not assigned, and says so", () => {
    const doc = orders();
    doc.canvases.cnv_orders.edges.edg_pay.actions = [
      { assign: { "context.__proto__.polluted": true, "context.constructor.prototype.polluted": true } }
    ];
    const result = walk(doc, begin(doc), "evt_paid");
    expect(Object.prototype).not.toHaveProperty("polluted");
    expect(Object.hasOwn(result.session.context.cnv_orders, "constructor")).toBe(true);
    expect(of(result.trace, "warning")).toEqual([
      {
        type: "warning",
        code: "unevaluated",
        message: "context.__proto__.polluted is not assigned: a context cannot hold __proto__",
        target: "context.__proto__.polluted"
      }
    ]);
  });

  it("does not assign what the context cannot hold, and says so", () => {
    const doc = orders();
    doc.canvases.cnv_orders.edges.edg_pay.actions = [
      { assign: { "context.list": [1, 2] } },
      { assign: { "context.list.length": -1 } }
    ];
    const result = walk(doc, begin(doc), "evt_paid");
    expect(result).toMatchObject({ status: "done", session: { context: { cnv_orders: { list: [1, 2] } } } });
    expect(of(result.trace, "warning")).toMatchObject([{ code: "unevaluated", target: "context.list.length" }]);
  });

  it("stops a machine that never settles, without applying the step (§16.12)", () => {
    const doc = orders({
      edg_back: { from: "nod_paid", to: "nod_created", on: ["evt_shipped"], actions: [{ emit: "evt_paid" }] }
    });
    doc.canvases.cnv_orders.edges.edg_pay.actions = [{ emit: "evt_shipped" }];
    const started = begin(doc);
    const result = walk(doc, started, "evt_paid");
    expect(result).toMatchObject({
      status: "error",
      code: "livelock",
      message: "More than 100 transitions in one step: the machine never settles"
    });
    expect(result.session).toBeUndefined();
  });

  it("warns when two branches of a choice hold, judging each with the event (expressions)", () => {
    const doc = docOf(
      {
        cnv_pick: machine(
          "Pick",
          {
            nod_start: { kind: "initial" },
            nod_waiting: { kind: "state", name: "waiting" },
            nod_which: { kind: "choice", name: "which?" },
            nod_big: { kind: "state", name: "big", terminal: true },
            nod_positive: { kind: "state", name: "positive", terminal: true },
            nod_none: { kind: "state", name: "none", terminal: true }
          },
          {
            edg_begin: { from: "nod_start", to: "nod_waiting" },
            edg_decide: { from: "nod_waiting", to: "nod_which", on: ["evt_decide"] },
            edg_whichBig: {
              from: "nod_which",
              to: "nod_big",
              guard: { expr: { ">": [{ var: "event.payload.n" }, 1] } }
            },
            edg_whichPositive: {
              from: "nod_which",
              to: "nod_positive",
              guard: { expr: { ">": [{ var: "event.payload.n" }, 0] } }
            },
            edg_whichNone: { from: "nod_which", to: "nod_none", else: true }
          }
        )
      },
      { events: events("decide") }
    );
    const two = walk(doc, begin(doc), { do: { event: "evt_decide", payload: { n: 2 } } });
    expect(two.session.active).toEqual(["nod_big"]);
    expect(of(two.trace, "warning")).toEqual([
      expect.objectContaining({ code: "ambiguous", state: "nod_which", edges: ["edg_whichBig", "edg_whichPositive"] })
    ]);
    const one = walk(doc, begin(doc), { do: { event: "evt_decide", payload: { n: 1 } } });
    expect([one.session.active, of(one.trace, "warning")]).toEqual([["nod_positive"], []]);
  });
});

describe("questions (simulator spec §5.4)", () => {
  /** created pays in full or in part, decided by conditions written in words. */
  function payout(extra = {}) {
    return orders(
      {
        edg_pay: { from: "nod_created", to: "nod_paid", on: ["evt_paid"], guard: { text: "full amount" } },
        edg_part: { from: "nod_created", to: "nod_shipped", on: ["evt_paid"], guard: { guard: "grd_scaled" } },
        ...extra
      },
      {
        guards: { grd_scaled: { name: "Scaled payout", description: "The payout was reduced to the funds received." } }
      }
    );
  }

  it("asks which transition holds when guards have no expression, leaving the session as it was", () => {
    const doc = payout();
    const started = begin(doc);
    const result = walk(doc, started, "evt_paid");
    expect(result.status).toBe("needs");
    expect(result.session).toBeUndefined();
    expect(result.question).toEqual({
      kind: "transition",
      at: "nod_created",
      state: "created",
      trigger: "paid",
      candidates: [
        {
          value: "edg_part",
          to: "shipped",
          guard: { name: "Scaled payout", description: "The payout was reduced to the funds received." }
        },
        { value: "edg_pay", to: "paid", guard: { text: "full amount" } },
        { value: null }
      ]
    });
  });

  it("goes on with the answer given, and stays where it was when none holds", () => {
    const doc = payout();
    const { session } = begin(doc);
    const answer = value =>
      step(doc, session, { do: { event: "evt_paid" }, answers: [{ kind: "transition", at: "nod_created", value }] });
    expect(answer("edg_part").session.active).toEqual(["nod_shipped"]);
    expect(of(answer("edg_part").trace, "answered")).toEqual([
      { type: "answered", kind: "transition", at: "nod_created", value: "edg_part" }
    ]);
    expect(answer(null).session.active).toEqual(["nod_created"]);
    expect(types(answer(null).trace)).toEqual(["received", "answered", "nothing"]);
  });

  it("does not offer none when a transition holds for sure", () => {
    const doc = payout();
    doc.canvases.cnv_orders.edges.edg_pay.guard = { expr: true };
    const result = walk(doc, begin(doc), "evt_paid");
    expect(result.question.candidates.map(candidate => candidate.value)).toEqual(["edg_part", "edg_pay"]);
  });

  it("looks at the state around it when the answer is none (§16.5)", () => {
    const doc = nested({
      inner: { edg_inner: { from: "nod_a1", to: "nod_a2", on: ["evt_stop"], guard: { text: "a is finished" } } }
    });
    const { session } = walk(doc, begin(doc), "evt_go");
    const result = step(doc, session, {
      do: { event: "evt_stop" },
      answers: [{ kind: "transition", at: "nod_busy/nod_a1", value: null }]
    });
    expect(result.session.active).toEqual(["nod_done"]);
  });

  it("asks instead of stopping when an expression cannot be evaluated, and says so", () => {
    const doc = orders();
    doc.canvases.cnv_orders.edges.edg_pay.guard = { expr: { regex: [{ var: "event.name" }, "^pa"] } };
    const result = walk(doc, begin(doc), "evt_paid");
    expect(result.status).toBe("needs");
    expect(of(result.trace, "warning")).toMatchObject([{ code: "unevaluated" }]);
  });

  it("refuses an answer to another question, a value it does not offer, and answers nothing asked for", () => {
    const doc = payout();
    const { session } = begin(doc);
    const paid = answers => step(doc, session, { do: { event: "evt_paid" }, answers });
    expect(paid([{ kind: "choice", at: "nod_created", value: "edg_pay" }])).toMatchObject({ code: "badAnswer" });
    expect(paid([{ kind: "transition", at: "nod_created", value: "edg_cancel" }])).toMatchObject({ code: "badAnswer" });
    const extra = [
      { kind: "transition", at: "nod_created", value: "edg_pay" },
      { kind: "transition", at: "nod_paid", value: null }
    ];
    expect(paid(extra)).toMatchObject({
      code: "extraAnswers",
      message: "1 answer(s) were given that nothing asked for"
    });
  });
});

describe("calls (simulator spec §5.8)", () => {
  const catalog = {
    endpoints: { ept_cancel: { name: "Cancel", method: "POST", path: "/orders/{id}/cancel" } },
    webhooks: { whk_bank: { name: "Bank notice", direction: "in", event: "evt_paid" } }
  };

  it("fires the transitions a call delivers (via), and the event an incoming webhook declares", () => {
    const doc = orders({ edg_cancel: { from: "nod_created", to: "nod_cancelled", via: "ept_cancel" } }, catalog);
    const cancelled = walk(doc, begin(doc), { do: { call: "ept_cancel" } });
    expect(cancelled.session.active).toEqual(["nod_cancelled"]);
    expect(cancelled.trace[0]).toEqual({
      type: "received",
      call: "ept_cancel",
      label: "POST /orders/{id}/cancel",
      payload: null
    });
    const paid = walk(doc, begin(doc), { do: { call: "whk_bank", payload: { amount: 3 } } });
    expect(paid.session.active).toEqual(["nod_paid"]);
    expect(walk(doc, begin(doc), { do: { call: "ept_nope" } })).toMatchObject({ code: "dangling" });
  });

  it("matches onMatch patterns segment by segment", () => {
    const doc = orders({ edg_halt: { from: "nod_created", to: "nod_cancelled", onMatch: ["leg.*"] } });
    expect(walk(doc, begin(doc), "evt_legs").session.active).toEqual(["nod_created"]);
    expect(walk(doc, begin(doc), "evt_legAB").session.active).toEqual(["nod_created"]);
    expect(walk(doc, begin(doc), "evt_legHalted").session.active).toEqual(["nod_cancelled"]);
  });

  it("delivers the event an incoming webhook declares even when the catalog no longer has it", () => {
    const doc = orders(
      { edg_halt: { from: "nod_created", to: "nod_cancelled", onMatch: ["leg.*"] } },
      { webhooks: { whk_gone: { name: "Gone", direction: "in", event: "evt_gone" } } }
    );
    const result = walk(doc, begin(doc), { do: { call: "whk_gone" } });
    expect(result).toMatchObject({ status: "done", session: { active: ["nod_created"] } });
  });
});

describe("a run is deterministic and pure (simulator spec §5)", () => {
  it("answers with an error, never an exception, even for a document the schema would refuse (§5.10)", () => {
    const doc = orders();
    doc.canvases.cnv_orders.edges.edg_halt = { from: "nod_created", to: "nod_cancelled", onMatch: [42] };
    expect(walk(doc, begin(doc), "evt_paid")).toMatchObject({ status: "error", code: "internal" });
  });

  it("gives byte-identical sessions for the same inputs, and never changes the session it is given", () => {
    const doc = nested({ inner: { edg_aNext: { from: "nod_a1", to: "nod_a2", on: ["evt_next"] } } });
    const once = () => walk(doc, begin(doc), "evt_go", "evt_next", "evt_stop");
    expect(JSON.stringify(once())).toBe(JSON.stringify(once()));
    const before = walk(doc, begin(doc), "evt_go");
    const frozen = JSON.stringify(before.session);
    step(doc, before.session, { do: { event: "evt_next" } });
    expect(JSON.stringify(before.session)).toBe(frozen);
  });
});

describe("the payments example", () => {
  it("starts the lifecycle in its three regions and pauses the expiry clock on verify.started", () => {
    const doc = paymentsDoc();
    const started = start(doc, {
      canvas: "cnv_lifecycle",
      at: AT,
      context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } }
    });
    expect(reachedOf(started.session)).toEqual({
      active: ["nod_complianceHold/nod_clear", "nod_expiryClock/nod_running", "nod_sendCrossBorder/nod_awaitingFunds"]
    });
    const paused = walk(doc, started, "evt_verifyStarted");
    expect(reachedOf(paused.session).active).toContain("nod_expiryClock/nod_paused");
  });
});
