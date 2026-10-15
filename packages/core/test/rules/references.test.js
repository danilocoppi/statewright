import { describe, expect, it } from "vitest";
import { cleanDoc, problems, targets } from "./fixtures.js";

describe("ref.dangling", () => {
  it("reports references to missing IDs on the element that holds them", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_idleBusy.on = ["evt_go", "evt_missing"];
    doc.layout = { canvases: { cnv_m: { nodes: { nod_gone: { x: 0, y: 0 } } } } };
    expect(problems(doc, "ref.dangling").map(({ target, canvas, data }) => [target, canvas, data])).toEqual([
      ["cnv_m", "cnv_m", { field: "nodes", missing: "nod_gone", path: "/layout/canvases/cnv_m/nodes/nod_gone" }],
      [
        "edg_idleBusy",
        "cnv_m",
        { field: "on", missing: "evt_missing", path: "/canvases/cnv_m/edges/edg_idleBusy/on/1" }
      ]
    ]);
  });

  it("reports a missing root on the project", () => {
    const doc = cleanDoc();
    doc.root = "cnv_none";
    expect(targets(doc, "ref.dangling")).toEqual(["prj_demo"]);
  });

  it("finds nothing when every reference resolves", () => {
    expect(targets(cleanDoc(), "ref.dangling")).toEqual([]);
  });
});

describe("ref.kind", () => {
  it("reports edge ends and lane nodes on another canvas", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_root.edges.edg_cross = { from: "nod_engine", to: "nod_idle" };
    doc.annotations = { lanes: { lne_rail: { canvas: "cnv_root", label: "Rail", nodes: ["nod_idle"] } } };
    expect(targets(doc, "ref.kind")).toEqual(["edg_cross", "lne_rail"]);
  });

  it("reports interiors of a kind the element cannot hold, and definition bodies of another kind", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_busy.inner = { canvas: "cnv_sub" };
    doc.canvases.cnv_sub = { kind: "flow", name: "Sub", nodes: {}, edges: {} };
    doc.definitions.def_mixed = { kind: "machine", name: "Mixed", canvas: "cnv_body" };
    doc.canvases.cnv_body = { kind: "flow", name: "Body", nodes: {}, edges: {} };
    expect(problems(doc, "ref.kind").map(problem => [problem.target, problem.data])).toEqual([
      ["def_mixed", { canvas: "cnv_body", kind: "flow" }],
      ["nod_busy", { interior: "cnv_sub", kind: "flow", allowed: ["machine", "mixed"] }]
    ]);
  });

  it("reports ref nodes to annotations, notes off their canvas and inbound webhooks used as steps", () => {
    const doc = cleanDoc();
    doc.annotations = {
      findings: { fnd_A1: { code: "A1", title: "t", severity: "low", targets: ["nod_idle"] } },
      notes: { nte_off: { text: "n", canvas: "cnv_root", target: "nod_idle" } }
    };
    doc.canvases.cnv_root.nodes.nod_shortcut = { kind: "ref", target: "fnd_A1" };
    doc.catalog.webhooks.whk_in = { name: "In", direction: "in" };
    doc.canvases.cnv_f.nodes.nod_tell = { kind: "webhook", webhook: "whk_in" };
    expect(targets(doc, "ref.kind")).toEqual(["nod_shortcut", "nod_tell", "nte_off"]);
  });

  it("checks that done regions belong to the canvas or to the source state's interior", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_sub = { kind: "machine", name: "Sub", regions: { rgn_a: { name: "a" } }, nodes: {}, edges: {} };
    doc.canvases.cnv_m.edges.edg_busyDone.done = "rgn_a";
    expect(targets(doc, "ref.kind")).toEqual(["edg_busyDone"]);
    doc.canvases.cnv_m.nodes.nod_busy.inner = { canvas: "cnv_sub" };
    expect(targets(doc, "ref.kind")).toEqual([]);
  });

  it("accepts ref nodes to canvases, nodes, definitions and catalog items", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_root.nodes.nod_toCanvas = { kind: "ref", target: "cnv_m" };
    doc.canvases.cnv_root.nodes.nod_toItem = { kind: "ref", target: "act_work" };
    expect(targets(doc, "ref.kind")).toEqual([]);
  });
});

describe("id.duplicate", () => {
  it("reports an ID used twice, with every place, and does not guess which one references mean", () => {
    const doc = cleanDoc();
    doc.catalog.events.nod_idle = { name: "clash", payload: null };
    expect(problems(doc, "id.duplicate").map(problem => [problem.target, problem.data])).toEqual([
      ["nod_idle", { paths: ["/canvases/cnv_m/nodes/nod_idle", "/catalog/events/nod_idle"] }]
    ]);
    expect(targets(doc, "ref.kind")).toEqual([]);
  });

  it("finds nothing when IDs are unique", () => {
    expect(targets(cleanDoc(), "id.duplicate")).toEqual([]);
  });
});
