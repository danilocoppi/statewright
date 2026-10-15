import { describe, expect, it } from "vitest";
import { associationsOf, performerOf } from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

/**
 * Order's lifecycle on a machine level framed in the root system, a payment flow beside it, and the catalog items
 * the roles read: the customer and the payment service, the event the customer sends, the action the service
 * receives, the endpoint whose call leads to `paid`.
 */
function orderDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  Object.assign(doc.catalog.events, {
    evt_placed: { name: "order.placed", source: "pty_customer" },
    evt_paid: { name: "payment.received" },
    evt_cancelled: { name: "order.cancelled", source: "internal" }
  });
  doc.catalog.actions.act_charge = { name: "Charge card", party: "pty_payments", emits: ["evt_paid"] };
  doc.catalog.actions.act_notify = { name: "Notify", party: "pty_customer" };
  doc.catalog.endpoints.ept_pay = { name: "Pay", method: "POST", path: "/pay", emits: ["evt_paid"] };
  doc.canvases.cnv_root.nodes = {
    nod_web: { kind: "actor", name: "Web", party: "pty_customer" },
    nod_payments: { kind: "service", name: "Payments", party: "pty_payments" },
    nod_orders: { kind: "store", name: "Orders", inner: { canvas: "cnv_order" } },
    nod_checkout: { kind: "service", name: "Checkout", inner: { canvas: "cnv_pay" } }
  };
  doc.canvases.cnv_order = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_created: { kind: "state", name: "created", onEntry: [{ action: "act_notify" }] },
      nod_paid: { kind: "state", name: "paid" },
      nod_cancelled: { kind: "state", name: "cancelled" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_service: { kind: "participant", party: "pty_payments" },
      nod_chargeSteps: { kind: "steps", action: "act_charge" }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_created" },
      edg_place: { from: "nod_created", to: "nod_created", on: ["evt_placed"], internal: true },
      edg_pay: {
        from: "nod_created",
        to: "nod_paid",
        on: ["evt_paid"],
        by: "pty_payments",
        actions: [{ action: "act_charge" }]
      },
      edg_cancel: { from: "nod_created", to: "nod_cancelled", on: ["evt_cancelled"] }
    }
  };
  doc.canvases.cnv_pay = {
    kind: "flow",
    name: "Checkout",
    nodes: {
      nod_start: { kind: "start" },
      nod_call: { kind: "call", endpoint: "ept_pay", party: "pty_payments" },
      nod_emit: { kind: "emit", event: "evt_paid" },
      nod_tell: { kind: "emit", event: "evt_cancelled" },
      nod_end: { kind: "end" },
      nod_paidState: { kind: "state", target: "nod_paid" },
      nod_paymentsHere: { kind: "participant", party: "pty_payments" }
    },
    edges: {}
  };
  return doc;
}

const ids = list => list.map(item => item.id);

