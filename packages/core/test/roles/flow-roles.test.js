import { describe, expect, it } from "vitest";
import { applyBatch, associate, associationsOf, dissociateCommands, figureOf } from "../../src/index.js";
import { toContract } from "../../src/contract/index.js";
import { autoLayout } from "../../src/layout/index.js";
import { start } from "../../src/simulate/index.js";
import { minimalDoc } from "../helpers.js";

/**
 * Order's lifecycle (created → paid on order.paid or payment.captured), and a checkout flow: it calls Pay, emits an
 * event, sends a hook; a participant for Payments, a state guest for `paid`; lanes for the customer and Payments.
 */
function checkoutDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  Object.assign(doc.catalog.events, {
    evt_paid: { name: "order.paid" },
    evt_captured: { name: "payment.captured" },
    evt_noted: { name: "order.noted" }
  });
  doc.catalog.endpoints.ept_pay = { name: "Pay", method: "POST", path: "/pay" };
  doc.catalog.webhooks.whk_receipt = { name: "Receipt", direction: "out" };
  doc.canvases.cnv_root.nodes = {
    nod_orders: { kind: "store", name: "Orders", inner: { canvas: "cnv_order" } },
    nod_shop: { kind: "service", name: "Shop", inner: { canvas: "cnv_checkout" } }
  };
  doc.canvases.cnv_order = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_created: { kind: "state", name: "created" },
      nod_paid: { kind: "state", name: "paid", terminal: true }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_created" },
      edg_paid: { from: "nod_created", to: "nod_paid", on: ["evt_paid", "evt_captured"] }
    }
  };
  doc.canvases.cnv_checkout = {
    kind: "flow",
    name: "Checkout",
    nodes: {
      nod_start: { kind: "start" },
      nod_call: { kind: "call", endpoint: "ept_pay" },
      nod_tell: { kind: "emit", event: "evt_noted" },
      nod_hook: { kind: "webhook", webhook: "whk_receipt" },
      nod_end: { kind: "end" },
      nod_paymentsHere: { kind: "participant", party: "pty_payments" },
      nod_paidHere: { kind: "state", target: "nod_paid" }
    },
    edges: {
      edg_a: { from: "nod_start", to: "nod_call" },
      edg_b: { from: "nod_call", to: "nod_tell" },
      edg_c: { from: "nod_tell", to: "nod_hook" },
      edg_d: { from: "nod_hook", to: "nod_end" }
    }
  };
  doc.annotations = {
    lanes: {
      lne_shop: {
        canvas: "cnv_checkout",
        label: "Shop",
        nodes: ["nod_start", "nod_tell", "nod_end"],
        party: "pty_customer"
      },
      lne_payments: {
        canvas: "cnv_checkout",
        label: "Payments",
        nodes: ["nod_call", "nod_hook"],
        party: "pty_payments"
      }
    }
  };
  return doc;
}

const run = (doc, result) => applyBatch(doc, result.commands).doc;

