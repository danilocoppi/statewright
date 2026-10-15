import { describe, expect, it } from "vitest";
import { createDocument } from "../src/create.js";
import { check } from "../src/rules/index.js";
import { parseValue } from "../src/serialize/parse.js";

describe("createDocument", () => {
  it("creates a valid empty document whose root system canvas is named after the project", () => {
    const doc = createDocument({ name: "Order flow" });
    expect(parseValue(doc).ok).toBe(true);
    expect(doc.project).toEqual({ id: "prj_orderFlow", name: "Order flow" });
    expect(doc.root).toBe("cnv_orderFlow");
    expect(doc.canvases.cnv_orderFlow).toEqual({ kind: "system", name: "Order flow", nodes: {}, edges: {} });
    expect(check(doc)).toEqual([]);
  });

  it("starts a machine or a flow with its first elements, without Problems", () => {
    const machine = createDocument({ name: "Order", kind: "machine" });
    expect(machine.canvases.cnv_order).toEqual({
      kind: "machine",
      name: "Order",
      nodes: { nod_initial: { kind: "initial" }, nod_firstState: { kind: "state", name: "First state" } },
      edges: { edg_initialFirstState: { from: "nod_initial", to: "nod_firstState" } }
    });
    const flow = createDocument({ name: "Refund", kind: "flow", names: { end: "Refunded" } });
    expect(flow.canvases.cnv_refund.nodes.nod_end).toEqual({ kind: "end", name: "Refunded", outcome: "success" });
    for (const doc of [machine, flow]) {
      expect(parseValue(doc).ok).toBe(true);
      expect(check(doc).filter(problem => problem.severity === "error")).toEqual([]);
    }
    expect(() => createDocument({ name: "Shop", kind: "board" })).toThrow(/Invalid kind/);
  });

  it("accepts a project ID and refuses invalid projects", () => {
    expect(createDocument({ name: "Shop", id: "prj_store" }).project.id).toBe("prj_store");
    expect(() => createDocument({ name: "" })).toThrow(TypeError);
    expect(() => createDocument({ name: "Shop", id: "store" })).toThrow(/Invalid project/);
  });
});
