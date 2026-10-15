import { describe, expect, it } from "vitest";
import { check } from "../../src/rules/index.js";
import { reachedOf, step } from "../../src/simulate/index.js";
import { AT, begin, docOf, events, machine, of, walk } from "./helpers.js";

/** A refund decided at a choice: by the amount when an expression says so, else by a person's word. */
function refunds(branches, nodes = {}) {
  return docOf(
    {
      cnv_refunds: machine(
        "Refunds",
        {
          nod_start: { kind: "initial" },
          nod_asked: { kind: "state", name: "asked" },
          nod_decide: { kind: "choice", name: "how much?" },
          nod_full: { kind: "state", name: "full", terminal: true },
          nod_partial: { kind: "state", name: "partial", terminal: true },
          nod_refused: { kind: "state", name: "refused", terminal: true },
          ...nodes
        },
        {
          edg_begin: { from: "nod_start", to: "nod_asked" },
          edg_decide: {
            from: "nod_asked",
            to: "nod_decide",
            on: ["evt_reviewed"],
            actions: [{ assign: { "context.amount": { var: "event.payload.amount" } } }]
          },
          ...branches
        }
      )
    },
    { events: events("reviewed") }
  );
}

const reviewed = amount => ({ do: { event: "evt_reviewed", payload: { amount } } });

describe("choice (spec §16.7)", () => {
  const byAmount = {
    edg_aFull: { from: "nod_decide", to: "nod_full", guard: { expr: { ">=": [{ var: "context.amount" }, 100] } } },
    edg_bPartial: { from: "nod_decide", to: "nod_partial", guard: { expr: { ">": [{ var: "context.amount" }, 0] } } },
    edg_cElse: { from: "nod_decide", to: "nod_refused", else: true }
  };

  it("takes the first branch in ID order whose guard holds, reading what the transition just assigned", () => {
    const doc = refunds(byAmount);
    expect(walk(doc, begin(doc), reviewed(150)).session.active).toEqual(["nod_full"]);
    const partial = walk(doc, begin(doc), reviewed(40));
    expect(partial.session.active).toEqual(["nod_partial"]);
    expect(of(partial.trace, "transition").map(entry => entry.edge)).toEqual(["edg_decide", "edg_bPartial"]);
  });

  it("takes the else branch when no other holds", () => {
    const doc = refunds(byAmount);
    expect(walk(doc, begin(doc), reviewed(0)).session.active).toEqual(["nod_refused"]);
  });

  it("asks which branch is taken when a guard is written in words, offering the branches that may still hold", () => {
    const doc = refunds({
      ...byAmount,
      edg_aFull: { from: "nod_decide", to: "nod_full", guard: { text: "the customer is a partner" } }
    });
    const asked = walk(doc, begin(doc), reviewed(0));
    expect(asked.question).toEqual({
      kind: "choice",
      at: "nod_decide",
      choice: "how much?",
      candidates: [
        { value: "edg_aFull", to: "full", guard: { text: "the customer is a partner" } },
        { value: "edg_cElse", to: "refused", guard: null, else: true }
      ]
    });
    const { session } = begin(doc);
    const answered = step(doc, session, {
      ...reviewed(0),
      answers: [{ kind: "choice", at: "nod_decide", value: "edg_aFull" }]
    });
    expect(answered.session.active).toEqual(["nod_full"]);
  });

  it("offers the branches up to the first that holds for sure, and the else only when none does", () => {
    const doc = refunds({
      ...byAmount,
      edg_aFull: { from: "nod_decide", to: "nod_full", guard: { text: "the customer is a partner" } }
    });
    const asked = walk(doc, begin(doc), reviewed(40));
    expect(asked.question.candidates.map(candidate => candidate.value)).toEqual(["edg_aFull", "edg_bPartial"]);
    const answer = value => ({ ...reviewed(40), answers: [{ kind: "choice", at: "nod_decide", value }] });
    expect(step(doc, begin(doc).session, answer("edg_cElse"))).toMatchObject({ status: "error", code: "badAnswer" });
    expect(step(doc, begin(doc).session, answer("edg_bPartial")).session.active).toEqual(["nod_partial"]);
  });

  it("stops a chain of choices that comes back to itself instead of running forever, and check reports it (§16.12)", () => {
    const doc = refunds(
      {
        edg_aOn: { from: "nod_decide", to: "nod_again", else: true },
        edg_bBack: { from: "nod_again", to: "nod_decide", else: true }
      },
      { nod_again: { kind: "choice", name: "again?" } }
    );
    expect(walk(doc, begin(doc), reviewed(5))).toMatchObject({ status: "error", code: "livelock" });
    const steps = [{ do: reviewed(5).do, reached: { active: ["nod_full"] } }];
    doc.annotations = { scenarios: { scn_loop: { name: "Loop", canvas: "cnv_refunds", start: { at: AT }, steps } } };
    expect(check(doc).find(problem => problem.code === "scenario.diverged")).toMatchObject({ target: "scn_loop" });
  });

  it("stops when no branch holds and there is no else", () => {
    const doc = refunds({ edg_aFull: byAmount.edg_aFull });
    expect(walk(doc, begin(doc), reviewed(5))).toMatchObject({
      status: "error",
      code: "stuck",
      message: "No branch of how much? holds, and it has no else"
    });
  });
});