describe("roles on a flow (mixed levels spec §4.4)", () => {
  it("an emit step onto a state guest leads there, asking which event when several do", () => {
    const doc = checkoutDoc();
    expect(associate(doc, "cnv_checkout", "nod_tell", "nod_paidHere")).toEqual({
      needs: "event",
      events: ["evt_captured", "evt_paid"]
    });
    const result = associate(doc, "cnv_checkout", "nod_tell", "nod_paidHere", { event: "evt_paid" });
    expect(result.role).toBe("leadsTo");
    const after = run(doc, result);
    expect(after.canvases.cnv_checkout.nodes.nod_tell.event).toBe("evt_paid");
    expect(associationsOf(after, "cnv_checkout").map(item => item.id)).toContain("leadsTo:nod_tell:nod_paidHere");
    expect(associate(after, "cnv_checkout", "nod_tell", "nod_paidHere", { event: "evt_paid" })).toEqual({
      refusal: "already"
    });
  });

  it("refuses a state no event leads to, and steps that emit nothing", () => {
    const doc = checkoutDoc();
    doc.canvases.cnv_order.edges.edg_paid.on = [];
    doc.canvases.cnv_order.edges.edg_paid.always = true;
    expect(associate(doc, "cnv_checkout", "nod_tell", "nod_paidHere")).toEqual({ refusal: "noLeadingEvent" });
    expect(associate(checkoutDoc(), "cnv_checkout", "nod_start", "nod_paidHere")).toEqual({ refusal: "noMeaning" });
  });

  it("a call onto a participant: performed by its party", () => {
    const doc = checkoutDoc();
    const after = run(doc, associate(doc, "cnv_checkout", "nod_call", "nod_paymentsHere"));
    expect(after.canvases.cnv_checkout.nodes.nod_call.party).toBe("pty_payments");
    const performs = associationsOf(after, "cnv_checkout").find(
      item => item.id === "performs:nod_call:nod_paymentsHere"
    );
    const back = applyBatch(after, dissociateCommands(after, performs).commands).doc;
    expect(back.canvases.cnv_checkout.nodes.nod_call.party).toBeUndefined();
  });

  it("a webhook onto a participant gives the catalog's webhook the party, and says which other flows use it", () => {
    const doc = checkoutDoc();
    doc.canvases.cnv_other = {
      kind: "flow",
      name: "Refund",
      nodes: { nod_s2: { kind: "start" }, nod_h2: { kind: "webhook", webhook: "whk_receipt" } },
      edges: { edg_s2: { from: "nod_s2", to: "nod_h2" } }
    };
    doc.canvases.cnv_root.nodes.nod_refunds = { kind: "service", name: "Refunds", inner: { canvas: "cnv_other" } };
    const result = associate(doc, "cnv_checkout", "nod_hook", "nod_paymentsHere");
    expect(result).toMatchObject({ role: "performs", alsoChanges: ["cnv_other"] });
    expect(run(doc, result).catalog.webhooks.whk_receipt.party).toBe("pty_payments");
  });

  it("refuses connectors that start at a guest", () => {
    const doc = checkoutDoc();
    expect(associate(doc, "cnv_checkout", "nod_paidHere", "nod_tell")).toEqual({ refusal: "noMeaning" });
    expect(associate(doc, "cnv_checkout", "nod_paymentsHere", "nod_call")).toEqual({ refusal: "noMeaning" });
  });

  it("a leads-to connector cannot be deleted: the event is what the step is", () => {
    const doc = run(
      checkoutDoc(),
      associate(checkoutDoc(), "cnv_checkout", "nod_tell", "nod_paidHere", { event: "evt_paid" })
    );
    const leads = associationsOf(doc, "cnv_checkout").find(item => item.role === "leadsTo");
    expect(dissociateCommands(doc, leads)).toEqual({ commands: [], alsoLoses: [], refusal: "isTheStep" });
  });
});

describe("lanes with a party (mixed levels spec §4.4, R5)", () => {
  it("say who performs each step in the contract: its own party, else its lane's", async () => {
    const doc = checkoutDoc();
    doc.canvases.cnv_checkout.nodes.nod_call.party = "pty_customer";
    const { contract } = await toContract(doc);
    const flow = contract.flows.find(item => item.id === "cnv_checkout");
    const by = Object.fromEntries(flow.steps.map(step => [step.id, step.performedBy]));
    expect(by).toMatchObject({ nod_call: "Customer", nod_hook: "Payments", nod_tell: "Customer" });
  });

  it("caption a lane with its party when the label is not the party's name", async () => {
    const doc = checkoutDoc();
    doc.annotations.lanes.lne_shop.label = "Storefront";
    const placed = applyBatch(doc, await autoLayout(doc, "cnv_checkout", { scope: "all" })).doc;
    const svg = figureOf(placed, "cnv_checkout")
      .lanes.map(lane => lane.svg)
      .join("");
    expect(svg).toContain("STOREFRONT · CUSTOMER");
    expect(svg).toContain(">PAYMENTS<");
  });

  it("name a lane's party in a call's trace when the call has none", () => {
    const doc = checkoutDoc();
    const { trace } = start(doc, { canvas: "cnv_checkout", at: "2026-01-05T09:00:00Z" });
    expect(trace.find(entry => entry.endpoint === "ept_pay")).toMatchObject({ party: "pty_payments" });
  });
});

describe("lanes laid out as rows (mixed levels spec §7)", () => {
  it("gives each lane a band of its own, its caption above it", async () => {
    const doc = checkoutDoc();
    const commands = await autoLayout(doc, "cnv_checkout", { scope: "all" });
    const placed = applyBatch(doc, commands).doc;
    const { createGeometry } = await import("../../src/layout/index.js");
    const geometry = createGeometry(placed);
    const at = placed.layout.canvases.cnv_checkout.nodes;
    const band = lane =>
      doc.annotations.lanes[lane].nodes.map(id => ({
        top: at[id].y,
        bottom: at[id].y + geometry.size("cnv_checkout", id).h
      }));
    const [first, second] = [band("lne_shop"), band("lne_payments")].sort((a, b) => a[0].top - b[0].top);
    expect(Math.max(...first.map(item => item.bottom)) + 20).toBeLessThanOrEqual(
      Math.min(...second.map(item => item.top))
    );
  });
});
