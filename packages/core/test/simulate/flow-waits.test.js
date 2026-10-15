import { describe, expect, it } from "vitest";
import { moves, reachedOf, replay, start, step } from "../../src/simulate/index.js";
import { AT, docOf, events, flow, of, walk } from "./helpers.js";

/** A settlement: books the ledger and notifies at once, joins, then waits for the bank's confirmation or its window. */
function settle({ nodes = {}, edges = {}, canvases = {} } = {}) {
  return docOf(
    {
      cnv_settle: flow(
        "Settle",
        {
          nod_start: { kind: "start" },
          nod_split: { kind: "parallel", name: "at once" },
          nod_ledger: { kind: "call", name: "book the ledger", endpoint: "ept_ledger" },
          nod_notify: { kind: "emit", name: "notify", event: "evt_notified" },
          nod_join: { kind: "join", name: "both done" },
          nod_confirm: { kind: "wait", name: "bank confirms", on: ["evt_confirmed"], after: "tmr_window" },
          nod_done: { kind: "end" },
          ...nodes
        },
        {
          edg_a: { from: "nod_start", to: "nod_split" },
          edg_bLedger: { from: "nod_split", to: "nod_ledger" },
          edg_cNotify: { from: "nod_split", to: "nod_notify" },
          edg_d: { from: "nod_ledger", to: "nod_join" },
          edg_e: { from: "nod_notify", to: "nod_join" },
          edg_f: { from: "nod_join", to: "nod_confirm" },
          edg_g: { from: "nod_confirm", to: "nod_done" },
          ...edges
        }
      ),
      ...canvases
    },
    {
      events: events("confirmed", "notified", "acknowledged"),
      endpoints: { ept_ledger: { name: "Ledger", method: "POST", path: "/ledger" } },
      webhooks: { whk_bank: { name: "Bank notice", direction: "in", event: "evt_confirmed" } },
      timers: { tmr_window: { name: "confirmation window", duration: "PT2H" } }
    }
  );
}

const begin = (doc, extra = {}) => start(doc, { canvas: doc.root, at: AT, ...extra });

describe("parallel and join (spec §16.13)", () => {
  it("forks a token per outgoing edge, and the join lets one go on once a token came in on each edge", () => {
    const result = begin(settle());
    const tokens = of(result.trace, "token");
    expect(tokens[1]).toEqual({
      type: "token",
      change: "forked",
      from: "nod_split",
      to: ["nod_ledger", "nod_notify"],
      edges: ["edg_bLedger", "edg_cNotify"]
    });
    expect(tokens.find(entry => entry.change === "joined")).toEqual({
      type: "token",
      change: "joined",
      at: "nod_join",
      edges: ["edg_d", "edg_e"]
    });
    expect(result.session).toMatchObject({
      active: ["nod_confirm"],
      tokens: [{ id: 1, path: "nod_confirm", waiting: true }]
    });
  });

  it("holds the tokens that came in while a branch is still on its way", () => {
    const doc = settle({
      nodes: { nod_notify: { kind: "wait", name: "notice read", on: ["evt_acknowledged"] } }
    });
    const begun = begin(doc);
    expect(begun.session.active).toEqual(["nod_join", "nod_notify"]);
    expect(begun.session.tokens).toEqual([
      { id: 1, path: "nod_join", via: "edg_d" },
      { id: 2, path: "nod_notify", waiting: true }
    ]);
    expect(reachedOf(begun.session)).toEqual({ active: ["nod_join", "nod_notify"] });
    expect(walk(doc, begun, "evt_acknowledged").session.active).toEqual(["nod_confirm"]);
  });
});

describe("branches of different lengths (spec §16.13)", () => {
  it("join once: only tokens that have reached the join count, not those still on their way to it", () => {
    const doc = settle({
      nodes: { nod_audit: { kind: "call", name: "audit", endpoint: "ept_ledger" } },
      edges: { edg_d: { from: "nod_ledger", to: "nod_audit" }, edg_dAudit: { from: "nod_audit", to: "nod_join" } }
    });
    const result = begin(doc);
    expect(of(result.trace, "token").filter(entry => entry.change === "joined")).toHaveLength(1);
    expect(of(result.trace, "timerArmed")).toHaveLength(1);
    expect(result.session.timers).toHaveLength(1);
  });

  it("join once inside a body, whose owner then goes on once", () => {
    const doc = settle({
      nodes: { nod_confirm: { kind: "subflow", name: "inside", inner: { canvas: "cnv_inside" } } },
      canvases: {
        cnv_inside: flow(
          "Inside",
          {
            nod_iStart: { kind: "start" },
            nod_iSplit: { kind: "parallel" },
            nod_iA: { kind: "emit", name: "first", event: "evt_notified" },
            nod_iB: { kind: "emit", name: "second", event: "evt_notified" },
            nod_iC: { kind: "emit", name: "other", event: "evt_notified" },
            nod_iJoin: { kind: "join" },
            nod_iEnd: { kind: "end" }
          },
          {
            edg_iBegin: { from: "nod_iStart", to: "nod_iSplit" },
            edg_iA: { from: "nod_iSplit", to: "nod_iA" },
            edg_iC: { from: "nod_iSplit", to: "nod_iC" },
            edg_iAB: { from: "nod_iA", to: "nod_iB" },
            edg_iBJoin: { from: "nod_iB", to: "nod_iJoin" },
            edg_iCJoin: { from: "nod_iC", to: "nod_iJoin" },
            edg_iJoinEnd: { from: "nod_iJoin", to: "nod_iEnd" }
          }
        )
      }
    });
    const result = begin(doc);
    expect(result).toMatchObject({ status: "done", session: { active: [], ended: "success" } });
    expect(of(result.trace, "token").filter(entry => entry.change === "ended")).toHaveLength(2);
  });
});

