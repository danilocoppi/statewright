import { describe, expect, it } from "vitest";
import { applyBatch, collectRefs, documentSchema, FORMAT_VERSION, migrate, parse, stringify } from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

/** A document with a machine level, a flow level and the catalog items guests point at. */
function guestsDoc() {
  const doc = minimalDoc();
  doc.catalog.parties.pty_customer = { kind: "human", name: "Customer" };
  doc.catalog.actions.act_charge = { name: "Charge card" };
  doc.catalog.endpoints.ept_pay = { name: "Pay", method: "POST", path: "/pay" };
  doc.canvases.cnv_root.nodes.nod_orders = { kind: "service", name: "Orders", inner: { canvas: "cnv_order" } };
  doc.canvases.cnv_root.nodes.nod_steps = { kind: "service", name: "Steps", inner: { canvas: "cnv_pay" } };
  doc.canvases.cnv_order = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_paid: { kind: "state", name: "paid" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_charge: { kind: "steps", action: "act_charge" }
    },
    edges: { edg_start: { from: "nod_init", to: "nod_paid" } }
  };
  doc.canvases.cnv_pay = {
    kind: "flow",
    name: "Pay",
    nodes: {
      nod_start: { kind: "start" },
      nod_buyer: { kind: "participant", party: "pty_customer" },
      nod_paidState: { kind: "state", target: "nod_paid" }
    },
    edges: {}
  };
  return doc;
}

const valid = doc => documentSchema.safeParse(doc).success;
const issues = doc => documentSchema.safeParse(doc).error?.issues.map(issue => issue.path.join("/")) ?? [];

describe("guests in the document (format 1.2, mixed levels spec §5)", () => {
  it("is format 1.2", () => {
    expect(FORMAT_VERSION).toBe("1.3");
  });

  it("brings a 1.1 document to 1.2, changing only the version", () => {
    const raw = { ...minimalDoc(), statewright: "1.1" };
    expect(migrate(raw)).toEqual({ ok: true, doc: minimalDoc(), log: ["1.1 → 1.2", "1.2 → 1.3"] });
    expect(migrate({ ...minimalDoc(), statewright: "1.0" }).log).toEqual(["1.0 → 1.1", "1.1 → 1.2", "1.2 → 1.3"]);
  });

  it("accepts participants, embedded steps and state guests", () => {
    expect(issues(guestsDoc())).toEqual([]);
    const doc = guestsDoc();
    doc.canvases.cnv_order.nodes.nod_customer.label = "The customer";
    expect(valid(doc)).toBe(true);
  });

  it("requires a participant's party, a steps node's action and a state guest's target", () => {
    for (const [canvas, node, key] of [
      ["cnv_order", "nod_customer", "party"],
      ["cnv_order", "nod_charge", "action"],
      ["cnv_pay", "nod_buyer", "party"],
      ["cnv_pay", "nod_paidState", "target"]
    ]) {
      const doc = guestsDoc();
      delete doc.canvases[canvas].nodes[node][key];
      expect(valid(doc), `${node} without ${key}`).toBe(false);
    }
  });

  it("refuses wrong prefixes and unknown keys on guests", () => {
    const doc = guestsDoc();
    doc.canvases.cnv_order.nodes.nod_customer.party = "act_charge";
    expect(valid(doc)).toBe(false);
    const other = guestsDoc();
    other.canvases.cnv_pay.nodes.nod_paidState.target = "cnv_order";
    expect(valid(other)).toBe(false);
    const extra = guestsDoc();
    extra.canvases.cnv_order.nodes.nod_charge.party = "pty_customer";
    expect(valid(extra)).toBe(false);
  });

  it("gives services, stores, queues, actions, endpoints and lanes a party", () => {
    const doc = guestsDoc();
    for (const kind of ["service", "store", "queue"]) {
      doc.canvases.cnv_root.nodes[`nod_${kind}Box`] = { kind, name: kind, party: "pty_customer" };
    }
    doc.catalog.actions.act_charge.party = "pty_customer";
    doc.catalog.endpoints.ept_pay.party = "pty_customer";
    doc.annotations = {
      lanes: { lne_buyer: { canvas: "cnv_pay", label: "Buyer", nodes: ["nod_start"], party: "pty_customer" } }
    };
    expect(issues(doc)).toEqual([]);
    doc.catalog.actions.act_charge.party = "evt_x";
    expect(valid(doc)).toBe(false);
  });

  it("keeps a guest's fields in the format's order when written", () => {
    const doc = guestsDoc();
    doc.canvases.cnv_order.nodes.nod_customer = { label: "Buyer", party: "pty_customer", kind: "participant" };
    const text = stringify(doc);
    expect(text).toContain('"kind": "participant",\n          "party": "pty_customer",\n          "label": "Buyer"');
    expect(parse(text).ok).toBe(true);
  });

  it("collects every reference a guest holds", () => {
    const doc = guestsDoc();
    doc.catalog.actions.act_charge.party = "pty_customer";
    doc.canvases.cnv_root.nodes.nod_orders.party = "pty_customer";
    doc.annotations = { lanes: { lne_buyer: { canvas: "cnv_pay", label: "Buyer", nodes: [], party: "pty_customer" } } };
    const of = (source, field) => collectRefs(doc).find(ref => ref.source === source && ref.field === field);
    expect(of("nod_customer", "party")).toMatchObject({ target: "pty_customer", expect: ["pty"], onRemove: "element" });
    expect(of("nod_buyer", "party")).toMatchObject({ target: "pty_customer", onRemove: "element" });
    expect(of("nod_charge", "action")).toMatchObject({
      target: "act_charge",
      expect: ["act", "ept", "whk"],
      onRemove: "element"
    });
    expect(of("nod_paidState", "target")).toMatchObject({ target: "nod_paid", expect: ["nod"], onRemove: "element" });
    expect(of("act_charge", "party")).toMatchObject({ expect: ["pty"], onRemove: "unset" });
    expect(of("nod_orders", "party")).toMatchObject({ expect: ["pty"], onRemove: "unset" });
    expect(of("lne_buyer", "party")).toMatchObject({ section: "annotations", expect: ["pty"], onRemove: "unset" });
  });

  it("takes guests away with what they stand for", () => {
    const doc = guestsDoc();
    doc.catalog.actions.act_charge.party = "pty_customer";
    const { doc: next } = applyBatch(doc, [{ type: "catalog.remove", args: { id: "pty_customer", cascade: true } }]);
    expect(next.canvases.cnv_order.nodes.nod_customer).toBeUndefined();
    expect(next.canvases.cnv_pay.nodes.nod_buyer).toBeUndefined();
    expect(next.catalog.actions.act_charge.party).toBeUndefined();
    const { doc: without } = applyBatch(guestsDoc(), [
      { type: "node.remove", args: { id: "nod_paid", cascade: true } }
    ]);
    expect(without.canvases.cnv_pay.nodes.nod_paidState).toBeUndefined();
    expect(valid(next) && valid(without)).toBe(true);
  });
});
