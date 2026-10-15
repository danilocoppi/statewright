import { applyBatch } from "statewright";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { connectBoxes, deleteSelection, receiveWith } from "@/editing/actions";
import { connectRefusal } from "@/editing/connect";
import { editingStore } from "@/editing/state";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

const t = key => key;
const state = () => editorStore.getState();

/** A machine (open → paid on order.paid or payment.captured) and a flow with an emit, a call, a participant, a state guest. */
function checkout() {
  const base = newProject({ name: "Shop", kind: "system", names: {} }, new Set());
  const doc = applyBatch(base, [
    {
      type: "catalog.add",
      args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
    },
    { type: "catalog.add", args: { collection: "events", id: "evt_paid", item: { name: "order.paid" } } },
    { type: "catalog.add", args: { collection: "events", id: "evt_captured", item: { name: "payment.captured" } } },
    {
      type: "catalog.add",
      args: { collection: "endpoints", id: "ept_pay", item: { name: "Pay", method: "POST", path: "/pay" } }
    },
    { type: "node.add", args: { canvas: base.root, id: "nod_orders", node: { kind: "store", name: "Orders" } } },
    { type: "node.add", args: { canvas: base.root, id: "nod_shop", node: { kind: "service", name: "Shop" } } },
    { type: "canvas.create", args: { kind: "machine", name: "Order", owner: "nod_orders", id: "cnv_order" } },
    { type: "node.add", args: { canvas: "cnv_order", id: "nod_open", node: { kind: "state", name: "open" } } },
    { type: "node.add", args: { canvas: "cnv_order", id: "nod_paid", node: { kind: "state", name: "paid" } } },
    {
      type: "edge.add",
      args: {
        canvas: "cnv_order",
        id: "edg_paid",
        edge: { from: "nod_open", to: "nod_paid", on: ["evt_paid", "evt_captured"] }
      }
    },
    { type: "canvas.create", args: { kind: "flow", name: "Checkout", owner: "nod_shop", id: "cnv_checkout" } },
    { type: "node.add", args: { canvas: "cnv_checkout", id: "nod_start", node: { kind: "start" } } },
    { type: "node.add", args: { canvas: "cnv_checkout", id: "nod_call", node: { kind: "call", endpoint: "ept_pay" } } },
    { type: "node.add", args: { canvas: "cnv_checkout", id: "nod_tell", node: { kind: "emit", event: "evt_paid" } } },
    {
      type: "node.add",
      args: { canvas: "cnv_checkout", id: "nod_payments", node: { kind: "participant", party: "pty_payments" } }
    },
    {
      type: "node.add",
      args: { canvas: "cnv_checkout", id: "nod_paidHere", node: { kind: "state", target: "nod_paid" } }
    }
  ]).doc;
  return doc;
}

beforeEach(() => editorStore.getState().open(checkout(), { canvasId: "cnv_checkout" }));
afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("roles on a flow in the Editor (mixed levels spec §4.4)", () => {
  it("judges a step onto a guest by what it would mean", () => {
    expect(connectRefusal(state().doc, "cnv_checkout", "nod_tell", "nod_paidHere")).toBe("already");
    expect(connectRefusal(state().doc, "cnv_checkout", "nod_call", "nod_payments")).toBeNull();
    expect(connectRefusal(state().doc, "cnv_checkout", "nod_start", "nod_paidHere")).toBe("noMeaning");
  });

  it("a call onto a participant: performed by its party", () => {
    connectBoxes(t, "nod_call", "nod_payments", { x: 0, y: 0 });
    expect(state().doc.canvases.cnv_checkout.nodes.nod_call.party).toBe("pty_payments");
  });

  it("an emit that already leads there is refused as already so", () => {
    connectBoxes(t, "nod_tell", "nod_paidHere", { x: 0, y: 0 });
    expect(editingStore.getState().refusal).toMatchObject({ reason: "already" });
  });

  it("asks for the event when several lead there and the step emits another", () => {
    const doc = applyBatch(state().doc, [
      { type: "catalog.add", args: { collection: "events", id: "evt_other", item: { name: "order.noted" } } },
      { type: "node.update", args: { id: "nod_tell", set: { event: "evt_other" } } }
    ]).doc;
    editorStore.getState().open(doc, { canvasId: "cnv_checkout" });
    connectBoxes(t, "nod_tell", "nod_paidHere", { x: 0, y: 0 });
    expect(editingStore.getState().editor).toMatchObject({ needs: "event", options: ["evt_captured", "evt_paid"] });
    receiveWith(t, { event: "evt_paid" });
    expect(state().doc.canvases.cnv_checkout.nodes.nod_tell.event).toBe("evt_paid");
  });

  it("refuses to delete a leads-to connector, saying the event is what the step is", () => {
    state().select(["leadsTo:nod_tell:nod_paidHere"]);
    deleteSelection(t);
    expect(state().doc.canvases.cnv_checkout.nodes.nod_tell.event).toBe("evt_paid");
    expect(editingStore.getState().refusal).toMatchObject({ reason: "isTheStep" });
  });
});

describe("who performs a call, in the simulation's steps", () => {
  it("names the call's performer", async () => {
    const { traceLine } = await import("@/simulate/words");
    const line = traceLine(
      state().doc,
      "cnv_checkout",
      { type: "action", endpoint: "ept_pay", party: "pty_payments" },
      (key, values) => (key === "simulate:trace.callBy" ? `calls ${values.call}, by ${values.party}` : key)
    );
    expect(line.text).toMatch(/, by Payments$/);
  });
});

describe("deleting a step selected with its connectors (a rubber band)", () => {
  it("deletes the step, leaving its connectors to go with it", () => {
    state().select(["nod_tell", "leadsTo:nod_tell:nod_paidHere"]);
    deleteSelection(t);
    expect(state().doc.canvases.cnv_checkout.nodes.nod_tell).toBeUndefined();
    expect(editingStore.getState().refusal).toBeNull();
  });

  it("leaves a shared webhook's party alone when its step is deleted with its connector", () => {
    const doc = applyBatch(state().doc, [
      {
        type: "catalog.add",
        args: {
          collection: "webhooks",
          id: "whk_receipt",
          item: { name: "Receipt", direction: "out", party: "pty_payments" }
        }
      },
      {
        type: "node.add",
        args: { canvas: "cnv_checkout", id: "nod_hook", node: { kind: "webhook", webhook: "whk_receipt" } }
      }
    ]).doc;
    editorStore.getState().open(doc, { canvasId: "cnv_checkout" });
    state().select(["nod_hook", "performs:nod_hook:nod_payments"]);
    deleteSelection(t);
    expect(state().doc.catalog.webhooks.whk_receipt.party).toBe("pty_payments");
  });
});
