import { describe, expect, it } from "vitest";
import { start, step, storyOf } from "../../src/simulate/index.js";
import { sentenceOf } from "../../src/render/story-words.js";
import { minimalDoc } from "../helpers.js";

/**
 * Order's lifecycle: the customer pays (open → paid), which charges the card. The charge's flow asks whether the card
 * is valid; if so it marks the order charged and raises payment.receipt, which moves paid → receipted.
 */
function orderDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  Object.assign(doc.catalog.events, {
    evt_pay: { name: "order.pay" },
    evt_receipt: { name: "payment.receipt" }
  });
  doc.catalog.actions.act_charge = { name: "Charge card", party: "pty_payments", inner: { canvas: "cnv_charge" } };
  doc.canvases.cnv_root = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid" },
      nod_receipted: { kind: "state", name: "receipted", terminal: true }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_open" },
      edg_pay: {
        from: "nod_open",
        to: "nod_paid",
        on: ["evt_pay"],
        by: "pty_customer",
        actions: [{ action: "act_charge" }]
      },
      edg_receipt: { from: "nod_paid", to: "nod_receipted", on: ["evt_receipt"] }
    }
  };
  doc.canvases.cnv_charge = {
    kind: "flow",
    name: "Charge card",
    nodes: {
      nod_cs: { kind: "start" },
      nod_valid: { kind: "if", condition: { text: "the card is valid" } },
      nod_mark: { kind: "assign", set: { "context.charged": true } },
      nod_tell: { kind: "emit", event: "evt_receipt" },
      nod_ok: { kind: "end" },
      nod_declined: { kind: "end", outcome: "failure" }
    },
    edges: {
      edg_c1: { from: "nod_cs", to: "nod_valid" },
      edg_c2: { from: "nod_valid", to: "nod_mark", kind: "true" },
      edg_c3: { from: "nod_valid", to: "nod_declined", kind: "false" },
      edg_c4: { from: "nod_mark", to: "nod_tell" },
      edg_c5: { from: "nod_tell", to: "nod_ok" }
    }
  };
  return doc;
}

const AT = "2026-01-05T09:00:00Z";
const begin = doc => start(doc, { canvas: "cnv_root", at: AT }).session;
const pay = (doc, answers) => step(doc, begin(doc), { do: { event: "evt_pay" }, answers });

describe("an action's flow runs inside the machine's step (mixed levels spec §4.2)", () => {
  it("asks its questions with the machine's, in order", () => {
    const result = pay(orderDoc());
    expect(result.status).toBe("needs");
    expect(result.question).toMatchObject({ kind: "branch", at: "nod_valid" });
  });

  it("writes the machine's context, and the events it raises move the machine", () => {
    const result = pay(orderDoc(), [{ kind: "branch", at: "nod_valid", value: true }]);
    expect(result.status).toBe("done");
    expect(result.session.context.cnv_root).toEqual({ charged: true });
    expect(result.session.active).toEqual(["nod_receipted"]);
    const action = result.trace.find(entry => entry.type === "action");
    expect(action).toMatchObject({ action: "act_charge" });
    expect(action.steps.map(entry => entry.type)).toEqual(
      expect.arrayContaining(["answered", "assigned", "emitted", "token"])
    );
  });

  it("warns when the flow ends in failure, and the machine's step still completes", () => {
    const result = pay(orderDoc(), [{ kind: "branch", at: "nod_valid", value: false }]);
    expect(result.status).toBe("done");
    expect(result.session.active).toEqual(["nod_paid"]);
    expect(result.trace.find(entry => entry.type === "warning")).toMatchObject({
      code: "actionFailed",
      action: "act_charge"
    });
  });

  it("runs the flow each time the action runs", () => {
    const doc = orderDoc();
    doc.canvases.cnv_root.nodes.nod_paid.onEntry = [{ action: "act_charge" }];
    delete doc.canvases.cnv_root.edges.edg_receipt;
    const answers = [
      { kind: "branch", at: "nod_valid", value: true },
      { kind: "branch", at: "nod_valid", value: false }
    ];
    const result = pay(doc, answers);
    expect(result.status).toBe("done");
    expect(result.trace.filter(entry => entry.type === "action")).toHaveLength(2);
    expect(result.trace.filter(entry => entry.type === "warning").map(entry => entry.code)).toEqual(["actionFailed"]);
  });

  it("leaves a flow that waits to run apart, as before (the action is only logged)", () => {
    const doc = orderDoc();
    doc.canvases.cnv_charge.nodes.nod_hold = { kind: "wait", on: ["evt_receipt"] };
    const result = pay(doc);
    expect(result.status).toBe("done");
    expect(result.trace.find(entry => entry.type === "action").steps).toBeUndefined();
    expect(result.session.context.cnv_root ?? {}).toEqual({});
  });

  it("makes an error in the flow an error of the step", () => {
    const doc = orderDoc();
    delete doc.canvases.cnv_charge.nodes.nod_cs;
    delete doc.canvases.cnv_charge.edges.edg_c1;
    const result = pay(doc);
    expect(result).toMatchObject({ status: "error", code: "noStart" });
  });

  it("tells who sends and who receives", () => {
    const doc = orderDoc();
    doc.annotations = {
      scenarios: {
        scn_pay: {
          name: "Pay",
          canvas: "cnv_root",
          start: { at: AT },
          steps: [
            {
              do: { event: "evt_pay" },
              answers: [{ kind: "branch", at: "nod_valid", value: true }],
              reached: { active: ["nod_receipted"] }
            }
          ]
        }
      }
    };
    const { frames } = storyOf(doc, doc.annotations.scenarios.scn_pay);
    const words = sentenceOf(doc, "cnv_root", frames[1]);
    expect(words).toContain("Customer sends order.pay.");
    expect(words).toContain("Payments receives Charge card.");
    expect(words).toContain("Raises payment.receipt.");
  });
});

describe("answers given inside an action's flow", () => {
  it("count as used when the step is given one too many", () => {
    const result = pay(orderDoc(), [
      { kind: "branch", at: "nod_valid", value: true },
      { kind: "branch", at: "nod_valid", value: false }
    ]);
    expect(result).toMatchObject({ status: "error", code: "extraAnswers", details: { used: 1 } });
  });
});

describe("an endpoint's flow, run by the call that triggers a transition", () => {
  it("runs within the step, recorded under the endpoint", () => {
    const doc = orderDoc();
    doc.catalog.endpoints.ept_pay = { name: "Pay", method: "POST", path: "/pay", inner: { canvas: "cnv_charge" } };
    delete doc.catalog.actions.act_charge.inner;
    const edge = doc.canvases.cnv_root.edges.edg_pay;
    delete edge.on;
    delete edge.actions;
    edge.via = "ept_pay";
    const result = step(doc, begin(doc), {
      do: { call: "ept_pay" },
      answers: [{ kind: "branch", at: "nod_valid", value: true }]
    });
    expect(result.status).toBe("done");
    expect(result.trace.find(entry => entry.endpoint === "ept_pay").steps.length).toBeGreaterThan(0);
    expect(result.session.active).toEqual(["nod_receipted"]);
  });
});
