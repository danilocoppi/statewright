import { describe, expect, it } from "vitest";
import { stringify } from "../../src/serialize/stringify.js";
import { minimalDoc } from "../helpers.js";

/** Minimal document plus a machine canvas with two states and one transition. */
function machineDoc() {
  const doc = minimalDoc();
  doc.catalog.events.evt_a = { name: "a" };
  doc.catalog.events.evt_b = { name: "b" };
  doc.canvases.cnv_m = {
    kind: "machine",
    name: "M",
    nodes: { nod_x: { kind: "state", name: "x" }, nod_y: { kind: "state", name: "y" } },
    edges: { edg_xy: { to: "nod_y", from: "nod_x", on: ["evt_b", "evt_a"], guard: { expr: { "==": [1, 1] } } } }
  };
  return doc;
}

describe("stringify", () => {
  it("writes top-level keys in format order, 2-space indented, with a trailing newline", () => {
    const doc = minimalDoc();
    const shuffled = { canvases: doc.canvases, root: doc.root, catalog: doc.catalog, ...doc };
    const text = stringify(shuffled);
    expect(Object.keys(JSON.parse(text))).toEqual([
      "statewright",
      "project",
      "root",
      "catalog",
      "definitions",
      "canvases"
    ]);
    expect(text.startsWith('{\n  "statewright": "1.3",')).toBe(true);
    expect(text.endsWith("}\n")).toBe(true);
  });

  it("orders element keys as the schema declares them and sorts ID maps", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes = {
      nod_b: { summary: "s", name: "B", kind: "service" },
      nod_a: { name: "A", kind: "store" }
    };
    const nodes = JSON.parse(stringify(doc)).canvases.cnv_root.nodes;
    expect(Object.keys(nodes)).toEqual(["nod_a", "nod_b"]);
    expect(Object.keys(nodes.nod_b)).toEqual(["kind", "name", "summary"]);
  });

  it("picks the right union branch (transition) when ordering edge keys", () => {
    const edge = JSON.parse(stringify(machineDoc())).canvases.cnv_m.edges.edg_xy;
    expect(Object.keys(edge)).toEqual(["from", "to", "on", "guard"]);
  });

  it("keeps array order", () => {
    const edge = JSON.parse(stringify(machineDoc())).canvases.cnv_m.edges.edg_xy;
    expect(edge.on).toEqual(["evt_b", "evt_a"]);
  });

  it("puts x- keys last, sorted, and sorts keys inside free JSON", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root["x-b"] = 1;
    doc.canvases.cnv_root["x-a"] = { z: 1, y: 2 };
    const canvas = JSON.parse(stringify(doc)).canvases.cnv_root;
    expect(Object.keys(canvas).slice(-2)).toEqual(["x-a", "x-b"]);
    expect(Object.keys(canvas["x-a"])).toEqual(["y", "z"]);
  });

  it("is idempotent", () => {
    const once = stringify(machineDoc());
    expect(stringify(JSON.parse(once))).toBe(once);
  });
});
