import { describe, expect, it } from "vitest";
import { applyBatch, figureOf, legendFor } from "../../src/index.js";
import { autoLayout } from "../../src/layout/index.js";
import { toSVG } from "../../src/render/index.js";
import { minimalDoc } from "../helpers.js";

/** Order's lifecycle with the customer who places it, the payment service that charges, and the charge's steps. */
function rolesDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  doc.catalog.events.evt_pay = { name: "order.pay" };
  doc.catalog.actions.act_charge = { name: "Charge card", party: "pty_payments", inner: { canvas: "cnv_charge" } };
  doc.canvases.cnv_root.nodes.nod_orders = { kind: "store", name: "Orders", inner: { canvas: "cnv_order" } };
  doc.canvases.cnv_order = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid", terminal: true },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_service: { kind: "participant", party: "pty_payments" },
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
  doc.canvases.cnv_charge = {
    kind: "flow",
    name: "Charge card",
    nodes: { nod_s: { kind: "start" }, nod_e: { kind: "end" } },
    edges: { edg_se: { from: "nod_s", to: "nod_e" } }
  };
  return doc;
}

/** The document laid out on one level. */
async function placed(doc, canvasId) {
  return applyBatch(doc, await autoLayout(doc, canvasId)).doc;
}

const inside = (point, part) =>
  point[0] >= part.x - 0.5 && point[0] <= part.x + part.w + 0.5 && point[1] >= part.y - 0.5 && point[1] <= part.y + part.h + 0.5;

describe("the roles' connectors on the figure (mixed levels spec §7)", () => {
  it("gives each association a part, from a box's border to a transition's label", async () => {
    const doc = await placed(rolesDoc(), "cnv_order");
    const figure = figureOf(doc, "cnv_order");
    expect(figure.associations.map(part => [part.id, part.role])).toEqual([
      ["receives:edg_pay:nod_service", "receives"],
      ["runs:edg_pay:nod_steps", "runs"],
      ["sends:nod_customer:edg_pay", "sends"]
    ]);
    const sends = figure.associations.find(part => part.role === "sends");
    const customer = figure.nodes.find(part => part.id === "nod_customer");
    const label = figure.labels.find(part => part.id === "edg_pay");
    expect(inside(sends.points[0], customer)).toBe(true);
    expect(inside(sends.points.at(-1), label)).toBe(true);
    expect(sends).toMatchObject({ from: "nod_customer", to: "edg_pay", within: [] });
    expect(figure.associations.find(part => part.role === "receives").label).toBe("Charge card");
  });

  it("draws them dashed or dotted, under the boxes, and explains them in the legend", async () => {
    const svg = await toSVG(rolesDoc(), "cnv_order");
    const at = svg.indexOf('class="association" data-id="sends:nod_customer:edg_pay" data-role="sends"');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(svg.indexOf('class="node" data-id="nod_customer"'));
    expect(svg).toMatch(/data-role="sends"><path [^>]*stroke-dasharray="5,3"/);
    expect(svg).toMatch(/data-role="receives"><path [^>]*stroke-dasharray="1.5,3"/);
    expect(legendFor(rolesDoc(), "cnv_order").roles.map(item => [item.key, item.label])).toEqual([
      ["role.sends", "Sends (who starts it)"],
      ["role.receives", "Receives (whom an action is for)"],
      ["role.runs", "Runs (embedded steps)"]
    ]);
    expect(svg).toContain(">Sends (who starts it)<");
  });

  it("lists no role in the legend of a level without guests", () => {
    expect(legendFor(minimalDoc(), "cnv_root").roles).toEqual([]);
  });

  it("draws a framed machine's connectors inside its frame", async () => {
    let doc = rolesDoc();
    doc = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_orders", x: 0, y: 0, display: "frame" } }
    ]).doc;
    doc = await placed(await placed(doc, "cnv_order"), "cnv_root");
    const sends = figureOf(doc, "cnv_root").associations.find(part => part.role === "sends");
    expect(sends.within).toEqual(["nod_orders"]);
  });

  it("leaves out an association whose end is not drawn", async () => {
    const doc = await placed(rolesDoc(), "cnv_order");
    const unplaced = structuredClone(doc);
    delete unplaced.layout.canvases.cnv_order.nodes.nod_customer;
    expect(figureOf(unplaced, "cnv_order").associations.some(part => part.from === "nod_customer")).toBe(false);
  });
});
