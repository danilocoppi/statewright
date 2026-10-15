import { describe, expect, it } from "vitest";
import { effectsOf } from "../../src/runtime/effects.js";
import { start, step } from "../../src/simulate/index.js";
import { minimalDoc } from "../helpers.js";

/** open → paid on order.pay, which charges the card; the charge's flow logs the card, then raises payment.receipt. */
function orderDoc() {
  const doc = minimalDoc();
  doc.catalog.events.evt_pay = { name: "order.pay" };
  doc.catalog.events.evt_receipt = { name: "payment.receipt" };
  doc.catalog.actions.act_charge = { name: "Charge card", inner: { canvas: "cnv_charge" } };
  doc.catalog.actions.act_log = { name: "Log the card" };
  doc.canvases.cnv_root = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid" },
      nod_done: { kind: "state", name: "receipted", terminal: true }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_open" },
      edg_pay: { from: "nod_open", to: "nod_paid", on: ["evt_pay"], actions: [{ action: "act_charge" }] },
      edg_receipt: { from: "nod_paid", to: "nod_done", on: ["evt_receipt"] }
    }
  };
  doc.canvases.cnv_charge = {
    kind: "flow",
    name: "Charge card",
    nodes: {
      nod_s: { kind: "start" },
      nod_log: { kind: "action", action: "act_log" },
      nod_tell: { kind: "emit", event: "evt_receipt" },
      nod_e: { kind: "end" }
    },
    edges: {
      edg_1: { from: "nod_s", to: "nod_log" },
      edg_2: { from: "nod_log", to: "nod_tell" },
      edg_3: { from: "nod_tell", to: "nod_e" }
    }
  };
  return doc;
}

describe("a step's effects when an action's flow ran within it (mixed levels spec §4.2)", () => {
  it("asks the system for the flow's own actions, not the action the flow already did, and reports its events", () => {
    const doc = orderDoc();
    const session = start(doc, { canvas: "cnv_root", at: "2026-01-05T09:00:00Z" }).session;
    const { trace } = step(doc, session, { do: { event: "evt_pay" } });
    const effects = effectsOf(doc, "cnv_root", trace);
    expect(effects.actions).toEqual([{ action: "Log the card", args: {}, transition: "edg_pay", within: "Charge card" }]);
    expect(effects.events.map(item => item.event)).toEqual(["payment.receipt"]);
  });
});
