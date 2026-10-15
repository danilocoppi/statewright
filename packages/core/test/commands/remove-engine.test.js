import { enablePatches, produce } from "immer";
import { describe, expect, it } from "vitest";
import { CommandError } from "../../src/commands/errors.js";
import { removeElements } from "../../src/commands/remove.js";
import { minimalDoc } from "../helpers.js";
import { machineDoc } from "./helpers.js";

enablePatches();

/** Run removeElements on a draft of `doc`; returns the new document. */
const remove = (doc, ids, options) => produce(doc, draft => void removeElements(draft, ids, options));

/** The CommandError thrown by a removal. */
function removalError(doc, ids, options) {
  try {
    remove(doc, ids, options);
  } catch (error) {
    if (error instanceof CommandError) return error;
    throw error;
  }
  throw new Error("Expected the removal to fail");
}

describe("removeElements", () => {
  it("removes a node with its edges and every annotation and layout entry pointing at them", () => {
    const doc = machineDoc(minimalDoc());
    doc.layout = { canvases: { cnv_m: { nodes: { nod_a: { x: 0, y: 0 } }, edges: { edg_ab: { labelAt: [1, 1] } } } } };
    doc.annotations = {
      findings: {
        fnd_A1: { code: "A1", title: "only a", severity: "low", targets: ["nod_a"] },
        fnd_A2: { code: "A2", title: "a and b", severity: "low", targets: ["nod_a", "nod_b"] }
      },
      focus: ["edg_ab"],
      notes: { nte_note: { text: "n", canvas: "cnv_m", target: "nod_a" } }
    };
    const next = remove(doc, ["nod_a"]);
    expect(Object.keys(next.canvases.cnv_m.nodes)).toEqual(["nod_b"]);
    expect(next.canvases.cnv_m.edges).toEqual({});
    expect(next.layout).toBeUndefined();
    expect(next.annotations).toEqual({
      findings: { fnd_A2: { code: "A2", title: "a and b", severity: "low", targets: ["nod_b"] } }
    });
  });

  it("blocks on other references with IN_USE, in document order", () => {
    const doc = machineDoc(minimalDoc());
    doc.canvases.cnv_root.nodes.nod_shortcut = { kind: "ref", target: "nod_a" };
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any", except: ["nod_a"] };
    const error = removalError(doc, ["nod_a"]);
    expect(error.code).toBe("IN_USE");
    expect(error.details.usages).toEqual([
      { source: "nod_shortcut", field: "target", target: "nod_a" },
      { source: "nod_any", field: "except", target: "nod_a" }
    ]);
  });

  it("with cascade, splices lists, unsets fields and removes elements that need the target", () => {
    const doc = machineDoc(minimalDoc());
    doc.catalog.events.evt_go = { name: "go" };
    doc.catalog.guards.grd_ok = { name: "ok" };
    doc.canvases.cnv_root.nodes.nod_shortcut = { kind: "ref", target: "nod_a" };
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any", except: ["nod_a", "nod_b"] };
    doc.canvases.cnv_m.edges.edg_ab.on = ["evt_go"];
    doc.canvases.cnv_m.edges.edg_ab.guard = { guard: "grd_ok" };
    const next = remove(doc, ["nod_a", "evt_go", "grd_ok"], { cascade: true });
    expect(next.canvases.cnv_root.nodes).toEqual({});
    expect(next.canvases.cnv_m.nodes.nod_any.except).toEqual(["nod_b"]);
    expect(next.catalog.events).toEqual({});
  });

  it("removes a canvas with its contents and nested own interiors; the owner keeps living", () => {
    const doc = machineDoc(minimalDoc());
    doc.canvases.cnv_root.nodes.nod_svc = { kind: "service", inner: { canvas: "cnv_m" } };
    doc.canvases.cnv_m.nodes.nod_a.inner = { canvas: "cnv_sub" };
    doc.canvases.cnv_sub = { kind: "machine", name: "Sub", nodes: {}, edges: {} };
    const next = remove(doc, ["cnv_m"]);
    expect(Object.keys(next.canvases)).toEqual(["cnv_root"]);
    expect(next.canvases.cnv_root.nodes.nod_svc).toEqual({ kind: "service" });
  });

  it("never removes the root canvas", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.nod_loop = { kind: "service", inner: { canvas: "cnv_root" } };
    expect(removalError(doc, ["nod_loop"]).code).toBe("NOT_ALLOWED");
  });
});
