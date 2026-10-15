// A small order machine that uses what the bookings example does not: a named guard with its expression, else, effects
// of every kind, a state's entry and exit effects and SLA, a webhook, an event glob, a choice and an any node.
import { applyBatch } from "../../src/commands/index.js";
import { createDocument } from "../../src/create.js";

const add = (collection, id, item) => ({ type: "catalog.add", args: { collection, id, item } });
const node = (id, value) => ({ type: "node.add", args: { canvas: "cnv_orders", id, node: value } });
const edge = (id, value) => ({ type: "edge.add", args: { canvas: "cnv_orders", id, edge: value } });

/** The order machine, as `applyBatch` builds it. */
export function ordersDoc() {
  return applyBatch(createDocument({ name: "Orders", kind: "machine" }), [
    add("events", "evt_paid", { name: "order.paid" }),
    add("events", "evt_cancelled", { name: "order.cancelled" }),
    add("guards", "grd_inStock", { name: "in stock", expr: { "==": [{ var: "context.stock" }, true] } }),
    add("actions", "act_reserve", { name: "reserve stock" }),
    add("timers", "tmr_handling", { name: "handling", duration: "P1D" }),
    add("webhooks", "whk_psp", { name: "psp.notify", direction: "in" }),
    add("parties", "pty_psp", { kind: "external", name: "PSP" }),
    { type: "node.update", args: { id: "nod_firstState", set: { name: "pending" } } },
    node("nod_check", { kind: "choice", name: "in stock?" }),
    node("nod_reserved", {
      kind: "state",
      name: "reserved",
      onEntry: [{ action: "act_reserve" }],
      onExit: [{ emit: "evt_paid" }],
      sla: "tmr_handling"
    }),
    node("nod_backorder", { kind: "state", name: "backorder", category: "hold" }),
    node("nod_cancelled", { kind: "state", name: "cancelled", outcome: "stopped", terminal: true }),
    node("nod_any", { kind: "any", except: ["nod_cancelled"] }),
    edge("edg_paid", { from: "nod_firstState", to: "nod_check", via: "whk_psp", by: "pty_psp" }),
    edge("edg_inStock", {
      from: "nod_check",
      to: "nod_reserved",
      guard: { guard: "grd_inStock" },
      actions: [{ assign: { "context.reservedAt": { var: "event.at" }, "context.by": "psp" } }]
    }),
    edge("edg_outOfStock", { from: "nod_check", to: "nod_backorder", else: true }),
    edge("edg_cancel", { from: "nod_any", to: "nod_cancelled", onMatch: ["order.cancel.*"] }),
    edge("edg_restock", { from: "nod_backorder", to: "nod_check", always: true, guard: { text: "stock arrived" } })
  ]).doc;
}

/** The same machine with two states of one name. */
export function clashingDoc() {
  return applyBatch(ordersDoc(), [
    {
      type: "node.add",
      args: { canvas: "cnv_orders", id: "nod_reservedAgain", node: { kind: "state", name: "reserved" } }
    }
  ]).doc;
}