/** Retries: `trying` goes back to itself while attempts remain, then gives up. */
function retries(guard) {
  return docOf(
    {
      cnv_retries: machine(
        "Retries",
        {
          nod_start: { kind: "initial" },
          nod_trying: { kind: "state", name: "trying" },
          nod_waiting: { kind: "state", name: "waiting" },
          nod_failed: { kind: "state", name: "failed", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_waiting" },
          edg_try: { from: "nod_waiting", to: "nod_trying", on: ["evt_failed"] },
          edg_again: {
            from: "nod_trying",
            to: "nod_waiting",
            always: true,
            guard,
            actions: [{ assign: { "context.attempts": { "+": [{ var: "context.attempts" }, 1] } } }]
          },
          edg_giveUp: {
            from: "nod_trying",
            to: "nod_failed",
            always: true,
            guard: { expr: { ">=": [{ var: "context.attempts" }, 3] } }
          }
        }
      )
    },
    { events: events("failed") }
  );
}

describe("always transitions (spec §16.2, §16.12)", () => {
  it("takes them as soon as their guards hold, until the machine is stable", () => {
    const doc = retries({ expr: { "<": [{ var: "context.attempts" }, 3] } });
    const started = begin(doc, { context: { cnv_retries: { attempts: 0 } } });
    const once = walk(doc, started, "evt_failed");
    expect(once.session.active).toEqual(["nod_waiting"]);
    expect(once.session.context).toEqual({ cnv_retries: { attempts: 1 } });
    const gaveUp = walk(doc, once, "evt_failed", "evt_failed", "evt_failed");
    expect(gaveUp.session.active).toEqual(["nod_failed"]);
  });

  it("asks again each time a guard written in words is met, in order", () => {
    const doc = retries({ text: "the provider may succeed" });
    const { session } = begin(doc, { context: { cnv_retries: { attempts: 0 } } });
    const first = step(doc, session, { do: { event: "evt_failed" } });
    expect(first.question).toMatchObject({ kind: "transition", at: "nod_trying", trigger: null });
    const answer = value => ({ kind: "transition", at: "nod_trying", value });
    const result = step(doc, session, { do: { event: "evt_failed" }, answers: [answer("edg_again")] });
    expect(result.session.active).toEqual(["nod_waiting"]);
    expect(step(doc, session, { do: { event: "evt_failed" }, answers: [answer(null)] }).session.active).toEqual([
      "nod_trying"
    ]);
  });

  it("stops a loop of always transitions that never settles (§16.12)", () => {
    const doc = retries({ expr: true });
    doc.canvases.cnv_retries.edges.edg_back = { from: "nod_waiting", to: "nod_trying", always: true };
    expect(begin(doc, { context: { cnv_retries: { attempts: -1000 } } })).toMatchObject({
      status: "error",
      code: "livelock"
    });
  });
});

/** A send whose payout and refund regions finish on their own; `done` transitions wait for them. */
function payouts(doneEdge) {
  return docOf(
    {
      cnv_send: machine(
        "Send",
        {
          nod_start: { kind: "initial" },
          nod_sending: { kind: "state", name: "sending", inner: { canvas: "cnv_legs" } },
          nod_sent: { kind: "state", name: "sent", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_sending" },
          edg_done: { from: "nod_sending", to: "nod_sent", ...doneEdge }
        }
      ),
      cnv_legs: machine(
        "Legs",
        {
          nod_payStart: { kind: "initial", region: "rgn_payout" },
          nod_paying: { kind: "state", name: "paying", region: "rgn_payout" },
          nod_paid: { kind: "state", name: "paid", region: "rgn_payout", terminal: true },
          nod_feeStart: { kind: "initial", region: "rgn_fee" },
          nod_charging: { kind: "state", name: "charging", region: "rgn_fee" },
          nod_charged: { kind: "state", name: "charged", region: "rgn_fee", terminal: true }
        },
        {
          edg_payBegin: { from: "nod_payStart", to: "nod_paying" },
          edg_pay: { from: "nod_paying", to: "nod_paid", on: ["evt_paid"] },
          edg_feeBegin: { from: "nod_feeStart", to: "nod_charging" },
          edg_charge: { from: "nod_charging", to: "nod_charged", on: ["evt_charged"] }
        },
        { regions: { rgn_payout: { name: "payout" }, rgn_fee: { name: "fee" } } }
      )
    },
    { events: events("paid", "charged") }
  );
}

describe("completion (spec §16.9)", () => {
  it("enables done: true once every region inside the state is complete", () => {
    const doc = payouts({ done: true });
    const paid = walk(doc, begin(doc), "evt_paid");
    expect(reachedOf(paid.session)).toEqual({ active: ["nod_sending/nod_charging", "nod_sending/nod_paid"] });
    const both = walk(doc, paid, "evt_charged");
    expect(reachedOf(both.session)).toEqual({ active: ["nod_sent"], ended: "done" });
  });

  it("enables done on a region once that region is complete", () => {
    const doc = payouts({ done: "rgn_payout" });
    expect(walk(doc, begin(doc), "evt_paid").session.active).toEqual(["nod_sent"]);
  });

  it("ends a run when every region of its top machine is complete", () => {
    const doc = payouts({ done: true });
    expect(walk(doc, begin(doc), "evt_paid").session.ended).toBeUndefined();
    expect(walk(doc, begin(doc), "evt_paid", "evt_charged").session.ended).toBe("done");
  });
});

/** An expiry clock that can be suspended and resumes where it was, through a history node. */
function clock(depth) {
  return docOf(
    {
      cnv_top: machine(
        "Top",
        {
          nod_start: { kind: "initial" },
          nod_clock: { kind: "state", name: "clock", inner: { canvas: "cnv_clock" } },
          nod_suspended: { kind: "state", name: "suspended" }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_clock" },
          edg_suspend: { from: "nod_clock", to: "nod_suspended", on: ["evt_suspend"] },
          edg_resume: { from: "nod_suspended", to: "nod_clock", on: ["evt_resume"] }
        }
      ),
      cnv_clock: machine(
        "Clock",
        {
          nod_clockStart: { kind: "initial" },
          nod_history: { kind: "history", ...(depth ? { depth } : {}) },
          nod_running: { kind: "state", name: "running" },
          nod_paused: { kind: "state", name: "paused", inner: { canvas: "cnv_paused" } }
        },
        {
          edg_toHistory: { from: "nod_clockStart", to: "nod_history" },
          edg_default: { from: "nod_history", to: "nod_running" },
          edg_pause: { from: "nod_running", to: "nod_paused", on: ["evt_pause"] }
        }
      ),
      cnv_paused: machine(
        "Paused",
        {
          nod_pausedStart: { kind: "initial" },
          nod_checking: { kind: "state", name: "checking" },
          nod_frozen: { kind: "state", name: "frozen" }
        },
        {
          edg_pausedBegin: { from: "nod_pausedStart", to: "nod_checking" },
          edg_freeze: { from: "nod_checking", to: "nod_frozen", on: ["evt_freeze"] }
        }
      )
    },
    { events: events("suspend", "resume", "pause", "freeze") }
  );
}

describe("history (spec §16.6)", () => {
  it("follows its own transition the first time, when there is nothing to restore", () => {
    const doc = clock();
    expect(reachedOf(begin(doc).session).active).toEqual(["nod_clock/nod_running"]);
  });

  it("restores the direct child the state was left in (shallow), entering it afresh", () => {
    const doc = clock();
    const left = walk(doc, begin(doc), "evt_pause", "evt_freeze", "evt_suspend");
    expect(left.session.history).toEqual({
      nod_clock: {
        "": { state: "nod_clock/nod_paused", inside: ["nod_clock/nod_paused", "nod_clock/nod_paused/nod_frozen"] }
      }
    });
    const back = walk(doc, left, "evt_resume");
    expect(reachedOf(back.session).active).toEqual(["nod_clock/nod_paused/nod_checking"]);
    expect(of(back.trace, "restored")).toEqual([
      { type: "restored", history: "nod_clock/nod_history", state: "nod_clock/nod_paused" }
    ]);
  });

  it("restores everything inside it too (deep)", () => {
    const doc = clock("deep");
    const back = walk(doc, begin(doc), "evt_pause", "evt_freeze", "evt_suspend", "evt_resume");
    expect(reachedOf(back.session).active).toEqual(["nod_clock/nod_paused/nod_frozen"]);
  });

  it("always follows its own transition at the top of a run, where no state is around it", () => {
    const doc = clock();
    const top = doc.canvases.cnv_top;
    top.nodes.nod_topHistory = { kind: "history" };
    top.edges.edg_begin.to = "nod_topHistory";
    top.edges.edg_topDefault = { from: "nod_topHistory", to: "nod_suspended" };
    const result = walk(doc, begin(doc), "evt_resume", "evt_suspend");
    expect(result.session.active).toEqual(["nod_suspended"]);
    expect(result.session.history).toEqual({
      nod_clock: { "": { state: "nod_clock/nod_running", inside: ["nod_clock/nod_running"] } }
    });
  });

  it("stops a history whose own transition comes back to it, instead of running forever (§16.12)", () => {
    const doc = clock();
    const top = doc.canvases.cnv_top;
    top.nodes.nod_topHistory = { kind: "history" };
    top.edges.edg_begin.to = "nod_topHistory";
    top.edges.edg_topDefault = { from: "nod_topHistory", to: "nod_topHistory" };
    expect(begin(doc)).toMatchObject({ status: "error", code: "livelock" });
  });
});

describe("starting through entries (spec §16.2)", () => {
  /** An order made through the API or by an operator: entries, and no initial node. */
  function made(entries) {
    const nodes = { nod_pending: { kind: "state", name: "pending" } };
    const edges = {};
    for (const name of entries) {
      nodes[`nod_${name}`] = { kind: "entry", name };
      edges[`edg_${name}`] = { from: `nod_${name}`, to: "nod_pending" };
    }
    return docOf({ cnv_orders: machine("Orders", nodes, edges) });
  }

  it("starts a region that has no initial node at its only entry", () => {
    const doc = made(["api"]);
    expect(begin(doc).session.active).toEqual(["nod_pending"]);
  });

  it("needs one of several entries to be chosen", () => {
    const doc = made(["api", "operator"]);
    expect(begin(doc)).toMatchObject({
      status: "error",
      code: "noStart",
      message: "Orders has no initial node; choose one of its entries to start from"
    });
    expect(begin(doc, { entry: "nod_operator" }).session.active).toEqual(["nod_pending"]);
  });
});
