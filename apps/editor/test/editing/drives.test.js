import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { connectBoxes, receiveWith } from "@/editing/actions";
import { connectRefusal } from "@/editing/connect";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

const t = key => key;
const state = () => editorStore.getState();

/** A shop whose Orders store shows the order's lifecycle as a frame; Web acts for the customer, Payments for nobody. */
function shopDoc() {
  return {
    statewright: "1.2",
    project: { id: "prj_shop", name: "Shop" },
    root: "cnv_shop",
    catalog: {
      types: {},
      events: { evt_placed: { name: "order.placed" } },
      actions: {},
      guards: {},
      endpoints: {},
      webhooks: {},
      timers: {},
      statuses: {},
      parties: { pty_customer: { kind: "human", name: "Customer" } }
    },
    definitions: {},
    canvases: {
      cnv_shop: {
        kind: "system",
        name: "Shop",
        nodes: {
          nod_web: { kind: "service", name: "Web", party: "pty_customer" },
          nod_payments: { kind: "service", name: "Payments" },
          nod_orders: { kind: "store", name: "Orders", inner: { canvas: "cnv_order" } }
        },
        edges: {}
      },
      cnv_order: {
        kind: "machine",
        name: "Order",
        nodes: {
          nod_init: { kind: "initial" },
          nod_created: { kind: "state", name: "created" },
          nod_paid: { kind: "state", name: "paid", terminal: true }
        },
        edges: {
          edg_start: { from: "nod_init", to: "nod_created" },
          edg_pay: { from: "nod_created", to: "nod_paid", on: ["evt_placed"] }
        }
      }
    },
    layout: { canvases: { cnv_shop: { nodes: { nod_orders: { x: 0, y: 0, display: "frame" } } } } }
  };
}

beforeEach(() => editorStore.getState().open(shopDoc(), { canvasId: "cnv_shop" }));
afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("driving a lifecycle from a system's box (mixed levels spec §4.3)", () => {
  it("judges a box onto a framed transition by what it would mean", () => {
    expect(connectRefusal(state().doc, "cnv_shop", "nod_web", "edg_pay")).toBeNull();
    expect(connectRefusal(state().doc, "cnv_shop", "nod_payments", "edg_pay")).toBeNull();
  });

  it("a box with a party drives the transition at once", () => {
    connectBoxes(t, "nod_web", "edg_pay", { x: 0, y: 0 });
    expect(state().doc.canvases.cnv_order.edges.edg_pay.by).toBe("pty_customer");
  });

  it("a box without one asks whom it acts for, and a new party is made for it", () => {
    connectBoxes(t, "nod_payments", "edg_pay", { x: 0, y: 0 });
    expect(editingStore.getState().editor).toMatchObject({
      type: "receive",
      needs: "party",
      options: ["pty_customer"]
    });
    receiveWith(t, { party: { name: "Payments" } });
    const doc = state().doc;
    const party = doc.canvases.cnv_shop.nodes.nod_payments.party;
    expect(doc.catalog.parties[party]).toEqual({ kind: "system", name: "Payments" });
    expect(doc.canvases.cnv_order.edges.edg_pay.by).toBe(party);
    state().undo();
    expect(state().doc.canvases.cnv_shop.nodes.nod_payments.party).toBeUndefined();
  });
});
