import { describe, expect, it } from "vitest";
import {
  buildIndex,
  collectRefs,
  hierarchy,
  ownerOf,
  ownersOf,
  pathTo,
  resolve,
  usagesOf
} from "../../src/query/index.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";

describe("buildIndex", () => {
  it("locates every kind of element", () => {
    const index = buildIndex(paymentsDoc());
    expect(index.get("prj_payments").type).toBe("project");
    expect(index.get("evt_opsApprove")).toMatchObject({ type: "catalog", collection: "events" });
    expect(index.get("def_expiryClock").type).toBe("definition");
    expect(index.get("rgn_expiry")).toMatchObject({ type: "region", canvas: "cnv_lifecycle" });
    expect(index.get("nod_paused")).toMatchObject({
      type: "node",
      canvas: "cnv_expiryClock",
      path: ["canvases", "cnv_expiryClock", "nodes", "nod_paused"]
    });
    expect(index.get("edg_runningElapsed").type).toBe("edge");
    expect(index.duplicates).toEqual([]);
  });

  it("reports IDs used twice", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.nod_a = { kind: "service" };
    doc.canvases.cnv_other = { kind: "system", name: "Other", nodes: { nod_a: { kind: "store" } }, edges: {} };
    expect(buildIndex(doc).duplicates).toEqual(["nod_a"]);
  });
});

describe("collectRefs", () => {
  const refs = collectRefs(paymentsDoc());

  it("finds trigger, timer and guard references on transitions", () => {
    expect(refs).toContainEqual({
      section: "content",
      source: "edg_runningPaused",
      field: "on",
      path: ["canvases", "cnv_expiryClock", "edges", "edg_runningPaused", "on", 0],
      target: "evt_verifyStarted",
      expect: ["evt"],
      onRemove: "splice",
      removePath: ["canvases", "cnv_expiryClock", "edges", "edg_runningPaused", "on", 0]
    });
    expect(refs.find(ref => ref.source === "edg_runningElapsed" && ref.field === "after").target).toBe("tmr_expiry");
    expect(refs.find(ref => ref.field === "guard.guard").target).toBe("grd_scaledPayout");
  });

  it("marks references whose loss removes the whole element", () => {
    const from = refs.find(ref => ref.source === "edg_runningPaused" && ref.field === "from");
    expect(from).toMatchObject({ target: "nod_running", onRemove: "element" });
  });

  it("removes the whole effect when its action disappears", () => {
    const ref = refs.find(ref => ref.field === "actions.action" && ref.target === "act_extendExpiry");
    expect(ref.removePath).toEqual(["canvases", "cnv_expiryClock", "edges", "edg_pausedRunning", "actions", 0]);
  });

  it("removes the whole inner when its canvas or definition disappears", () => {
    const ref = refs.find(ref => ref.source === "nod_lifecycleEngine" && ref.field === "inner.canvas");
    expect(ref.removePath).toEqual(["canvases", "cnv_runtime", "nodes", "nod_lifecycleEngine", "inner"]);
  });

  it("removes a guard-only condition entirely but keeps conditions that say more", () => {
    const guardOnly = refs.find(ref => ref.field === "guard.guard" && ref.target === "grd_scaledPayout");
    expect(guardOnly.removePath).toEqual([
      "canvases",
      "cnv_crossBorderSend",
      "edges",
      "edg_payingOutPartiallyCompleted",
      "guard"
    ]);

    const doc = minimalDoc();
    doc.catalog.guards.grd_x = { name: "x" };
    doc.canvases.cnv_m = {
      kind: "machine",
      name: "M",
      nodes: { nod_a: { kind: "state", name: "a" } },
      edges: { edg_aa: { from: "nod_a", to: "nod_a", guard: { guard: "grd_x", text: "x holds" } } }
    };
    const withText = collectRefs(doc).find(ref => ref.field === "guard.guard");
    expect(withText.removePath).toEqual(["canvases", "cnv_m", "edges", "edg_aa", "guard", "guard"]);
  });

  it("finds interiors, definitions and the root", () => {
    expect(refs).toContainEqual(expect.objectContaining({ field: "root", target: "cnv_runtime" }));
    expect(refs).toContainEqual(
      expect.objectContaining({ source: "nod_lifecycleEngine", field: "inner.canvas", target: "cnv_lifecycle" })
    );
    expect(refs).toContainEqual(
      expect.objectContaining({ source: "nod_expiryClock", field: "inner.definition", target: "def_expiryClock" })
    );
  });

  it("skips primitive type names", () => {
    expect(refs.some(ref => ref.target === "datetime")).toBe(false);
    expect(refs).toContainEqual(
      expect.objectContaining({ source: "evt_opsFail", field: "payload", target: "typ_failure" })
    );
  });

  it("covers annotations and layout", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.nod_a = { kind: "service" };
    doc.annotations = {
      findings: { fnd_A1: { code: "A1", title: "t", severity: "low", targets: ["nod_a"] } },
      focus: ["nod_a"]
    };
    doc.layout = { canvases: { cnv_root: { nodes: { nod_a: { x: 0, y: 0 } } } } };
    const found = collectRefs(doc)
      .filter(ref => ref.target === "nod_a")
      .map(ref => `${ref.section}:${ref.field}`);
    expect(found).toEqual(["annotations:targets", "annotations:focus", "layout:nodes"]);
  });
});

