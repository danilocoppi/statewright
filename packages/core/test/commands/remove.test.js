import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

describe("node.remove / edge.remove", () => {
  it("removes a node with its edges", () => {
    const doc = run(machineDoc(minimalDoc()), cmd("node.remove", { id: "nod_a" }));
    expect(Object.keys(doc.canvases.cnv_m.nodes)).toEqual(["nod_b"]);
    expect(doc.canvases.cnv_m.edges).toEqual({});
  });

  it("is blocked by other references unless cascade", () => {
    let doc = run(
      machineDoc(minimalDoc()),
      cmd("node.add", { canvas: "cnv_m", node: { kind: "any", except: ["nod_a"] }, id: "nod_any" })
    );
    expect(failure(doc, cmd("node.remove", { id: "nod_a" })).code).toBe("IN_USE");
    doc = run(doc, cmd("node.remove", { id: "nod_a", cascade: true }));
    expect(doc.canvases.cnv_m.nodes.nod_any).toEqual({ kind: "any", except: [] });
  });

  it("removes a single edge", () => {
    const doc = run(machineDoc(minimalDoc()), cmd("edge.remove", { id: "edg_ab" }));
    expect(doc.canvases.cnv_m.edges).toEqual({});
  });

  it("checks the element type", () => {
    expect(failure(machineDoc(minimalDoc()), cmd("node.remove", { id: "edg_ab" })).code).toBe("WRONG_KIND");
  });
});

describe("canvas.remove", () => {
  it("removes contents and nested own interiors, and the owner loses its interior", () => {
    const result = applyBatch(paymentsDoc(), [cmd("canvas.remove", { id: "cnv_lifecycle" })]);
    expect(result.doc.canvases.cnv_lifecycle).toBeUndefined();
    expect(result.doc.canvases.cnv_runtime.nodes.nod_lifecycleEngine.inner).toBeUndefined();
    expect(result.doc.canvases.cnv_expiryClock).toBeDefined();
  });

  it("refuses the root canvas and definition bodies", () => {
    expect(failure(paymentsDoc(), cmd("canvas.remove", { id: "cnv_runtime" })).code).toBe("NOT_ALLOWED");
    expect(failure(paymentsDoc(), cmd("canvas.remove", { id: "cnv_expiryClock" })).code).toBe("NOT_ALLOWED");
  });
});
