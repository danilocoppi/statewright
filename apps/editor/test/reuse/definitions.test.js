import { applyBatch, buildIndex } from "statewright";
import { describe, expect, it } from "vitest";

import { projectLevel } from "@/canvas/project";
import { instanceCounts, interiorCommands, interiorKinds, partOf } from "@/reuse/definitions";

import { placedExample, readExample } from "../fixtures.js";

const entry = (doc, id) => buildIndex(doc).get(id);

describe("reuse", () => {
  it("knows which interiors each kind of element can have", () => {
    const doc = readExample("payments");
    expect(interiorKinds(doc, entry(doc, "nod_scheduler"))).toEqual(["system", "machine", "flow", "mixed"]);
    expect(interiorKinds(doc, entry(doc, "nod_complianceHold"))).toEqual(["machine", "mixed"]);
    const action = Object.keys(doc.catalog.actions)[0];
    expect(interiorKinds(doc, entry(doc, action))).toEqual(["flow", "mixed"]);
    expect(interiorKinds(doc, entry(doc, Object.keys(doc.catalog.events)[0]))).toEqual([]);
  });

  it("counts the uses of each reusable part, and finds the part a level belongs to", () => {
    const doc = readExample("payments");
    expect(instanceCounts(doc)).toEqual(
      new Map([
        ["def_complianceHold", 1],
        ["def_expiryClock", 1],
        ["def_crossBorderSend", 1]
      ])
    );
    expect(partOf(doc, "cnv_complianceHold")).toBe("def_complianceHold");
    expect(partOf(doc, "cnv_lifecycle")).toBeNull();
    expect(partOf(doc, "cnv_runtime")).toBeNull();
    // A level inside a part's body is part of it too.
    const state = Object.keys(doc.canvases.cnv_complianceHold.nodes).find(
      id => doc.canvases.cnv_complianceHold.nodes[id].kind === "state"
    );
    const nested = applyBatch(doc, interiorCommands(doc, state, "machine", "Inside").commands).doc;
    const inside = Object.keys(nested.canvases).find(id => !doc.canvases[id]);
    expect(partOf(nested, inside)).toBe("def_complianceHold");
  });

  it("gives an element a new interior of a kind, named after it", () => {
    const doc = readExample("payments");
    const { id, commands } = interiorCommands(doc, "nod_scheduler", "flow", "Scheduler");
    const after = applyBatch(doc, commands).doc;
    expect(after.canvases[id]).toMatchObject({ kind: "flow", name: "Scheduler" });
    expect(after.canvases.cnv_runtime.nodes.nod_scheduler.inner).toEqual({ canvas: id });
  });

  it("tells the canvas how many boxes use the part a box is an instance of", async () => {
    const level = projectLevel(await placedExample("payments"), "cnv_lifecycle");
    const instance = level.nodes.find(node => node.id === "nod_complianceHold");
    expect(instance.data.uses).toBe(1);
    expect(level.nodes.find(node => node.type === "heading").data.uses).toBeUndefined();
  });
});
