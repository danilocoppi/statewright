import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { findElements, findItems, newItem, pathFrom, pickCommands } from "@/inspector/references";
import { parseGlob, parseSigned } from "@/inspector/values";

import { readExample } from "../fixtures.js";

const run = (doc, commands) => applyBatch(doc, commands).doc;
const unnamed = kind => `Unnamed ${kind}`;

describe("catalog items named in a field", () => {
  it("creates what is typed, valid for its collection", () => {
    expect(newItem("events", "Refund issued")).toEqual({ name: "refundIssued" });
    expect(newItem("events", "psp.refund")).toEqual({ name: "psp.refund" });
    expect(newItem("events", "!!")).toBeNull();
    expect(newItem("statuses", "  On review ")).toEqual({ name: "On review" });
    expect(newItem("parties", "Support")).toEqual({ kind: "human", name: "Support" });
    expect(newItem("types", "Refund")).toEqual({ kind: "object", name: "Refund" });
    expect(newItem("endpoints", "Refund a payment")).toEqual({
      name: "Refund a payment",
      method: "POST",
      path: "/refund-a-payment"
    });
    expect(newItem("webhooks", "Settled", { outgoing: true })).toEqual({ name: "Settled", direction: "out" });
    expect(newItem("timers", "")).toBeNull();
    expect(pathFrom(" Pay — now! ")).toBe("/pay-now");
  });

  it("chooses an item, or creates it and chooses it, as one change", () => {
    const doc = readExample("get-paid-as-built");
    const chosen = pickCommands(doc, "nod_created", "statuses", { id: "sts_expired" }, id => ["sts_created", id]);
    expect(run(doc, chosen).canvases.cnv_open.nodes.nod_created.statuses).toEqual(["sts_created", "sts_expired"]);
    const created = pickCommands(
      doc,
      "nod_created",
      "statuses",
      { collection: "statuses", item: { name: "On review" } },
      id => ["sts_created", id]
    );
    expect(created[0]).toEqual({
      type: "catalog.add",
      args: { collection: "statuses", id: "sts_onReview", item: { name: "On review" } }
    });
    const after = run(doc, created);
    expect(after.catalog.statuses.sts_onReview).toEqual({ name: "On review" });
    expect(after.canvases.cnv_open.nodes.nod_created.statuses).toEqual(["sts_created", "sts_onReview"]);
  });

  it("finds items of several collections, those that start with the words first, with their uses", () => {
    const doc = readExample("payments");
    const found = findItems(doc, ["endpoints", "webhooks"], "");
    expect(new Set(found.map(item => item.collection))).toEqual(new Set(["endpoints", "webhooks"]));
    const [first] = findItems(doc, ["events"], "ops");
    expect(first.name.startsWith("ops")).toBe(true);
    expect(first.uses).toBeGreaterThanOrEqual(0);
    expect(findItems(doc, ["events"], "no such thing")).toEqual([]);
  });

  it("finds elements by name: levels, boxes and arrows with their level, reusable parts", () => {
    const doc = readExample("payments");
    const levels = findElements(doc, ["canvas"], "runtime", { unnamed });
    expect(levels[0]).toMatchObject({ id: "cnv_runtime", type: "canvas" });
    const boxes = findElements(doc, ["node"], "sched", { unnamed });
    expect(boxes[0]).toMatchObject({ id: "nod_scheduler", type: "node", canvas: "cnv_runtime" });
    const own = findElements(doc, ["node"], "", { canvas: "cnv_runtime", unnamed, limit: 50 });
    expect(own.every(item => item.canvas === "cnv_runtime")).toBe(true);
    expect(findElements(doc, ["definition"], "compliance", { unnamed })[0].id).toBe("def_complianceHold");
  });
});

describe("values typed in plain words", () => {
  it("reads durations before or after a moment, and event patterns", () => {
    expect(parseSigned("-7 days")).toBe("-P7D");
    expect(parseSigned("+2 hours")).toBe("PT2H");
    expect(parseSigned("-P7D")).toBe("-P7D");
    expect(parseSigned("soon")).toBeNull();
    expect(parseGlob(" leg.* ")).toBe("leg.*");
    expect(parseGlob("Leg*")).toBeNull();
  });
});
