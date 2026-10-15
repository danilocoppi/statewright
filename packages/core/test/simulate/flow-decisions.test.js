import { describe, expect, it } from "vitest";
import { start } from "../../src/simulate/index.js";
import { AT, docOf, flow, of } from "./helpers.js";

/** A payout: routed by its rail, paid through the bank, a big one approved; a failed payment is apologised for. */
function payout({ nodes = {}, edges = {} } = {}) {
  return docOf(
    {
      cnv_payout: flow(
        "Payout",
        {
          nod_start: { kind: "start" },
          nod_route: { kind: "switch", name: "route", on: { var: "vars.input.rail" } },
          nod_pix: { kind: "call", name: "pay by pix", endpoint: "ept_pix" },
          nod_ted: { kind: "call", name: "pay by ted", endpoint: "ept_ted" },
          nod_manual: { kind: "action", name: "review by hand", action: "act_review" },
          nod_big: { kind: "if", name: "big?", condition: { expr: { ">": [{ var: "vars.input.amount" }, 100] } } },
          nod_approve: { kind: "action", name: "approve", action: "act_approve" },
          nod_sorry: { kind: "action", name: "say sorry", action: "act_sorry" },
          nod_done: { kind: "end" },
          nod_failed: { kind: "end", outcome: "failure" },
          ...nodes
        },
        {
          edg_a: { from: "nod_start", to: "nod_route" },
          edg_bPix: { from: "nod_route", to: "nod_pix", kind: "case", case: "pix" },
          edg_cTed: { from: "nod_route", to: "nod_ted", kind: "case", case: "ted" },
          edg_dOther: { from: "nod_route", to: "nod_manual", kind: "default" },
          edg_e: { from: "nod_pix", to: "nod_big" },
          edg_fYes: { from: "nod_big", to: "nod_approve", kind: "true" },
          edg_gNo: { from: "nod_big", to: "nod_done", kind: "false" },
          edg_h: { from: "nod_approve", to: "nod_done" },
          edg_i: { from: "nod_ted", to: "nod_done" },
          edg_j: { from: "nod_manual", to: "nod_done" },
          edg_k: { from: "nod_sorry", to: "nod_failed" },
          ...edges
        }
      )
    },
    {
      actions: Object.fromEntries(["review", "approve", "sorry"].map(name => [`act_${name}`, { name }])),
      endpoints: {
        ept_pix: { name: "Pix", method: "POST", path: "/pix" },
        ept_ted: { name: "TED", method: "POST", path: "/ted" }
      }
    }
  );
}

const run = (doc, input, answers) => start(doc, { canvas: "cnv_payout", at: AT, input, answers });
const moved = result => of(result.trace, "token").map(entry => entry.edge ?? entry.change);

describe("switch (spec §16.13)", () => {
  it("follows the edge whose case equals the value, else the default", () => {
    expect(moved(run(payout(), { rail: "ted" }))).toEqual(["edg_a", "edg_cTed", "edg_i", "ended"]);
    expect(moved(run(payout(), { rail: "wire" }))).toEqual(["edg_a", "edg_dOther", "edg_j", "ended"]);
  });

  it("compares cases as JSON values, and stops when none matches and there is no default", () => {
    const doc = payout({ nodes: { nod_route: { kind: "switch", name: "route", on: { var: "vars.input" } } } });
    doc.canvases.cnv_payout.edges.edg_bPix.case = { rail: "pix", amount: 5 };
    delete doc.canvases.cnv_payout.edges.edg_dOther;
    expect(moved(run(doc, { amount: 5, rail: "pix" }))).toContain("edg_bPix");
    expect(run(doc, { rail: "wire" })).toMatchObject({
      status: "error",
      code: "stuck",
      message: 'No case of route matches {"rail":"wire"}, and it has no default'
    });
  });

  it("asks which edge is taken when its value cannot be told (simulator spec §5.4)", () => {
    const doc = payout({ nodes: { nod_route: { kind: "switch", name: "route" } } });
    const asked = run(doc, { rail: "pix" });
    expect(asked.question).toEqual({
      kind: "case",
      at: "nod_route",
      node: "route",
      candidates: [
        { value: "edg_bPix", to: "pay by pix", case: "pix" },
        { value: "edg_cTed", to: "pay by ted", case: "ted" },
        { value: "edg_dOther", to: "review by hand", default: true }
      ]
    });
    const answered = run(doc, { rail: "pix" }, [{ kind: "case", at: "nod_route", value: "edg_cTed" }]);
    expect(moved(answered)).toEqual(["edg_a", "edg_cTed", "edg_i", "ended"]);
    const failing = payout({ nodes: { nod_route: { kind: "switch", name: "route", on: { nope: [1] } } } });
    const unevaluated = run(failing, {});
    expect(unevaluated.question.kind).toBe("case");
    expect(of(unevaluated.trace, "warning")).toMatchObject([{ code: "unevaluated" }]);
  });
});

