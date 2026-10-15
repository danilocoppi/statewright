import { describe, expect, it } from "vitest";
import { createGeometry } from "../../src/layout/geometry.js";
import { toSVG } from "../../src/render/index.js";
import { applyBatch, legendFor, nodeStyle, stepText, toMarkdown } from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

/** A machine with a participant of each party kind and the steps of an action with a flow; a flow with a state guest. */
function guestsDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_ops: { kind: "operator", name: "Support" },
    pty_payments: { kind: "system", name: "Payments" },
    pty_bank: { kind: "external", name: "Bank" }
  });
  doc.catalog.actions.act_charge = { name: "Charge card", inner: { canvas: "cnv_charge" } };
  doc.canvases.cnv_root.nodes.nod_orders = { kind: "service", name: "Orders", inner: { canvas: "cnv_order" } };
  doc.canvases.cnv_root.nodes.nod_checkout = { kind: "service", name: "Checkout", inner: { canvas: "cnv_pay" } };
  doc.canvases.cnv_order = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_paid: { kind: "state", name: "paid", outcome: "success" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_support: { kind: "participant", party: "pty_ops", label: "Support desk" },
      nod_service: { kind: "participant", party: "pty_payments" },
      nod_bank: { kind: "participant", party: "pty_bank" },
      nod_charge: { kind: "steps", action: "act_charge" },
      nod_chargeAgain: { kind: "steps", action: "act_charge" }
    },
    edges: { edg_start: { from: "nod_init", to: "nod_paid", actions: [{ action: "act_charge" }] } }
  };
  doc.canvases.cnv_charge = {
    kind: "flow",
    name: "Charge card",
    nodes: { nod_chargeStart: { kind: "start" }, nod_chargeEnd: { kind: "end" } },
    edges: { edg_chargeGo: { from: "nod_chargeStart", to: "nod_chargeEnd" } }
  };
  doc.canvases.cnv_pay = {
    kind: "flow",
    name: "Checkout",
    nodes: { nod_start: { kind: "start" }, nod_paidHere: { kind: "state", target: "nod_paid" } },
    edges: {}
  };
  return doc;
}

describe("guests on the figure (mixed levels spec §7)", () => {
  it("draws a participant in its party's shape", () => {
    const doc = guestsDoc();
    expect(nodeStyle(doc, "nod_customer")).toMatchObject({ key: "node.actor", shape: "actor" });
    expect(nodeStyle(doc, "nod_support")).toMatchObject({ key: "node.ops", shape: "actor" });
    expect(nodeStyle(doc, "nod_support").chips.map(chip => chip.text)).toEqual(["OPS"]);
    expect(nodeStyle(doc, "nod_service")).toMatchObject({ key: "node.plain", shape: "box" });
    expect(nodeStyle(doc, "nod_service").chips.map(chip => chip.text)).toEqual(["SERVICE"]);
    expect(nodeStyle(doc, "nod_bank")).toMatchObject({ key: "node.external", shape: "actor" });
  });

  it("names guests by what they stand for", () => {
    const doc = guestsDoc();
    const nodes = doc.canvases.cnv_order.nodes;
    expect(stepText(doc, nodes.nod_customer)).toBe("Customer");
    expect(stepText(doc, nodes.nod_charge)).toBe("Charge card");
    expect(stepText(doc, doc.canvases.cnv_pay.nodes.nod_paidHere)).toBe("paid");
    expect(stepText(doc, { kind: "participant", party: "pty_gone" })).toBe("pty_gone");
    const geometry = createGeometry(doc);
    expect(geometry.title("cnv_order", "nod_customer")).toBe("Customer");
    expect(geometry.title("cnv_order", "nod_support")).toBe("Support desk");
    expect(geometry.title("cnv_pay", "nod_paidHere")).toBe("paid");
    expect(geometry.summaryLines("cnv_pay", "nod_paidHere")).toEqual(["Order"]);
  });

  it("shows embedded steps as a frame of the action's flow, and a second one of the same action as a card", () => {
    const doc = guestsDoc();
    expect(nodeStyle(doc, "nod_charge")).toMatchObject({ interior: "cnv_charge" });
    const geometry = createGeometry(doc);
    expect(geometry.displayOf("cnv_order", "nod_charge")).toBe("frame");
    expect(geometry.displayOf("cnv_order", "nod_chargeAgain")).toBe("card");
    const stored = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_order", id: "nod_charge", x: 0, y: 0, display: "node" } }
    ]).doc;
    expect(createGeometry(stored).displayOf("cnv_order", "nod_charge")).toBe("node");
  });

  it("draws a state guest as the state it stands for, with its machine's name", () => {
    const style = nodeStyle(guestsDoc(), "nod_paidHere");
    expect(style).toMatchObject({ key: "outcome.success", shape: "box" });
    expect(style.chips.map(chip => chip.text)).toEqual(["STATE"]);
  });

  it("renders a machine with guests: the frame holds the action's flow, every element once", async () => {
    const doc = guestsDoc();
    const svg = await toSVG(doc, "cnv_order");
    const ids = [...svg.matchAll(/data-id="([^"]+)"/g)].map(match => match[1]);
    for (const id of [
      "nod_customer",
      "nod_support",
      "nod_charge",
      "nod_chargeStart",
      "nod_chargeEnd",
      "nod_chargeAgain"
    ]) {
      expect(
        ids.filter(item => item === id),
        id
      ).toHaveLength(1);
    }
    expect(svg).toContain(">Customer<");
    expect(legendFor(doc, "cnv_order").nodes.map(item => item.key)).toContain("node.ops");
    expect(legendFor(guestsDoc(), "cnv_pay").nodes.map(item => item.key)).not.toContain("node.ops");
  });

  it("names guests in the documentation's tables", () => {
    const markdown = toMarkdown(guestsDoc());
    expect(markdown).toMatch(/\| paid \| state \|/);
  });
});
