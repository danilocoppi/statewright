import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

const addEvent = (name, extra = {}) => cmd("catalog.add", { collection: "events", item: { name, ...extra } });

describe("catalog.add", () => {
  it("generates the ID from the name and reports it as created", () => {
    const result = applyBatch(minimalDoc(), [addEvent("payin.confirmed")]);
    expect(result.created).toEqual(["evt_payinConfirmed"]);
    expect(result.doc.catalog.events.evt_payinConfirmed).toEqual({ name: "payin.confirmed" });
  });

  it("uses a caller-chosen ID when valid and free", () => {
    const doc = run(
      minimalDoc(),
      cmd("catalog.add", { collection: "parties", item: { kind: "operator", name: "Ops" }, id: "pty_ops" })
    );
    expect(doc.catalog.parties.pty_ops.name).toBe("Ops");
    expect(
      failure(doc, cmd("catalog.add", { collection: "parties", item: { kind: "human", name: "X" }, id: "pty_ops" }))
        .code
    ).toBe("ID_TAKEN");
    expect(
      failure(doc, cmd("catalog.add", { collection: "parties", item: { kind: "human", name: "X" }, id: "evt_x" })).code
    ).toBe("INVALID_ID");
  });

  it("suffixes generated IDs on collision, also within one batch", () => {
    const result = applyBatch(minimalDoc(), [
      addEvent("a.b"),
      cmd("catalog.add", { collection: "events", item: { name: "aB" } })
    ]);
    expect(result.created).toEqual(["evt_aB", "evt_aB2"]);
  });

  it("validates the item against its collection", () => {
    const error = failure(minimalDoc(), addEvent("Not An Event Name"));
    expect(error.code).toBe("SCHEMA");
    expect(error.details.errors[0].path).toBe("/catalog/events/evt_notAnEventName/name");
  });

  it("checks references: existence and kind", () => {
    expect(failure(minimalDoc(), addEvent("a", { payload: "typ_missing" })).code).toBe("NOT_FOUND");
    const doc = run(minimalDoc(), cmd("catalog.add", { collection: "parties", item: { kind: "human", name: "P" } }));
    expect(failure(doc, addEvent("a", { payload: "pty_p" })).code).toBe("SCHEMA");
    expect(run(doc, addEvent("a", { source: "pty_p" })).catalog.events.evt_a.source).toBe("pty_p");
  });

  it("may reference items created earlier in the same batch, and itself", () => {
    const doc = run(
      minimalDoc(),
      cmd("catalog.add", {
        collection: "types",
        id: "typ_tree",
        item: { kind: "object", name: "Tree", fields: [{ name: "children", type: "typ_tree", list: true }] }
      }),
      addEvent("tree.grown", { payload: "typ_tree" })
    );
    expect(doc.catalog.events.evt_treeGrown.payload).toBe("typ_tree");
  });

  it("accepts an implementation flow as interior of actions, endpoints and webhooks only", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_handler = { kind: "flow", name: "Handler", nodes: {}, edges: {} };
    doc.canvases.cnv_m = { kind: "machine", name: "M", nodes: {}, edges: {} };
    const next = run(
      doc,
      cmd("catalog.add", { collection: "actions", item: { name: "Pay", inner: { canvas: "cnv_handler" } } })
    );
    expect(next.catalog.actions.act_pay.inner).toEqual({ canvas: "cnv_handler" });
    const wrongKind = cmd("catalog.add", { collection: "actions", item: { name: "Pay", inner: { canvas: "cnv_m" } } });
    expect(failure(doc, wrongKind).code).toBe("WRONG_KIND");
    const noInterior = cmd("catalog.add", {
      collection: "guards",
      item: { name: "G", inner: { canvas: "cnv_handler" } }
    });
    expect(failure(doc, noInterior).code).toBe("SCHEMA");
    const owned = cmd("catalog.add", {
      collection: "actions",
      item: { name: "Again", inner: { canvas: "cnv_handler" } }
    });
    expect(failure(next, owned).code).toBe("NOT_ALLOWED");
  });
});

describe("catalog.update", () => {
  it("renames without breaking references", () => {
    const doc = machineDoc(minimalDoc());
    doc.catalog.events.evt_aB = { name: "a.b" };
    doc.canvases.cnv_m.edges.edg_ab.on = ["evt_aB"];
    const next = run(doc, cmd("catalog.update", { id: "evt_aB", set: { name: "a.renamed" } }));
    expect(next.catalog.events.evt_aB.name).toBe("a.renamed");
    expect(next.canvases.cnv_m.edges.edg_ab.on).toEqual(["evt_aB"]);
  });

  it("rejects non-catalog IDs", () => {
    expect(failure(machineDoc(minimalDoc()), cmd("catalog.update", { id: "nod_a", set: {} })).code).toBe("WRONG_KIND");
    expect(failure(minimalDoc(), cmd("catalog.update", { id: "evt_none", set: {} })).code).toBe("NOT_FOUND");
  });

  it("protects an own implementation flow from being dropped", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_handler = { kind: "flow", name: "Handler", nodes: {}, edges: {} };
    doc.catalog.actions.act_pay = { name: "Pay", inner: { canvas: "cnv_handler" } };
    expect(failure(doc, cmd("catalog.update", { id: "act_pay", unset: ["inner"] })).code).toBe("NOT_ALLOWED");
  });
});

describe("catalog.remove", () => {
  it("lists usages and, with cascade, follows each reference's rule", () => {
    const doc = paymentsDoc();
    const error = failure(doc, cmd("catalog.remove", { id: "act_extendExpiry" }));
    expect(error.code).toBe("IN_USE");
    expect(error.details.usages).toEqual([
      { source: "edg_pausedRunning", field: "actions.action", target: "act_extendExpiry" }
    ]);
    const next = run(doc, cmd("catalog.remove", { id: "act_extendExpiry", cascade: true }));
    expect(next.canvases.cnv_expiryClock.edges.edg_pausedRunning.actions).toEqual([]);
    expect(next.catalog.actions.act_extendExpiry).toBeUndefined();
  });

  it("drops a guard-only condition, and removes flow steps that cannot exist without the item", () => {
    const doc = paymentsDoc();
    doc.canvases.cnv_flow = {
      kind: "flow",
      name: "Flow",
      nodes: { nod_emit: { kind: "emit", event: "evt_opsFail" } },
      edges: {}
    };
    let next = run(doc, cmd("catalog.remove", { id: "grd_scaledPayout", cascade: true }));
    expect(next.canvases.cnv_crossBorderSend.edges.edg_payingOutPartiallyCompleted.guard).toBeUndefined();
    next = run(next, cmd("catalog.remove", { id: "evt_opsFail", cascade: true }));
    expect(next.canvases.cnv_flow.nodes).toEqual({});
    expect(next.canvases.cnv_crossBorderSend.edges.edg_onHoldFailed.on).toEqual([]);
  });

  it("removes an action's own implementation flow with it", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_impl = { kind: "flow", name: "Impl", nodes: {}, edges: {} };
    doc.catalog.actions.act_pay = { name: "Pay", inner: { canvas: "cnv_impl" } };
    const next = run(doc, cmd("catalog.remove", { id: "act_pay" }));
    expect(next.canvases.cnv_impl).toBeUndefined();
  });
});
