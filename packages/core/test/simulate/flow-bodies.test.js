import { describe, expect, it } from "vitest";
import { start } from "../../src/simulate/index.js";
import { AT, docOf, flow, of } from "./helpers.js";

/** A batch: pays each payout, retries the bank while it allows, then files a report (a definition used as a subflow). */
function batch({ nodes = {}, edges = {}, canvases = {} } = {}) {
  return docOf(
    {
      cnv_batch: flow(
        "Batch",
        {
          nod_start: { kind: "start" },
          nod_each: {
            kind: "forEach",
            name: "each payout",
            items: { var: "vars.input.payouts" },
            as: "payout",
            inner: { canvas: "cnv_payOne" }
          },
          nod_retry: {
            kind: "while",
            name: "retry",
            condition: { expr: { "<": [{ var: ["vars.tries", 0] }, 2] } },
            inner: { canvas: "cnv_try" }
          },
          nod_report: { kind: "subflow", name: "report", inner: { definition: "def_report" } },
          nod_done: { kind: "end" },
          ...nodes
        },
        {
          edg_a: { from: "nod_start", to: "nod_each" },
          edg_b: { from: "nod_each", to: "nod_retry" },
          edg_c: { from: "nod_retry", to: "nod_report" },
          edg_d: { from: "nod_report", to: "nod_done" },
          ...edges
        }
      ),
      cnv_payOne: flow(
        "Pay one",
        {
          nod_start: { kind: "start" },
          nod_add: {
            kind: "assign",
            name: "add it up",
            set: { "vars.total": { "+": [{ var: ["vars.total", 0] }, { var: "vars.payout.amount" }] } }
          },
          nod_end: { kind: "end" }
        },
        { edg_a: { from: "nod_start", to: "nod_add" }, edg_b: { from: "nod_add", to: "nod_end" } }
      ),
      cnv_try: flow(
        "Try",
        {
          nod_start: { kind: "start" },
          nod_count: { kind: "assign", name: "count", set: { "vars.tries": { "+": [{ var: ["vars.tries", 0] }, 1] } } },
          nod_end: { kind: "end" }
        },
        { edg_a: { from: "nod_start", to: "nod_count" }, edg_b: { from: "nod_count", to: "nod_end" } }
      ),
      cnv_report: flow(
        "Report",
        {
          nod_start: { kind: "start" },
          nod_file: { kind: "action", name: "file it", action: "act_file" },
          nod_end: { kind: "end" }
        },
        { edg_a: { from: "nod_start", to: "nod_file" }, edg_b: { from: "nod_file", to: "nod_end" } }
      ),
      ...canvases
    },
    { actions: { act_file: { name: "File the report" } } },
    { def_report: { kind: "flow", name: "Report", canvas: "cnv_report" } }
  );
}

const payouts = [{ amount: 10 }, { amount: 5 }];
const run = (doc, input = { payouts }, answers) => start(doc, { canvas: "cnv_batch", at: AT, input, answers });

describe("forEach (spec §16.13)", () => {
  it("runs its body once per item, the item in vars.<as>, the body's tokens under its path", () => {
    const result = run(batch());
    expect(result.session).toMatchObject({ ended: "success", vars: { total: 15, payout: { amount: 5 } } });
    const bound = of(result.trace, "assigned").filter(entry => entry.path === "vars.payout");
    expect(bound).toEqual([
      { type: "assigned", path: "vars.payout", value: { amount: 10 }, at: "nod_each" },
      { type: "assigned", path: "vars.payout", value: { amount: 5 }, at: "nod_each" }
    ]);
    expect(of(result.trace, "token").slice(1, 5)).toEqual([
      { type: "token", change: "moved", from: "nod_each", to: "nod_each/nod_start" },
      { type: "token", change: "moved", edge: "edg_a", from: "nod_each/nod_start", to: "nod_each/nod_add" },
      { type: "token", change: "moved", edge: "edg_b", from: "nod_each/nod_add", to: "nod_each/nod_end" },
      { type: "token", change: "ended", at: "nod_each/nod_end", outcome: "success" }
    ]);
  });

  it("goes straight on with no items", () => {
    const result = run(batch(), { payouts: [] });
    expect(result.session.vars).toMatchObject({ input: { payouts: [] }, tries: 2 });
    expect(of(result.trace, "assigned").some(entry => entry.path === "vars.payout")).toBe(false);
  });

  it("asks how many items there are when its items cannot be told, each item null (simulator spec §5.4)", () => {
    const doc = batch({
      nodes: { nod_each: { kind: "forEach", name: "each payout", as: "payout", inner: { canvas: "cnv_payOne" } } }
    });
    expect(run(doc).question).toEqual({ kind: "count", at: "nod_each", node: "each payout", items: null });
    const twice = run(doc, { payouts }, [{ kind: "count", at: "nod_each", value: 2 }]);
    expect(
      of(twice.trace, "assigned")
        .filter(entry => entry.path === "vars.payout")
        .map(entry => entry.value)
    ).toEqual([null, null]);
    const none = run(doc, { payouts }, [{ kind: "count", at: "nod_each", value: 0 }]);
    expect(none.session.vars).not.toHaveProperty("payout");
    for (const value of [-1, 1.5, "2"]) {
      expect(run(doc, { payouts }, [{ kind: "count", at: "nod_each", value }])).toMatchObject({ code: "badAnswer" });
    }
    const notAList = run(batch(), { payouts: 3 });
    expect(notAList.question.kind).toBe("count");
    expect(of(notAList.trace, "warning")).toMatchObject([{ code: "unevaluated" }]);
  });
});

