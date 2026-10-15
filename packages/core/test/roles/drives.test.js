import { describe, expect, it } from "vitest";
import { applyBatch, associate, associationsOf, dissociateCommands, toMarkdown } from "../../src/index.js";
import { autoLayout } from "../../src/layout/index.js";
import { minimalDoc } from "../helpers.js";

/** A shop: Web acts for the customer, Payments for nobody yet; Orders holds the order's lifecycle, open as a frame. */
function shopDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_bank: { kind: "external", name: "Bank" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  doc.catalog.events.evt_placed = { name: "order.placed" };
  doc.canvases.cnv_root.nodes = {
    nod_web: { kind: "service", name: "Web", party: "pty_customer" },
    nod_payments: { kind: "service", name: "Payments" },
    nod_buyer: { kind: "actor", name: "Buyer" },
    nod_orders: { kind: "store", name: "Orders", inner: { canvas: "cnv_order" } }
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
      edg_pay: { from: "nod_created", to: "nod_paid", on: ["evt_placed"] }
    }
  };
  doc.layout = { canvases: { cnv_root: { nodes: { nod_orders: { x: 0, y: 0, display: "frame" } } } } };
  return doc;
}

const run = (doc, result) => applyBatch(doc, result.commands).doc;

describe("driving a lifecycle on a system level (mixed levels spec §4.3)", () => {
  it("a box with a party onto a framed transition: it drives it (`by`)", () => {
    const doc = shopDoc();
    const result = associate(doc, "cnv_root", "nod_web", "edg_pay");
    expect(result.role).toBe("drives");
    const after = run(doc, result);
    expect(after.canvases.cnv_order.edges.edg_pay.by).toBe("pty_customer");
    expect(associationsOf(after, "cnv_root").map(item => item.id)).toContain("drives:nod_web:edg_pay");
    expect(associate(after, "cnv_root", "nod_web", "edg_pay")).toEqual({ refusal: "already" });
  });

  it("a box without a party asks for one, its kind's parties first, and takes a new one in the same change", () => {
    const doc = shopDoc();
    expect(associate(doc, "cnv_root", "nod_payments", "edg_pay")).toEqual({
      needs: "party",
      parties: ["pty_payments", "pty_bank", "pty_customer"]
    });
    const named = associate(doc, "cnv_root", "nod_payments", "edg_pay", { party: { name: "Payments desk" } });
    const after = run(doc, named);
    const [id, party] = Object.entries(after.catalog.parties).find(([, item]) => item.name === "Payments desk");
    expect(party.kind).toBe("system");
    expect(after.canvases.cnv_root.nodes.nod_payments.party).toBe(id);
    expect(after.canvases.cnv_order.edges.edg_pay.by).toBe(id);
    const picked = run(doc, associate(doc, "cnv_root", "nod_buyer", "edg_pay", { party: { id: "pty_customer" } }));
    expect(picked.canvases.cnv_root.nodes.nod_buyer.party).toBe("pty_customer");
  });

  it("an actor's new party is a person", () => {
    const doc = shopDoc();
    const after = run(doc, associate(doc, "cnv_root", "nod_buyer", "edg_pay", { party: { name: "Buyer" } }));
    expect(Object.values(after.catalog.parties).find(item => item.name === "Buyer").kind).toBe("human");
  });

  it("refuses a transition the figure does not show, and pairs that mean nothing", () => {
    const doc = shopDoc();
    doc.layout.canvases.cnv_root.nodes.nod_orders.display = "card";
    expect(associate(doc, "cnv_root", "nod_web", "edg_pay")).toEqual({ refusal: "noMeaning" });
    expect(associate(shopDoc(), "cnv_root", "nod_web", "nod_payments")).toEqual({ refusal: "noMeaning" });
  });

  it("deleting a drives connector unsets `by`", () => {
    const doc = run(shopDoc(), associate(shopDoc(), "cnv_root", "nod_web", "edg_pay"));
    const drives = associationsOf(doc, "cnv_root").find(item => item.id === "drives:nod_web:edg_pay");
    const after = applyBatch(doc, dissociateCommands(doc, drives).commands).doc;
    expect(after.canvases.cnv_order.edges.edg_pay.by).toBeUndefined();
  });

  it("lays a driving box out before the lifecycle it drives", async () => {
    const doc = run(shopDoc(), associate(shopDoc(), "cnv_root", "nod_web", "edg_pay"));
    const commands = await autoLayout(doc, "cnv_root", { scope: "all" });
    const at = Object.fromEntries(
      commands
        .filter(command => command.type === "layout.node.set" && command.args.canvas === "cnv_root")
        .map(({ args }) => [args.id, args])
    );
    expect(at.nod_web.x).toBeLessThan(at.nod_orders.x);
  });

  it("lists a system level's drives in its roles table", () => {
    const doc = run(shopDoc(), associate(shopDoc(), "cnv_root", "nod_web", "edg_pay"));
    expect(toMarkdown(doc)).toMatch(/\| Web \| drives \| order\.placed \|/);
  });
});
