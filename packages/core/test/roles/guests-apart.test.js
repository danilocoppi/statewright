import { describe, expect, it } from "vitest";
import { coverageOf } from "../../src/audit/index.js";
import { toContract } from "../../src/contract/index.js";
import { applyBatch, CommandError } from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

/** A machine with a participant and the steps of an action whose flow has a participant and a state guest. */
function guestsDoc() {
  const doc = minimalDoc();
  doc.catalog.parties.pty_customer = { kind: "human", name: "Customer" };
  doc.catalog.events.evt_paid = { name: "paid" };
  doc.catalog.actions.act_charge = { name: "Charge card", inner: { canvas: "cnv_charge" } };
  doc.canvases.cnv_root.nodes.nod_orders = { kind: "service", name: "Orders", inner: { canvas: "cnv_order" } };
  doc.canvases.cnv_order = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid", terminal: true },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_see: { kind: "ref", target: "cnv_charge" }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_open" },
      edg_pay: { from: "nod_open", to: "nod_paid", on: ["evt_paid"], actions: [{ action: "act_charge" }] }
    }
  };
  doc.canvases.cnv_charge = {
    kind: "flow",
    name: "Charge card",
    nodes: {
      nod_start: { kind: "start" },
      nod_tell: { kind: "emit", event: "evt_paid" },
      nod_end: { kind: "end" },
      nod_buyer: { kind: "participant", party: "pty_customer" },
      nod_paidHere: { kind: "state", target: "nod_paid" }
    },
    edges: { edg_a: { from: "nod_start", to: "nod_tell" }, edg_b: { from: "nod_tell", to: "nod_end" } }
  };
  return doc;
}

const add = (doc, canvas, edge) => () => applyBatch(doc, [{ type: "edge.add", args: { canvas, id: "edg_new", edge } }]);

describe("guests take no part in their level's transitions and steps (mixed levels spec §3)", () => {
  it("refuses a transition or a flow edge to or from a guest", () => {
    const doc = guestsDoc();
    for (const [canvas, edge] of [
      ["cnv_order", { from: "nod_customer", to: "nod_open" }],
      ["cnv_order", { from: "nod_open", to: "nod_customer", on: ["evt_paid"] }],
      ["cnv_charge", { from: "nod_tell", to: "nod_paidHere" }],
      ["cnv_charge", { from: "nod_buyer", to: "nod_end" }]
    ]) {
      expect(add(doc, canvas, edge), JSON.stringify(edge)).toThrow(CommandError);
    }
    try {
      add(doc, "cnv_order", { from: "nod_customer", to: "nod_open" })();
    } catch (error) {
      expect(error.code).toBe("NOT_ALLOWED");
      expect(error.message).toContain("guest");
    }
  });

  it("still links a shortcut to a guest", () => {
    expect(add(guestsDoc(), "cnv_order", { from: "nod_see", to: "nod_customer", kind: "link" })).not.toThrow();
  });

  it("leaves guests out of a flow's steps in the contract", async () => {
    const { contract } = await toContract(guestsDoc());
    const flow = contract.flows.find(item => item.id === "cnv_charge");
    expect(flow.steps.map(step => step.id)).toEqual(["nod_end", "nod_start", "nod_tell"]);
  });

  it("does not count guests as nodes a flow's scenarios must cover", async () => {
    const level = coverageOf(guestsDoc()).levels.find(item => item.canvas === "cnv_charge");
    expect(level.nodes.total).toBe(3);
  });
});