describe("switch values JSON cannot hold (simulator spec §5.7)", () => {
  it("asks which edge is taken when the value is not a finite number, with a warning", () => {
    for (const on of [{ "/": [1, 0] }, { "*": [{ var: "vars.input.missing" }, 1] }]) {
      const doc = payout({ nodes: { nod_route: { kind: "switch", name: "route", on } } });
      const result = run(doc, {});
      expect(result.question).toMatchObject({ kind: "case", at: "nod_route" });
      expect(of(result.trace, "warning")).toMatchObject([{ code: "unevaluated" }]);
    }
  });
});

describe("if (spec §16.13)", () => {
  it("follows its true or false edge by its condition", () => {
    expect(moved(run(payout(), { rail: "pix", amount: 500 }))).toEqual([
      "edg_a",
      "edg_bPix",
      "edg_e",
      "edg_fYes",
      "edg_h",
      "ended"
    ]);
    expect(moved(run(payout(), { rail: "pix", amount: 50 }))).toEqual([
      "edg_a",
      "edg_bPix",
      "edg_e",
      "edg_gNo",
      "ended"
    ]);
  });

  it("asks which branch is taken when its condition is written in words, or missing (simulator spec §5.4)", () => {
    const words = payout({
      nodes: { nod_big: { kind: "if", name: "big?", condition: { text: "more than the daily limit" } } }
    });
    expect(run(words, { rail: "pix" }).question).toEqual({
      kind: "branch",
      at: "nod_big",
      node: "big?",
      condition: { text: "more than the daily limit" },
      candidates: [
        { value: true, to: "approve" },
        { value: false, to: "end" }
      ]
    });
    const yes = run(words, { rail: "pix" }, [{ kind: "branch", at: "nod_big", value: true }]);
    expect(moved(yes)).toContain("edg_fYes");
    const missing = payout({ nodes: { nod_big: { kind: "if", name: "big?" } } });
    expect(run(missing, { rail: "pix" }).question).toMatchObject({ kind: "branch", condition: null });
    expect(run(words, { rail: "pix" }, [{ kind: "branch", at: "nod_big", value: "yes" }])).toMatchObject({
      status: "error",
      code: "badAnswer"
    });
  });

  it("stops when the branch taken has no edge", () => {
    const doc = payout();
    delete doc.canvases.cnv_payout.edges.edg_gNo;
    expect(run(doc, { rail: "pix", amount: 1 })).toMatchObject({
      status: "error",
      code: "stuck",
      message: "big? has no false edge"
    });
  });
});

describe("error edges (spec §16.13, simulator spec §5.9)", () => {
  const failing = () => payout({ edges: { edg_lFails: { from: "nod_pix", to: "nod_sorry", kind: "error" } } });

  it("asks whether a node with an error edge worked, after it ran, and follows the error edge when it did not", () => {
    const doc = failing();
    const asked = run(doc, { rail: "pix", amount: 1 });
    expect(asked.question).toEqual({
      kind: "outcome",
      at: "nod_pix",
      node: "pay by pix",
      candidates: [
        { value: "ok", to: "big?" },
        { value: "error", to: "say sorry" }
      ]
    });
    expect(of(asked.trace, "action")).toEqual([{ type: "action", endpoint: "ept_pix", at: "nod_pix" }]);
    const failed = run(doc, { rail: "pix", amount: 1 }, [{ kind: "outcome", at: "nod_pix", value: "error" }]);
    expect(moved(failed)).toEqual(["edg_a", "edg_bPix", "edg_lFails", "edg_k", "ended"]);
    expect(failed.session.ended).toBe("failure");
    const worked = run(doc, { rail: "pix", amount: 1 }, [{ kind: "outcome", at: "nod_pix", value: "ok" }]);
    expect(worked.session.ended).toBe("success");
  });

  it("asks a decision with an error edge whether it worked before it decides", () => {
    const doc = payout({ edges: { edg_lFails: { from: "nod_route", to: "nod_sorry", kind: "error" } } });
    const asked = run(doc, { rail: "pix" });
    expect(asked.question).toMatchObject({ kind: "outcome", at: "nod_route" });
    expect(moved(run(doc, { rail: "ted" }, [{ kind: "outcome", at: "nod_route", value: "ok" }]))).toContain("edg_cTed");
  });
});