describe("resolve / usagesOf / owners", () => {
  const doc = paymentsDoc();

  it("resolves IDs and returns null for unknown ones", () => {
    expect(resolve(doc, "nod_paused").value.name).toBe("paused");
    expect(resolve(doc, "nod_nope")).toBeNull();
  });

  it("lists usages", () => {
    expect(usagesOf(doc, "evt_opsApprove").map(ref => ref.source)).toEqual([
      "edg_docsInReviewClear",
      "edg_inReviewClear"
    ]);
  });

  it("finds the owner of a canvas", () => {
    expect(ownersOf(doc, "cnv_runtime")).toEqual([{ type: "root" }]);
    expect(ownerOf(doc, "cnv_lifecycle")).toEqual({ type: "inner", id: "nod_lifecycleEngine" });
    expect(ownerOf(doc, "cnv_expiryClock")).toEqual({ type: "definition", id: "def_expiryClock" });
  });
});

describe("hierarchy / pathTo", () => {
  const doc = paymentsDoc();

  it("builds the level tree through own interiors and definition instances", () => {
    const { root, definitions } = hierarchy(doc);
    expect(root.canvas).toBe("cnv_runtime");
    const lifecycle = root.children[0];
    expect(lifecycle).toMatchObject({ canvas: "cnv_lifecycle", via: "nod_lifecycleEngine", definition: null });
    // The example file is normalized, so maps are in ID order.
    expect(lifecycle.children.map(child => [child.canvas, child.via, child.definition])).toEqual([
      ["cnv_complianceHold", "nod_complianceHold", "def_complianceHold"],
      ["cnv_expiryClock", "nod_expiryClock", "def_expiryClock"],
      ["cnv_crossBorderSend", "nod_sendCrossBorder", "def_crossBorderSend"]
    ]);
    expect(definitions.map(tree => tree.definition)).toEqual([
      "def_complianceHold",
      "def_crossBorderSend",
      "def_expiryClock"
    ]);
  });

  it("stops at definition cycles", () => {
    const cyclic = minimalDoc();
    cyclic.canvases.cnv_root.nodes.nod_svc = { kind: "service", inner: { definition: "def_loop" } };
    cyclic.definitions.def_loop = { kind: "system", name: "Loop", canvas: "cnv_loop" };
    cyclic.canvases.cnv_loop = {
      kind: "system",
      name: "Loop",
      nodes: { nod_again: { kind: "service", inner: { definition: "def_loop" } } },
      edges: {}
    };
    const loop = hierarchy(cyclic).root.children[0];
    expect(loop.cycle).toBe(false);
    expect(loop.children[0]).toMatchObject({ canvas: "cnv_loop", cycle: true, children: [] });
  });

  it("returns the breadcrumb to an element", () => {
    expect(pathTo(doc, "nod_paused")).toEqual([
      { canvas: "cnv_runtime", via: null, definition: null },
      { canvas: "cnv_lifecycle", via: "nod_lifecycleEngine", definition: null },
      { canvas: "cnv_expiryClock", via: "nod_expiryClock", definition: "def_expiryClock" }
    ]);
    expect(pathTo(doc, "cnv_runtime")).toEqual([{ canvas: "cnv_runtime", via: null, definition: null }]);
    expect(pathTo(doc, "evt_opsApprove")).toBeNull();
  });
});

