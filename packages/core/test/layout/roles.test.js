import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/index.js";
import { autoLayout, createGeometry } from "../../src/layout/index.js";
import { minimalDoc } from "../helpers.js";

/** A machine whose transition the customer sends and whose action Payments receives, with the action's steps. */
function rolesDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  doc.catalog.events.evt_pay = { name: "order.pay" };
  doc.catalog.actions.act_charge = { name: "Charge card", party: "pty_payments" };
  doc.canvases.cnv_root = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid", terminal: true },
      nod_service: { kind: "participant", party: "pty_payments" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_steps: { kind: "steps", action: "act_charge" }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_open" },
      edg_pay: {
        from: "nod_open",
        to: "nod_paid",
        on: ["evt_pay"],
        by: "pty_customer",
        actions: [{ action: "act_charge" }]
      }
    }
  };
  return doc;
}

describe("laying out a level with roles (mixed levels spec §7)", () => {
  it("puts a sender before the state it moves, a receiver and embedded steps after the place that runs them", async () => {
    const commands = await autoLayout(rolesDoc(), "cnv_root", { scope: "all" });
    const at = Object.fromEntries(
      commands.filter(command => command.type === "layout.node.set").map(({ args }) => [args.id, args])
    );
    const size = createGeometry(rolesDoc()).size;
    const right = id => at[id].x + size("cnv_root", id).w;
    expect(right("nod_customer")).toBeLessThan(at.nod_open.x);
    expect(at.nod_service.x).toBeGreaterThan(right("nod_open"));
    expect(at.nod_steps.x).toBeGreaterThan(right("nod_open"));
  });

  it("stores no route for the roles' connectors", async () => {
    const commands = await autoLayout(rolesDoc(), "cnv_root", { scope: "all" });
    expect(commands.filter(command => command.type === "layout.edge.set").map(({ args }) => args.id)).toEqual([
      "edg_pay",
      "edg_start"
    ]);
    expect(() => applyBatch(rolesDoc(), commands)).not.toThrow();
  });

  it("keeps a participant inside its region", async () => {
    const doc = rolesDoc();
    doc.canvases.cnv_root.regions = { rgn_a: { name: "A" }, rgn_b: { name: "B" } };
    for (const node of Object.values(doc.canvases.cnv_root.nodes)) node.region = "rgn_a";
    doc.canvases.cnv_root.nodes.nod_lonely = { kind: "state", name: "lonely", region: "rgn_b" };
    doc.canvases.cnv_root.nodes.nod_bInit = { kind: "initial", region: "rgn_b" };
    doc.canvases.cnv_root.edges.edg_b = { from: "nod_bInit", to: "nod_lonely" };
    const commands = await autoLayout(doc, "cnv_root", { scope: "all" });
    const at = Object.fromEntries(
      commands.filter(command => command.type === "layout.node.set").map(({ args }) => [args.id, args])
    );
    expect(at.nod_customer.y).toBeLessThan(at.nod_lonely.y);
  });
});