describe("the roles' associations, derived from the document (mixed levels spec §3)", () => {
  it("draws who sends: a transition's `by`, else its event's source (R1)", () => {
    const sends = associationsOf(orderDoc(), "cnv_order").filter(item => item.role === "sends");
    expect(sends).toEqual([
      {
        id: "sends:nod_customer:edg_place",
        role: "sends",
        from: "nod_customer",
        to: "edg_place",
        field: "source",
        owners: ["evt_placed"],
        label: "order.placed"
      },
      {
        id: "sends:nod_service:edg_pay",
        role: "sends",
        from: "nod_service",
        to: "edg_pay",
        field: "by",
        owners: ["edg_pay"]
      }
    ]);
  });

  it("draws who receives an action, from each place that runs it (R1)", () => {
    const receives = associationsOf(orderDoc(), "cnv_order").filter(item => item.role === "receives");
    expect(receives).toEqual([
      {
        id: "receives:edg_pay:nod_service",
        role: "receives",
        from: "edg_pay",
        to: "nod_service",
        field: "party",
        owners: ["act_charge"],
        label: "Charge card"
      },
      {
        id: "receives:nod_created:nod_customer",
        role: "receives",
        from: "nod_created",
        to: "nod_customer",
        field: "party",
        owners: ["act_notify"],
        label: "Notify"
      }
    ]);
  });

  it("joins the actions one place gives one participant", () => {
    const doc = orderDoc();
    doc.catalog.actions.act_receipt = { name: "Send receipt", party: "pty_payments" };
    doc.canvases.cnv_order.edges.edg_pay.actions.push({ action: "act_receipt" });
    const [receives] = associationsOf(doc, "cnv_order").filter(item => item.id === "receives:edg_pay:nod_service");
    expect(receives).toMatchObject({ owners: ["act_charge", "act_receipt"], label: "Charge card, Send receipt" });
  });

  it("ties embedded steps to each place that runs their action (R2)", () => {
    const runs = associationsOf(orderDoc(), "cnv_order").filter(item => item.role === "runs");
    expect(runs).toEqual([
      {
        id: "runs:edg_pay:nod_chargeSteps",
        role: "runs",
        from: "edg_pay",
        to: "nod_chargeSteps",
        field: "actions",
        owners: ["edg_pay"]
      }
    ]);
  });

  it("ties an endpoint's steps to the transitions it triggers (`via`)", () => {
    const doc = orderDoc();
    doc.canvases.cnv_order.nodes.nod_paySteps = { kind: "steps", action: "ept_pay" };
    doc.canvases.cnv_order.edges.edg_pay.via = "ept_pay";
    expect(associationsOf(doc, "cnv_order").find(item => item.to === "nod_paySteps")).toMatchObject({
      role: "runs",
      from: "edg_pay",
      field: "via"
    });
  });

  it("draws a lifecycle's drivers: boxes with a party, to the transitions of a machine shown as a frame (R3)", () => {
    const doc = orderDoc();
    expect(associationsOf(doc, "cnv_root").filter(item => item.role === "drives")).toEqual([]);
    doc.layout = { canvases: { cnv_root: { nodes: { nod_orders: { x: 0, y: 0, display: "frame" } } } } };
    const drives = associationsOf(doc, "cnv_root").filter(item => item.role === "drives");
    expect(ids(drives)).toEqual(["drives:nod_payments:edg_pay", "drives:nod_web:edg_place"]);
    expect(drives[0]).toMatchObject({ field: "by", owners: ["edg_pay"] });
    // The framed machine's own associations are on the system's figure too.
    expect(ids(associationsOf(doc, "cnv_root"))).toContain("sends:nod_service:edg_pay");
  });

  it("draws the steps that lead an entity to a state: emitted events, endpoints that emit them (R4)", () => {
    const leads = associationsOf(orderDoc(), "cnv_pay").filter(item => item.role === "leadsTo");
    expect(leads).toEqual([
      {
        id: "leadsTo:nod_call:nod_paidState",
        role: "leadsTo",
        from: "nod_call",
        to: "nod_paidState",
        field: "endpoint",
        owners: ["nod_call"],
        label: "payment.received"
      },
      {
        id: "leadsTo:nod_emit:nod_paidState",
        role: "leadsTo",
        from: "nod_emit",
        to: "nod_paidState",
        field: "event",
        owners: ["nod_emit"],
        label: "payment.received"
      }
    ]);
  });

  it("draws who performs a step: a call's party, a webhook's (R1 on flows)", () => {
    const doc = orderDoc();
    doc.catalog.webhooks.whk_hook = { name: "Hook", direction: "out", party: "pty_payments" };
    doc.canvases.cnv_pay.nodes.nod_hook = { kind: "webhook", webhook: "whk_hook" };
    const performs = associationsOf(doc, "cnv_pay").filter(item => item.role === "performs");
    expect(performs).toEqual([
      {
        id: "performs:nod_call:nod_paymentsHere",
        role: "performs",
        from: "nod_call",
        to: "nod_paymentsHere",
        field: "party",
        owners: ["nod_call"]
      },
      {
        id: "performs:nod_hook:nod_paymentsHere",
        role: "performs",
        from: "nod_hook",
        to: "nod_paymentsHere",
        field: "party",
        owners: ["whk_hook"]
      }
    ]);
  });

  it("says who performs a step: its own party, else its lane's (R5)", () => {
    const doc = orderDoc();
    doc.annotations = {
      lanes: { lne_shop: { canvas: "cnv_pay", label: "Shop", nodes: ["nod_emit", "nod_call"], party: "pty_customer" } }
    };
    expect(performerOf(doc, "cnv_pay", "nod_call")).toBe("pty_payments");
    expect(performerOf(doc, "cnv_pay", "nod_emit")).toBe("pty_customer");
    expect(performerOf(doc, "cnv_pay", "nod_tell")).toBeNull();
  });

  it("gives nothing for parties with no participant, and never throws on dangling IDs", () => {
    const doc = orderDoc();
    delete doc.canvases.cnv_order.nodes.nod_customer;
    expect(
      associationsOf(doc, "cnv_order").some(item => item.from === "nod_customer" || item.to === "nod_customer")
    ).toBe(false);
    doc.canvases.cnv_order.nodes.nod_ghost = { kind: "participant", party: "pty_gone" };
    doc.canvases.cnv_order.nodes.nod_lost = { kind: "steps", action: "act_gone" };
    doc.canvases.cnv_pay.nodes.nod_nowhere = { kind: "state", target: "nod_gone" };
    doc.canvases.cnv_order.edges.edg_pay.on = ["evt_gone"];
    expect(() => associationsOf(doc, "cnv_order")).not.toThrow();
    expect(() => associationsOf(doc, "cnv_pay")).not.toThrow();
    expect(associationsOf(doc, "cnv_missing")).toEqual([]);
  });

  it("is the same list every time, in ID order", () => {
    const first = associationsOf(orderDoc(), "cnv_root");
    expect(associationsOf(orderDoc(), "cnv_root")).toEqual(first);
    expect(ids(first)).toEqual([...ids(first)].sort());
  });
});
