import { describe, expect, it } from "vitest";
import { reachedOf, start, step } from "../../src/simulate/index.js";
import { AT, begin, docOf, events, flow, of, walk } from "./helpers.js";

/** A refund: notes the amount, asks the bank, tells finance, ends. */
function refund({ nodes = {}, edges = {}, catalog = {} } = {}) {
  return docOf(
    {
      cnv_refund: flow(
        "Refund",
        {
          nod_start: { kind: "start" },
          nod_note: {
            kind: "assign",
            name: "note the amount",
            set: { "vars.amount": { var: "vars.input.amount" }, "context.refunds": 1 }
          },
          nod_bank: { kind: "call", name: "ask the bank", endpoint: "ept_refund" },
          nod_tell: {
            kind: "action",
            name: "tell finance",
            action: "act_tell",
            args: { amount: { var: "vars.amount" } }
          },
          nod_done: { kind: "end" },
          ...nodes
        },
        {
          edg_a: { from: "nod_start", to: "nod_note" },
          edg_b: { from: "nod_note", to: "nod_bank" },
          edg_c: { from: "nod_bank", to: "nod_tell" },
          edg_d: { from: "nod_tell", to: "nod_done" },
          ...edges
        }
      )
    },
    {
      actions: { act_tell: { name: "Tell finance" } },
      endpoints: { ept_refund: { name: "Refund", method: "POST", path: "/refunds" } },
      events: events("refund.sent"),
      ...catalog
    }
  );
}