describe("hierarchy: unattached levels", () => {
  it("lists levels that no tree reaches, with the levels inside them, and finds the way to them", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_lost = {
      kind: "system",
      name: "Lost",
      nodes: { nod_box: { kind: "service", name: "Box", inner: { canvas: "cnv_lostInside" } } },
      edges: {}
    };
    doc.canvases.cnv_lostInside = { kind: "flow", name: "Inside", nodes: {}, edges: {} };
    const { unattached } = hierarchy(doc);
    expect(unattached.map(tree => tree.canvas)).toEqual(["cnv_lost"]);
    expect(unattached[0].children.map(child => [child.canvas, child.via])).toEqual([["cnv_lostInside", "nod_box"]]);
    expect(pathTo(doc, "nod_box")).toEqual([{ canvas: "cnv_lost", via: null, definition: null }]);
    expect(hierarchy(minimalDoc()).unattached).toEqual([]);
  });
});

describe("robustness", () => {
  it("ignores x- keys on shaped containers", () => {
    const doc = minimalDoc();
    doc.catalog["x-imported"] = { evt_fake: { name: "fake" } };
    doc.annotations = { "x-engine": { runs: 3 } };
    doc.layout = { "x-zoom": 2 };
    expect(buildIndex(doc).has("evt_fake")).toBe(false);
    expect(collectRefs(doc).map(ref => ref.target)).toEqual(["cnv_root"]);
  });

  it("survives a dangling root and inner.canvas cycles", () => {
    const dangling = minimalDoc();
    dangling.root = "cnv_missing";
    expect(hierarchy(dangling).root).toEqual({
      canvas: "cnv_missing",
      via: null,
      definition: null,
      cycle: false,
      children: []
    });
    // The canvas the root should have been is reached by no tree: it is an unattached level, still found.
    expect(hierarchy(dangling).unattached.map(tree => tree.canvas)).toEqual(["cnv_root"]);
    expect(pathTo(dangling, "cnv_root")).toEqual([{ canvas: "cnv_root", via: null, definition: null }]);

    const cyclic = minimalDoc();
    cyclic.canvases.cnv_root.nodes.nod_self = { kind: "service", inner: { canvas: "cnv_root" } };
    expect(hierarchy(cyclic).root.children).toEqual([
      { canvas: "cnv_root", via: "nod_self", definition: null, cycle: true, children: [] }
    ]);
    expect(pathTo(cyclic, "nod_self")).toEqual([{ canvas: "cnv_root", via: null, definition: null }]);
  });

  it("does not throw on dangling references", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.nod_svc = { kind: "service", inner: { canvas: "cnv_missing" } };
    doc.canvases.cnv_root.nodes.nod_lib = { kind: "service", inner: { definition: "def_missing" } };
    doc.canvases.cnv_root.edges.edg_x = { from: "nod_svc", to: "nod_gone" };
    expect(hierarchy(doc).root.children).toEqual([]);
    expect(pathTo(doc, "edg_x")).toEqual([{ canvas: "cnv_root", via: null, definition: null }]);
    expect(usagesOf(doc, "nod_gone")).toHaveLength(1);
    expect(ownerOf(doc, "cnv_missing")).toEqual({ type: "inner", id: "nod_svc" });
  });
});