describe("tokens held for good, and tokens side by side (simulator spec §4.3, §5.9)", () => {
  it("shows two tokens on one node twice, and one event lets every token waiting for it go on", () => {
    const doc = settle({
      nodes: { nod_hold: { kind: "wait", name: "held", on: ["evt_confirmed"] } },
      edges: {
        edg_bLedger: { from: "nod_split", to: "nod_hold" },
        edg_cNotify: { from: "nod_split", to: "nod_hold" },
        edg_d: { from: "nod_hold", to: "nod_done" }
      }
    });
    const begun = begin(doc);
    expect(reachedOf(begun.session)).toEqual({ active: ["nod_hold", "nod_hold"] });
    const released = walk(doc, begun, "evt_confirmed");
    expect(of(released.trace, "token").filter(entry => entry.change === "ended")).toHaveLength(2);
    expect(released.session.ended).toBe("success");
  });

  it("holds a token at a join for good when another branch ended before it, without ending the run", () => {
    const doc = settle({
      nodes: { nod_refused: { kind: "end", name: "refused", outcome: "failure" } },
      edges: { edg_hRefused: { from: "nod_ledger", to: "nod_refused", kind: "error" } }
    });
    const begun = begin(doc, { answers: [{ kind: "outcome", at: "nod_ledger", value: "error" }] });
    expect(begun.session).toMatchObject({ active: ["nod_join"], outcome: "failure" });
    expect(begun.session.ended).toBeUndefined();
    expect(moves(doc, begun.session)).toEqual([]);
  });
});

describe("wait (spec §16.13, simulator spec §5.9)", () => {
  it("warns at its timer's reminders, its deadline read from the run's own context", () => {
    const doc = settle();
    doc.catalog.timers.tmr_window = { name: "confirmation window", at: "context.deadline", reminders: ["-PT1H"] };
    const begun = begin(doc, { context: { cnv_settle: { deadline: "2026-01-05T12:00:00Z" } } });
    expect(begun.session.timers).toEqual([
      {
        kind: "reminder",
        path: "nod_confirm",
        token: 1,
        timer: "tmr_window",
        reminder: "-PT1H",
        due: "2026-01-05T11:00:00Z"
      },
      { kind: "wait", path: "nod_confirm", token: 1, timer: "tmr_window", due: "2026-01-05T12:00:00Z" }
    ]);
    const later = walk(doc, begun, { do: { wait: "PT2H" } });
    expect(of(later.trace, "warning")).toMatchObject([
      { code: "reminder", message: "confirmation window: reminder -PT1H from its deadline", path: "nod_confirm" }
    ]);
    expect(later.session.active).toEqual(["nod_confirm"]);
  });

  it("arms its timer, and goes on when its event comes, cancelling the timer", () => {
    const doc = settle();
    const begun = begin(doc);
    expect(begun.session.timers).toEqual([
      { kind: "wait", path: "nod_confirm", token: 1, timer: "tmr_window", due: "2026-01-05T11:00:00Z" }
    ]);
    const confirmed = walk(doc, begun, "evt_confirmed");
    expect(confirmed.session).toMatchObject({ active: [], ended: "success", timers: [] });
    expect(of(confirmed.trace, "timerCancelled")).toMatchObject([{ kind: "wait", path: "nod_confirm" }]);
    expect(walk(doc, begun, "evt_acknowledged").trace.map(entry => entry.type)).toEqual(["received", "nothing"]);
  });

  it("goes on when its timer falls due", () => {
    const doc = settle();
    const begun = begin(doc);
    expect(walk(doc, begun, { do: { wait: "PT1H" } }).session.active).toEqual(["nod_confirm"]);
    const late = walk(doc, begun, { do: { wait: "PT3H" } });
    expect(late.session).toMatchObject({ clock: "2026-01-05T12:00:00Z", ended: "success" });
    expect(of(late.trace, "timerFired")).toMatchObject([{ kind: "wait", path: "nod_confirm" }]);
    expect(walk(doc, begun, { do: { wait: "next" } }).session).toMatchObject({ clock: "2026-01-05T11:00:00Z" });
  });

  it("goes on when an incoming webhook delivers its event", () => {
    const doc = settle();
    expect(walk(doc, begin(doc), { do: { call: "whk_bank" } }).session.ended).toBe("success");
  });

  it("asks whether it worked when it has an error edge, once released", () => {
    const doc = settle({
      nodes: { nod_late: { kind: "end", outcome: "failure" } },
      edges: { edg_hLate: { from: "nod_confirm", to: "nod_late", kind: "error" } }
    });
    const begun = begin(doc);
    expect(walk(doc, begun, "evt_confirmed").question).toMatchObject({ kind: "outcome", at: "nod_confirm" });
    const failed = step(doc, begun.session, {
      do: { wait: "PT2H" },
      answers: [{ kind: "outcome", at: "nod_confirm", value: "error" }]
    });
    expect(failed.session.ended).toBe("failure");
  });

  it("waits inside a body under its owner's path, and the body goes on when released", () => {
    const doc = settle({
      nodes: {
        nod_confirm: {
          kind: "forEach",
          name: "each bank",
          items: { var: "vars.input.banks" },
          inner: { canvas: "cnv_bank" }
        }
      },
      canvases: {
        cnv_bank: flow(
          "One bank",
          {
            nod_start: { kind: "start" },
            nod_wait: { kind: "wait", name: "this bank confirms", on: ["evt_confirmed"] },
            nod_end: { kind: "end" }
          },
          { edg_a: { from: "nod_start", to: "nod_wait" }, edg_b: { from: "nod_wait", to: "nod_end" } }
        )
      }
    });
    const begun = begin(doc, { input: { banks: ["a", "b"] } });
    expect(begun.session.active).toEqual(["nod_confirm", "nod_confirm/nod_wait"]);
    expect(reachedOf(begun.session)).toEqual({ active: ["nod_confirm/nod_wait"] });
    const second = walk(doc, begun, "evt_confirmed");
    expect(second.session.tokens).toMatchObject([
      { path: "nod_confirm", body: { index: 1 } },
      { path: "nod_confirm/nod_wait", owner: 1, waiting: true }
    ]);
    expect(walk(doc, second, "evt_confirmed").session.ended).toBe("success");
  });
});

