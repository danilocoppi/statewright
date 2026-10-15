import { describe, expect, it } from "vitest";

import { diffDocuments } from "@/files/diff";

import { readExample } from "../fixtures.js";

describe("diffDocuments", () => {
  it("finds nothing between a document and itself", () => {
    expect(diffDocuments(readExample("payments"), readExample("payments"))).toEqual({ changes: [], layout: 0 });
  });

  it("lists added, changed and removed elements with readable names and places", () => {
    const before = readExample("get-paid-as-built");
    const after = structuredClone(before);
    after.canvases.cnv_open.nodes.nod_refunded = { kind: "state", name: "refunded" };
    after.canvases.cnv_open.edges.edg_awaitingRefunded = { from: "nod_awaitingPayment", to: "nod_refunded" };
    after.catalog.events.evt_pspRefund = { name: "psp.refund" };
    after.canvases.cnv_open.nodes.nod_created.summary = "a new summary";
    delete after.catalog.timers.tmr_deadline;
    delete after.canvases.cnv_transaction.edges.edg_openExpired;
    const { changes } = diffDocuments(before, after);
    expect(changes).toEqual(
      expect.arrayContaining([
        { change: "added", type: "catalog", id: "evt_pspRefund", name: "psp.refund", collection: "events" },
        { change: "added", type: "node", id: "nod_refunded", name: "refunded", canvasName: "Open" },
        {
          change: "added",
          type: "edge",
          id: "edg_awaitingRefunded",
          name: "awaiting_payment → refunded",
          canvasName: "Open"
        },
        { change: "changed", type: "node", id: "nod_created", name: "created", canvasName: "Open" },
        { change: "removed", type: "catalog", id: "tmr_deadline", name: "deadline sweep", collection: "timers" },
        { change: "removed", type: "edge", id: "edg_openExpired", name: "open → expired", canvasName: "Transaction" }
      ])
    );
    expect(changes).toHaveLength(6);
  });

  it("does not report a canvas as changed when only its contents changed", () => {
    const before = readExample("payments");
    const after = structuredClone(before);
    after.canvases.cnv_lifecycle.caption = "New caption";
    const firstNode = Object.keys(after.canvases.cnv_runtime.nodes)[0];
    after.canvases.cnv_runtime.nodes[firstNode].summary = "changed";
    const types = diffDocuments(before, after).changes.map(change => `${change.type}:${change.id}`);
    expect(types).toEqual(["canvas:cnv_lifecycle", `node:${firstNode}`]);
  });

  it("counts layout differences without listing them", () => {
    const before = readExample("get-paid-as-built");
    const after = structuredClone(before);
    after.layout.canvases.cnv_open.nodes.nod_created.x += 10;
    delete after.layout.canvases.cnv_transaction.nodes.nod_failed;
    expect(diffDocuments(before, after)).toEqual({ changes: [], layout: 2 });
  });
});
