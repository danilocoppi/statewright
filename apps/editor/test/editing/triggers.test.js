import { applyBatch, edgeLabel } from "statewright";
import { describe, expect, it } from "vitest";

import { eventName, guardCommands, kindCommands, matches, parseDuration, triggerCommands } from "@/editing/triggers";
import { newProject } from "@/files/new-project";

import { placedExample } from "../fixtures.js";

const run = (doc, commands) => applyBatch(doc, commands).doc;

/** A machine with two states joined by a transition without a trigger, edg_go. */
function machine() {
  const doc = newProject({ name: "Triggers", kind: "machine", names: { state: "Open", end: "Done" } }, new Set());
  return run(doc, [
    { type: "node.add", args: { canvas: doc.root, id: "nod_paid", node: { kind: "state", name: "Paid" } } },
    { type: "edge.add", args: { canvas: doc.root, id: "edg_go", edge: { from: "nod_firstState", to: "nod_paid" } } }
  ]);
}

describe("the trigger editor's model", () => {
  it("finds catalog items by what is typed, names that start with it first, with how often each is used", async () => {
    const doc = await placedExample("payments");
    const found = matches(doc, "events", "ops.");
    expect(found.length).toBeGreaterThan(0);
    expect(found.map(item => item.name)).toEqual([
      "ops.approve",
      "ops.cancel",
      "ops.fail",
      "ops.reject",
      "ops.resume",
      "ops.rfi"
    ]);
    expect(found[0]).toEqual({
      id: expect.stringMatching(/^evt_/),
      name: expect.any(String),
      uses: expect.any(Number)
    });
    expect(matches(doc, "events", "cancel").map(item => item.name)).toEqual(["ops.cancel", "owner.cancel"]);
    expect(matches(doc, "events", "pay", 2).map(item => item.name)).toEqual(["payin.confirmed", "payin.detected"]);
  });

  it("names a new event the way the format wants", () => {
    expect(eventName("psp.refund")).toBe("psp.refund");
    expect(eventName("Refund issued")).toBe("refundIssued");
    expect(eventName("Payout. Sent ")).toBe("payout.sent");
    expect(eventName("  ")).toBeNull();
  });

  it("reads durations as a person types them, in English, Portuguese and Spanish", () => {
    expect(parseDuration("30 min")).toBe("PT30M");
    expect(parseDuration("2 hours")).toBe("PT2H");
    expect(parseDuration("45s")).toBe("PT45S");
    expect(parseDuration("3 dias")).toBe("P3D");
    expect(parseDuration("1 semana")).toBe("P1W");
    expect(parseDuration("PT90S")).toBe("PT90S");
    expect(parseDuration("soon")).toBeNull();
  });

  it("sets a new event as the trigger, adding it to the catalog in the same change", () => {
    const doc = machine();
    const after = run(doc, triggerCommands(doc, "edg_go", { on: { name: "psp.refund" } }));
    expect(after.catalog.events.evt_pspRefund).toEqual({ name: "psp.refund" });
    expect(after.canvases[doc.root].edges.edg_go.on).toEqual(["evt_pspRefund"]);
    expect(edgeLabel(after, "edg_go")).toBe("psp.refund");
  });

  it("adds an event to those a transition already has, once, and takes one out", () => {
    let doc = machine();
    const on = () => doc.canvases[doc.root].edges.edg_go.on;
    doc = run(doc, triggerCommands(doc, "edg_go", { on: { name: "psp.refund" } }));
    doc = run(doc, triggerCommands(doc, "edg_go", { on: { name: "psp.chargeback" } }));
    expect(on()).toEqual(["evt_pspRefund", "evt_pspChargeback"]);
    doc = run(doc, triggerCommands(doc, "edg_go", { on: { id: "evt_pspRefund" } }));
    expect(on()).toEqual(["evt_pspRefund", "evt_pspChargeback"]);
    doc = run(doc, triggerCommands(doc, "edg_go", { without: "evt_pspRefund" }));
    expect(on()).toEqual(["evt_pspChargeback"]);
    doc = run(doc, triggerCommands(doc, "edg_go", { without: "evt_pspChargeback" }));
    expect(on()).toBeUndefined();
  });

  it("replaces an event with a new timer whose name says its duration, and clears every trigger with No trigger", () => {
    let doc = machine();
    doc = run(doc, triggerCommands(doc, "edg_go", { on: { name: "psp.refund" } }));
    doc = run(doc, triggerCommands(doc, "edg_go", { after: { name: "30 min" } }));
    const edge = doc.canvases[doc.root].edges.edg_go;
    expect(edge.on).toBeUndefined();
    expect(doc.catalog.timers[edge.after]).toEqual({ name: "30 min", duration: "PT30M" });
    doc = run(doc, triggerCommands(doc, "edg_go", { none: true }));
    expect(doc.canvases[doc.root].edges.edg_go).toEqual({ from: "nod_firstState", to: "nod_paid" });
  });

  it("guards a transition with a new guard, an existing one or a condition in plain words", () => {
    let doc = machine();
    doc = run(doc, guardCommands(doc, "edg_go", { guard: { name: "Amount covered" } }));
    const { guard } = doc.canvases[doc.root].edges.edg_go;
    expect(doc.catalog.guards[guard.guard]).toEqual({ name: "Amount covered" });
    doc = run(doc, guardCommands(doc, "edg_go", { text: " the payer confirmed " }));
    expect(doc.canvases[doc.root].edges.edg_go.guard).toEqual({ text: "the payer confirmed" });
    doc = run(doc, guardCommands(doc, "edg_go", null));
    expect(doc.canvases[doc.root].edges.edg_go.guard).toBeUndefined();
  });

  it("sets the kind of a system connection and the branch of a flow edge", async () => {
    let doc = await placedExample("payments");
    const edgeId = Object.keys(doc.canvases.cnv_runtime.edges)[0];
    doc = run(doc, kindCommands(doc, edgeId, "stream"));
    expect(doc.canvases.cnv_runtime.edges[edgeId].kind).toBe("stream");
    let flow = newProject({ name: "F", kind: "flow", names: { state: "S", end: "Done" } }, new Set());
    flow = run(flow, [
      { type: "node.add", args: { canvas: flow.root, id: "nod_route", node: { kind: "switch", name: "Route" } } },
      {
        type: "edge.add",
        args: { canvas: flow.root, id: "edg_case", edge: { from: "nod_route", to: "nod_end", kind: "case", case: "a" } }
      }
    ]);
    flow = run(flow, kindCommands(flow, "edg_case", "case", " card "));
    expect(flow.canvases[flow.root].edges.edg_case).toMatchObject({ kind: "case", case: "card" });
    flow = run(flow, kindCommands(flow, "edg_case", "default"));
    expect(flow.canvases[flow.root].edges.edg_case).toEqual({ from: "nod_route", to: "nod_end", kind: "default" });
  });
});