describe("a flow runs (spec §16.13, simulator spec §5.9)", () => {
  it("moves a token from its start to its end in one go, and ends with success", () => {
    const doc = refund();
    const result = begin(doc, { input: { amount: 30 } });
    expect(result.session).toEqual({
      canvas: "cnv_refund",
      clock: AT,
      active: [],
      tokens: [],
      vars: { amount: 30, input: { amount: 30 } },
      context: { cnv_refund: { refunds: 1 } },
      timers: [],
      ended: "success"
    });
    expect(reachedOf(result.session)).toEqual({ active: [], ended: "success" });
    expect(of(result.trace, "token")).toEqual([
      { type: "token", change: "moved", edge: "edg_a", from: "nod_start", to: "nod_note" },
      { type: "token", change: "moved", edge: "edg_b", from: "nod_note", to: "nod_bank" },
      { type: "token", change: "moved", edge: "edg_c", from: "nod_bank", to: "nod_tell" },
      { type: "token", change: "moved", edge: "edg_d", from: "nod_tell", to: "nod_done" },
      { type: "token", change: "ended", at: "nod_done", outcome: "success" }
    ]);
  });

  it("logs what its nodes do: assignments, calls, actions with their arguments, events and webhooks sent", () => {
    const doc = refund({
      nodes: {
        nod_tell: {
          kind: "emit",
          name: "say it was sent",
          event: "evt_refundSent",
          payload: { amount: { var: "vars.amount" } }
        },
        nod_hook: { kind: "webhook", name: "tell the shop", webhook: "whk_shop" }
      },
      edges: { edg_d: { from: "nod_tell", to: "nod_hook" }, edg_e: { from: "nod_hook", to: "nod_done" } },
      catalog: { webhooks: { whk_shop: { name: "Shop notice", direction: "out" } } }
    });
    const { trace } = begin(doc, { input: { amount: 30 } });
    expect(trace.filter(entry => ["assigned", "action", "emitted"].includes(entry.type))).toEqual([
      { type: "assigned", path: "vars.amount", value: 30, at: "nod_note" },
      { type: "assigned", path: "context.refunds", value: 1, at: "nod_note" },
      { type: "action", endpoint: "ept_refund", at: "nod_bank" },
      { type: "emitted", event: "evt_refundSent", payload: { amount: 30 }, at: "nod_tell" },
      { type: "action", webhook: "whk_shop", at: "nod_hook" }
    ]);
    expect(of(begin(refund(), { input: { amount: 30 } }).trace, "action")).toContainEqual({
      type: "action",
      action: "act_tell",
      args: { amount: 30 },
      at: "nod_tell"
    });
  });

  it("logs a call by its request when it names no endpoint, with the party it calls", () => {
    const request = { method: "POST", url: "https://bank.example/refunds" };
    const doc = refund({
      nodes: { nod_bank: { kind: "call", name: "ask the bank", request, party: "pty_bank" } },
      catalog: { parties: { pty_bank: { kind: "external", name: "Bank" } } }
    });
    expect(of(begin(doc).trace, "action")[0]).toEqual({ type: "action", request, party: "pty_bank", at: "nod_bank" });
  });

  it("ends with the outcome of the end it reaches", () => {
    const doc = refund({ nodes: { nod_done: { kind: "end", outcome: "failure" } } });
    expect(begin(doc).session).toMatchObject({ active: [], ended: "failure" });
  });

  it("starts at its one start, and refuses a flow with none or two (simulator spec §5.10)", () => {
    const none = refund();
    delete none.canvases.cnv_refund.nodes.nod_start;
    delete none.canvases.cnv_refund.edges.edg_a;
    expect(begin(none)).toMatchObject({ status: "error", code: "noStart", message: "Refund has no start node" });
    const two = refund({
      nodes: { nod_again: { kind: "start" } },
      edges: { edg_z: { from: "nod_again", to: "nod_note" } }
    });
    expect(begin(two)).toMatchObject({ status: "error", code: "noStart", message: "Refund has 2 start nodes" });
    expect(begin(refund(), { entry: "nod_start" })).toMatchObject({ status: "error", code: "badInput" });
  });

  it("stops where a node has nowhere to go, and at a ref node", () => {
    const stuck = refund();
    delete stuck.canvases.cnv_refund.edges.edg_d;
    expect(begin(stuck)).toMatchObject({ status: "error", code: "stuck", message: "tell finance has nowhere to go" });
    const ref = refund({ nodes: { nod_done: { kind: "ref", target: "act_tell" } } });
    expect(begin(ref)).toMatchObject({ status: "error", code: "badTarget" });
  });

  it("takes the first of two next edges in ID order, and warns", () => {
    const doc = refund({
      nodes: { nod_other: { kind: "end", outcome: "failure" } },
      edges: { edg_e: { from: "nod_tell", to: "nod_other" } }
    });
    const result = begin(doc);
    expect(result.session.ended).toBe("success");
    expect(of(result.trace, "warning")).toMatchObject([{ code: "ambiguous", edges: ["edg_d", "edg_e"] }]);
  });

  it("stops a flow that never settles: more than 1,000 node visits in one step (simulator spec §5.10)", () => {
    const doc = refund({ edges: { edg_d: { from: "nod_tell", to: "nod_note" } } });
    expect(begin(doc)).toMatchObject({
      status: "error",
      code: "livelock",
      message: "More than 1000 node visits in one step: a loop that does not end, or more than a step can run"
    });
  });

  it("assigns only through the variables' own values, and says so when it cannot", () => {
    const doc = refund({ nodes: { nod_note: { kind: "assign", set: { "vars.__proto__.polluted": true } } } });
    const result = begin(doc);
    expect(Object.prototype).not.toHaveProperty("polluted");
    expect(of(result.trace, "warning")).toMatchObject([{ code: "unevaluated", target: "vars.__proto__.polluted" }]);
  });

  it("starts with the context given for the flow, and makes a step where nothing happens once it has ended", () => {
    const count = { kind: "assign", set: { "context.refunds": { "+": [{ var: "context.refunds" }, 1] } } };
    const doc = refund({ nodes: { nod_note: count } });
    const begun = start(doc, { canvas: "cnv_refund", at: AT, context: { cnv_refund: { refunds: 4 } } });
    expect(begun.session.context).toEqual({ cnv_refund: { refunds: 5 } });
    const after = step(doc, begun.session, { do: { event: "evt_refundSent" } });
    expect(after.session).toEqual(begun.session);
    expect(after.trace.map(entry => entry.type)).toEqual(["received", "nothing"]);
    expect(walk(doc, begun, { do: { wait: "PT1H" } }).session.clock).toBe("2026-01-05T10:00:00Z");
  });
});
