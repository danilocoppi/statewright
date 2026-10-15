import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { minimalDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

describe("canvas.create / canvas.update", () => {
  it("creates an empty canvas and makes it the owner's interior", () => {
    let doc = run(minimalDoc(), cmd("node.add", { canvas: "cnv_root", node: { kind: "service", name: "Engine" } }));
    const result = applyBatch(doc, [
      cmd("canvas.create", { kind: "machine", name: "Lifecycle", owner: "nod_engine", kicker: "Core" })
    ]);
    doc = result.doc;
    expect(result.created).toEqual(["cnv_lifecycle"]);
    expect(doc.canvases.cnv_lifecycle).toEqual({
      kind: "machine",
      name: "Lifecycle",
      kicker: "Core",
      nodes: {},
      edges: {}
    });
    expect(doc.canvases.cnv_root.nodes.nod_engine.inner).toEqual({ canvas: "cnv_lifecycle" });
  });

  it("refuses owners that already have an interior or cannot hold that kind", () => {
    let doc = machineDoc(minimalDoc());
    expect(failure(doc, cmd("canvas.create", { kind: "flow", name: "F", owner: "nod_a" })).code).toBe("WRONG_KIND");
    doc = run(doc, cmd("canvas.create", { kind: "machine", name: "Sub", owner: "nod_a" }));
    expect(failure(doc, cmd("canvas.create", { kind: "machine", name: "Again", owner: "nod_a" })).code).toBe(
      "NOT_ALLOWED"
    );
  });

  it("does not create contents or change the kind through canvas commands", () => {
    expect(failure(minimalDoc(), cmd("canvas.create", { kind: "system", name: "S", nodes: {} })).code).toBe(
      "NOT_ALLOWED"
    );
    expect(failure(minimalDoc(), cmd("canvas.update", { id: "cnv_root", set: { kind: "flow" } })).code).toBe(
      "NOT_ALLOWED"
    );
    const doc = run(
      minimalDoc(),
      cmd("canvas.update", { id: "cnv_root", set: { title: "Runtime", stage: "as-built" } })
    );
    expect(doc.canvases.cnv_root).toMatchObject({ title: "Runtime", stage: "as-built" });
  });
});

describe("node.add / node.update", () => {
  it("adds a node, generates its ID and stores its position when given", () => {
    const result = applyBatch(minimalDoc(), [
      cmd("node.add", { canvas: "cnv_root", node: { kind: "store", name: "Entity store" }, at: { x: 10.4, y: 20.6 } })
    ]);
    expect(result.created).toEqual(["nod_entityStore"]);
    expect(result.doc.layout.canvases.cnv_root.nodes.nod_entityStore).toEqual({ x: 10, y: 21 });
  });

  it("only allows node kinds of the canvas kind", () => {
    expect(
      failure(minimalDoc(), cmd("node.add", { canvas: "cnv_root", node: { kind: "state", name: "s" } })).code
    ).toBe("SCHEMA");
  });

  it("keeps region membership consistent", () => {
    let doc = run(machineDoc(minimalDoc()), cmd("region.add", { canvas: "cnv_m", name: "Main" }));
    expect(doc.canvases.cnv_m.nodes.nod_a.region).toBe("rgn_main");
    expect(failure(doc, cmd("node.add", { canvas: "cnv_m", node: { kind: "state", name: "c" } })).code).toBe("SCHEMA");
    doc = run(doc, cmd("node.add", { canvas: "cnv_m", node: { kind: "state", name: "c", region: "rgn_main" } }));
    expect(doc.canvases.cnv_m.nodes.nod_c.region).toBe("rgn_main");
    const other = run(machineDoc(minimalDoc()), cmd("canvas.create", { kind: "machine", name: "N", id: "cnv_n" }));
    const withRegion = run(other, cmd("region.add", { canvas: "cnv_n", name: "R" }));
    const error = failure(withRegion, cmd("node.update", { id: "nod_a", set: { region: "rgn_r" } }));
    expect(error.code).toBe("SCHEMA");
  });

  it("changes kind when the result is valid", () => {
    const doc = run(
      machineDoc(minimalDoc()),
      cmd("node.update", { id: "nod_b", set: { kind: "choice" }, unset: ["name"] })
    );
    expect(doc.canvases.cnv_m.nodes.nod_b).toEqual({ kind: "choice" });
  });

  it("keeps the edge rules when a node changes kind", () => {
    const doc = machineDoc(minimalDoc());
    const toInitial = cmd("node.update", { id: "nod_b", set: { kind: "initial" }, unset: ["name"] });
    expect(failure(doc, toInitial).code).toBe("NOT_ALLOWED");
    const toRef = cmd("node.update", { id: "nod_b", set: { kind: "ref", target: "cnv_root" }, unset: ["name"] });
    expect(failure(doc, toRef).code).toBe("NOT_ALLOWED");
  });

  it("refuses an own interior that contains its owner", () => {
    const doc = machineDoc(minimalDoc());
    expect(failure(doc, cmd("node.update", { id: "nod_a", set: { inner: { canvas: "cnv_m" } } })).code).toBe(
      "NOT_ALLOWED"
    );
  });

  it("protects an own interior from being dropped by an update", () => {
    const doc = run(machineDoc(minimalDoc()), cmd("canvas.create", { kind: "machine", name: "Sub", owner: "nod_a" }));
    expect(failure(doc, cmd("node.update", { id: "nod_a", unset: ["inner"] })).code).toBe("NOT_ALLOWED");
  });
});

describe("edge.add / edge.update", () => {
  it("names edges after their ends", () => {
    const result = applyBatch(machineDoc(minimalDoc()), [
      cmd("edge.add", { canvas: "cnv_m", edge: { from: "nod_b", to: "nod_a" } })
    ]);
    expect(result.created).toEqual(["edg_bA"]);
  });

  it("keeps both ends on the same canvas", () => {
    const doc = run(
      machineDoc(minimalDoc()),
      cmd("node.add", { canvas: "cnv_root", node: { kind: "service", name: "S" } })
    );
    expect(failure(doc, cmd("edge.add", { canvas: "cnv_m", edge: { from: "nod_a", to: "nod_s" } })).code).toBe(
      "NOT_ALLOWED"
    );
  });

  it("enforces link edges for ref nodes and forbids targeting pseudo-starts", () => {
    let doc = run(
      machineDoc(minimalDoc()),
      cmd("node.add", { canvas: "cnv_m", node: { kind: "ref", target: "cnv_root" }, id: "nod_ref" }),
      cmd("node.add", { canvas: "cnv_m", node: { kind: "initial" }, id: "nod_init" })
    );
    expect(failure(doc, cmd("edge.add", { canvas: "cnv_m", edge: { from: "nod_a", to: "nod_ref" } })).code).toBe(
      "NOT_ALLOWED"
    );
    doc = run(doc, cmd("edge.add", { canvas: "cnv_m", edge: { kind: "link", from: "nod_a", to: "nod_ref" } }));
    expect(
      failure(doc, cmd("edge.add", { canvas: "cnv_m", edge: { kind: "link", from: "nod_a", to: "nod_b" } })).code
    ).toBe("NOT_ALLOWED");
    expect(failure(doc, cmd("edge.add", { canvas: "cnv_m", edge: { from: "nod_a", to: "nod_init" } })).code).toBe(
      "NOT_ALLOWED"
    );
  });

  it("updates triggers with references checked", () => {
    expect(
      failure(machineDoc(minimalDoc()), cmd("edge.update", { id: "edg_ab", set: { on: ["evt_none"] } })).code
    ).toBe("NOT_FOUND");
  });
});

describe("regions", () => {
  const twoRegions = () =>
    run(
      machineDoc(minimalDoc()),
      cmd("region.add", { canvas: "cnv_m", name: "One" }),
      cmd("region.add", { canvas: "cnv_m", name: "Two" })
    );

  it("only exist on machine canvases", () => {
    expect(failure(minimalDoc(), cmd("region.add", { canvas: "cnv_root", name: "R" })).code).toBe("WRONG_KIND");
  });

  it("moves nodes to another region on removal", () => {
    const doc = run(twoRegions(), cmd("region.remove", { id: "rgn_one", moveNodesTo: "rgn_two" }));
    expect(Object.keys(doc.canvases.cnv_m.regions)).toEqual(["rgn_two"]);
    expect(doc.canvases.cnv_m.nodes.nod_a.region).toBe("rgn_two");
  });

  it("needs moveNodesTo or cascade while it has nodes", () => {
    expect(failure(twoRegions(), cmd("region.remove", { id: "rgn_one" })).code).toBe("IN_USE");
    const doc = run(twoRegions(), cmd("region.remove", { id: "rgn_one", cascade: true }));
    expect(doc.canvases.cnv_m.nodes).toEqual({});
    expect(doc.canvases.cnv_m.edges).toEqual({});
  });

  it("removing the last region keeps the nodes in a single implicit region", () => {
    const doc = run(
      machineDoc(minimalDoc()),
      cmd("region.add", { canvas: "cnv_m", name: "Only" }),
      cmd("region.remove", { id: "rgn_only" })
    );
    expect(doc.canvases.cnv_m.regions).toBeUndefined();
    expect(doc.canvases.cnv_m.nodes.nod_a).toEqual({ kind: "state", name: "a" });
  });
});