describe("a body with branches (simulator spec §5.9)", () => {
  it("fails its owner once its last token has ended, when one of them failed", () => {
    const doc = settle({
      nodes: { nod_confirm: { kind: "subflow", name: "both banks", inner: { canvas: "cnv_banks" } } },
      canvases: {
        cnv_banks: flow(
          "Both banks",
          {
            nod_start: { kind: "start" },
            nod_split: { kind: "parallel" },
            nod_refused: { kind: "end", name: "refused", outcome: "failure" },
            nod_wait: { kind: "wait", name: "the other confirms", on: ["evt_confirmed"] },
            nod_end: { kind: "end" }
          },
          {
            edg_a: { from: "nod_start", to: "nod_split" },
            edg_b: { from: "nod_split", to: "nod_refused" },
            edg_c: { from: "nod_split", to: "nod_wait" },
            edg_d: { from: "nod_wait", to: "nod_end" }
          }
        )
      }
    });
    const begun = begin(doc);
    expect(begun.session.tokens).toMatchObject([
      { path: "nod_confirm", body: { failed: true } },
      { path: "nod_confirm/nod_wait", waiting: true }
    ]);
    expect(walk(doc, begun, "evt_confirmed").session).toMatchObject({ active: [], ended: "failure" });
  });
});

describe("a flow's moves and scenarios (simulator spec §5.2, §4.6)", () => {
  it("lists what its waits wait for, events and timers, with where each leads", () => {
    const doc = settle();
    const region = { key: "", name: "Settle" };
    expect(moves(doc, begin(doc).session)).toEqual([
      {
        do: { event: "evt_confirmed" },
        label: "confirmed",
        kind: "event",
        region,
        edges: ["edg_g"],
        outcome: { to: [], ended: "success" }
      },
      {
        do: { wait: "PT2H" },
        label: "confirmation window",
        kind: "timer",
        region,
        due: "2026-01-05T11:00:00Z",
        edges: ["edg_g"],
        outcome: { to: [], ended: "success" }
      }
    ]);
  });

  it("is the same every time, and never changes the session it is given", () => {
    const doc = settle();
    const begun = begin(doc);
    const frozen = JSON.stringify(begun.session);
    const a = step(doc, begun.session, { do: { event: "evt_confirmed" } });
    const b = step(doc, begun.session, { do: { event: "evt_confirmed" } });
    expect(JSON.stringify(a.session)).toBe(JSON.stringify(b.session));
    expect(JSON.stringify(begun.session)).toBe(frozen);
  });

  it("replays a recorded flow run the same, and diverges once the design changes", () => {
    const doc = settle();
    const scenario = {
      name: "Confirmed in time",
      canvas: "cnv_settle",
      start: { at: AT },
      steps: [{ do: { event: "evt_confirmed" }, reached: { active: [], ended: "success" } }]
    };
    expect(replay(doc, scenario).first).toBeNull();
    const changed = settle({
      nodes: { nod_confirm: { kind: "wait", name: "bank confirms", on: ["evt_acknowledged"] } }
    });
    expect(replay(changed, scenario).steps[0]).toMatchObject({
      status: "diverged",
      now: { active: ["nod_confirm"] },
      reason: "reached"
    });
  });
});
