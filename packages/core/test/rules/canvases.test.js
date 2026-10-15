import { describe, expect, it } from "vitest";
import { cleanDoc, problems, targets } from "./fixtures.js";

/** A machine canvas with `count` plain states. */
const machineWith = count => ({
  kind: "machine",
  name: "Many",
  transitions: "unknown",
  nodes: Object.fromEntries(Array.from({ length: count }, (_, n) => [`nod_s${n}`, { kind: "state", name: `s${n}` }])),
  edges: {}
});

describe("canvas.orphan", () => {
  it("reports a canvas nobody enters", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_lost = { kind: "flow", name: "Lost", nodes: {}, edges: {} };
    expect(targets(doc, "canvas.orphan")).toEqual(["cnv_lost"]);
  });

  it("does not report definition bodies", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_body = { kind: "flow", name: "Body", nodes: {}, edges: {} };
    doc.definitions.def_body = { kind: "flow", name: "Body", canvas: "cnv_body" };
    expect(targets(doc, "canvas.orphan")).toEqual([]);
  });
});

describe("canvas.multiOwner", () => {
  it("reports a canvas that is the interior of two owners", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_root.nodes.nod_copy = { kind: "service", name: "Copy", inner: { canvas: "cnv_m" } };
    expect(problems(doc, "canvas.multiOwner").map(problem => [problem.target, problem.data])).toEqual([
      [
        "cnv_m",
        {
          owners: [
            { type: "inner", id: "nod_copy" },
            { type: "inner", id: "nod_engine" }
          ]
        }
      ]
    ]);
  });

  it("finds nothing when each canvas has one owner", () => {
    expect(targets(cleanDoc(), "canvas.multiOwner")).toEqual([]);
  });
});

describe("canvas.dense", () => {
  it("warns above 12 nodes", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_root.nodes.nod_engine.inner = { canvas: "cnv_many" };
    doc.canvases.cnv_many = machineWith(13);
    expect(problems(doc, "canvas.dense").map(problem => [problem.target, problem.data])).toEqual([
      ["cnv_many", { nodes: 13 }]
    ]);
    doc.canvases.cnv_many = machineWith(12);
    expect(targets(doc, "canvas.dense")).toEqual([]);
  });
});

describe("definition.cycle / canvas.cycle", () => {
  it("reports a definition that contains an instance of itself", () => {
    const doc = cleanDoc();
    doc.definitions.def_loop = { kind: "machine", name: "Loop", canvas: "cnv_loop" };
    doc.canvases.cnv_loop = {
      kind: "machine",
      name: "Loop",
      transitions: "unknown",
      nodes: { nod_again: { kind: "state", name: "again", inner: { definition: "def_loop" } } },
      edges: {}
    };
    expect(problems(doc, "definition.cycle").map(problem => [problem.target, problem.data])).toEqual([
      ["def_loop", { canvases: ["cnv_loop"], definitions: ["def_loop"] }]
    ]);
    expect(targets(doc, "canvas.cycle")).toEqual([]);
  });

  it("reports own interiors that contain each other", () => {
    const doc = cleanDoc();
    const holder = (name, inner) => ({
      kind: "machine",
      name,
      transitions: "unknown",
      nodes: { [`nod_${name}`]: { kind: "state", name, inner: { canvas: inner } } },
      edges: {}
    });
    doc.canvases.cnv_a = holder("a", "cnv_b");
    doc.canvases.cnv_b = holder("b", "cnv_a");
    expect(problems(doc, "canvas.cycle").map(problem => [problem.target, problem.data])).toEqual([
      ["cnv_a", { canvases: ["cnv_a", "cnv_b"], definitions: [] }]
    ]);
  });

  it("accepts definitions nested without a cycle", () => {
    const doc = cleanDoc();
    doc.definitions.def_inner = { kind: "machine", name: "Inner", canvas: "cnv_inner" };
    doc.canvases.cnv_inner = { kind: "machine", name: "Inner", transitions: "unknown", nodes: {}, edges: {} };
    doc.canvases.cnv_m.nodes.nod_busy.inner = { definition: "def_inner" };
    expect([...targets(doc, "definition.cycle"), ...targets(doc, "canvas.cycle")]).toEqual([]);
  });
});