describe("bodies that would run without end (simulator spec §5.10)", () => {
  it("stop as a livelock: a while that always holds, a count of a billion items", () => {
    const forever = batch({
      nodes: { nod_retry: { kind: "while", name: "retry", condition: { expr: true }, inner: { canvas: "cnv_try" } } }
    });
    expect(run(forever)).toMatchObject({ status: "error", code: "livelock" });
    const counted = batch({
      nodes: { nod_each: { kind: "forEach", name: "each payout", as: "payout", inner: { canvas: "cnv_payOne" } } }
    });
    const billion = run(counted, { payouts }, [{ kind: "count", at: "nod_each", value: 10 ** 9 }]);
    expect(billion).toMatchObject({ status: "error", code: "livelock" });
  });

  it("say so without calling a long list endless: the same limit stops a list of a thousand", () => {
    const many = Array.from({ length: 1000 }, () => ({ amount: 1 }));
    expect(run(batch(), { payouts: many })).toMatchObject({
      code: "livelock",
      message: "More than 1000 node visits in one step: a loop that does not end, or more than a step can run"
    });
  });

  it("ask how many items there are when the run was started without its input", () => {
    expect(start(batch(), { canvas: "cnv_batch", at: AT }).question).toMatchObject({ kind: "count", at: "nod_each" });
  });
});

describe("while (spec §16.13)", () => {
  it("runs its body while its condition holds", () => {
    const result = run(batch());
    expect(result.session.vars.tries).toBe(2);
    expect(of(result.trace, "action")).toEqual([
      { type: "action", action: "act_file", args: {}, at: "nod_report/nod_file" }
    ]);
  });

  it("asks before each round when its condition is written in words", () => {
    const doc = batch({
      nodes: {
        nod_retry: {
          kind: "while",
          name: "retry",
          condition: { text: "the bank allows it" },
          inner: { canvas: "cnv_try" }
        }
      }
    });
    expect(run(doc).question).toEqual({
      kind: "branch",
      at: "nod_retry",
      node: "retry",
      condition: { text: "the bank allows it" },
      candidates: [
        { value: true, to: "Try" },
        { value: false, to: "report" }
      ]
    });
    const once = run(doc, { payouts }, [
      { kind: "branch", at: "nod_retry", value: true },
      { kind: "branch", at: "nod_retry", value: false }
    ]);
    expect(once.session).toMatchObject({ ended: "success", vars: { tries: 1 } });
  });
});

describe("bodies (simulator spec §5.9)", () => {
  it("run a definition's body as a subflow", () => {
    expect(of(run(batch()).trace, "token").filter(entry => entry.to?.startsWith("nod_report/"))).toHaveLength(3);
  });

  it("fail their owner when they end in failure: its error edge is taken, else its token ends in failure", () => {
    const failing = batch();
    failing.canvases.cnv_report.nodes.nod_end.outcome = "failure";
    expect(run(failing).session.ended).toBe("failure");
    const handled = batch({
      nodes: { nod_sorry: { kind: "end", name: "sorry", outcome: "success" } },
      edges: { edg_eFails: { from: "nod_report", to: "nod_sorry", kind: "error" } }
    });
    expect(run(handled)).toMatchObject({ status: "done", session: { ended: "success" } });
    handled.canvases.cnv_report.nodes.nod_end.outcome = "failure";
    const result = run(handled);
    expect(result.session.ended).toBe("success");
    expect(result.question).toBeUndefined();
    expect(of(result.trace, "token").at(-2)).toMatchObject({ change: "moved", edge: "edg_eFails" });
  });

  it("stop a run that has no body to run, a body without a start, or a body that contains itself", () => {
    const empty = batch({ nodes: { nod_retry: { kind: "while", name: "retry", condition: { expr: true } } } });
    expect(run(empty)).toMatchObject({ status: "error", code: "noStart", message: "retry has no flow inside to run" });
    const startless = batch();
    delete startless.canvases.cnv_try.nodes.nod_start;
    delete startless.canvases.cnv_try.edges.edg_a;
    expect(run(startless)).toMatchObject({ status: "error", code: "noStart", message: "Try has no start node" });
    const itself = batch();
    itself.canvases.cnv_report.nodes.nod_again = {
      kind: "subflow",
      name: "again",
      inner: { definition: "def_report" }
    };
    itself.canvases.cnv_report.edges.edg_b = { from: "nod_file", to: "nod_again" };
    itself.canvases.cnv_report.edges.edg_c = { from: "nod_again", to: "nod_end" };
    expect(run(itself)).toMatchObject({ status: "error", code: "cycle", message: "again contains itself" });
  });
});
