import { minimalDoc } from "../helpers.js";

/** A shop on one mixed level: Order's states, a checkout's steps, two services, a participant and a state guest. */
export function mixedDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, { pty_customer: { kind: "human", name: "Customer" } });
  Object.assign(doc.catalog.events, { evt_pay: { name: "order.pay" } });
  doc.catalog.endpoints.ept_pay = { name: "Pay", method: "POST", path: "/pay" };
  doc.canvases.cnv_root.nodes.nod_shop = { kind: "service", name: "Shop", inner: { canvas: "cnv_mixed" } };
  doc.canvases.cnv_mixed = {
    kind: "mixed",
    name: "Shop floor",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid", terminal: true },
      nod_start: { kind: "start" },
      nod_call: { kind: "call", endpoint: "ept_pay" },
      nod_end: { kind: "end" },
      nod_web: { kind: "service", name: "Web", party: "pty_customer" },
      nod_db: { kind: "store", name: "Orders" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_paidHere: { kind: "state", target: "nod_paid" }
    },
    edges: {
      edg_init: { from: "nod_init", to: "nod_open", kind: "transition" },
      edg_pay: { from: "nod_open", to: "nod_paid", kind: "transition", on: ["evt_pay"] },
      edg_s1: { from: "nod_start", to: "nod_call" },
      edg_s2: { from: "nod_call", to: "nod_end", kind: "next" },
      edg_db: { from: "nod_web", to: "nod_db", kind: "data", events: ["evt_pay"] }
    }
  };
  return doc;
}
