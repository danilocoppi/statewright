import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { parse } from "../../src/serialize/parse.js";
import { stringify } from "../../src/serialize/stringify.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

describe("definition.create / definition.update", () => {
  it("creates a definition with an empty body canvas", () => {
    const result = applyBatch(minimalDoc(), [cmd("definition.create", { name: "Leg machine", kind: "machine" })]);
    expect(result.created).toEqual(["def_legMachine", "cnv_legMachine"]);
    expect(result.doc.definitions.def_legMachine).toEqual({
      kind: "machine",
      name: "Leg machine",
      canvas: "cnv_legMachine"
    });
    expect(result.doc.canvases.cnv_legMachine).toEqual({ kind: "machine", name: "Leg machine", nodes: {}, edges: {} });
  });

  it("cannot change kind or body", () => {
    const doc = run(minimalDoc(), cmd("definition.create", { name: "D", kind: "flow" }));
    expect(failure(doc, cmd("definition.update", { id: "def_d", set: { kind: "machine" } })).code).toBe("NOT_ALLOWED");
    expect(run(doc, cmd("definition.update", { id: "def_d", set: { name: "Renamed" } })).definitions.def_d.name).toBe(
      "Renamed"
    );
  });
});

describe("extract / instantiate", () => {
  it("turns an own interior into a definition and reuses it elsewhere", () => {
    let doc = run(
      machineDoc(minimalDoc()),
      cmd("canvas.create", { kind: "machine", name: "Sub", owner: "nod_a", id: "cnv_sub" }),
      cmd("definition.extract", { owner: "nod_a", name: "Sub machine" }),
      cmd("definition.instantiate", { owner: "nod_b", definition: "def_subMachine" })
    );
    expect(doc.definitions.def_subMachine.canvas).toBe("cnv_sub");
    expect(doc.canvases.cnv_m.nodes.nod_a.inner).toEqual({ definition: "def_subMachine" });
    expect(doc.canvases.cnv_m.nodes.nod_b.inner).toEqual({ definition: "def_subMachine" });
    expect(failure(doc, cmd("definition.extract", { owner: "nod_b", name: "Again" })).code).toBe("NOT_ALLOWED");
  });

  it("refuses definitions that contain themselves, directly or through another definition", () => {
    const doc = run(
      minimalDoc(),
      cmd("definition.create", { name: "Loop", kind: "machine" }),
      cmd("node.add", { canvas: "cnv_loop", node: { kind: "state", name: "s" }, id: "nod_s" })
    );
    expect(failure(doc, cmd("definition.instantiate", { owner: "nod_s", definition: "def_loop" })).code).toBe(
      "NOT_ALLOWED"
    );
    const two = run(
      doc,
      cmd("definition.create", { name: "Other", kind: "machine" }),
      cmd("node.add", { canvas: "cnv_other", node: { kind: "state", name: "t" }, id: "nod_t" }),
      cmd("definition.instantiate", { owner: "nod_t", definition: "def_loop" })
    );
    expect(failure(two, cmd("definition.instantiate", { owner: "nod_s", definition: "def_other" })).code).toBe(
      "NOT_ALLOWED"
    );
  });

  it("checks the interior kind of the owner", () => {
    const doc = run(machineDoc(minimalDoc()), cmd("definition.create", { name: "F", kind: "flow" }));
    expect(failure(doc, cmd("definition.instantiate", { owner: "nod_a", definition: "def_f" })).code).toBe(
      "WRONG_KIND"
    );
  });
});

describe("definition.detach", () => {
  it("copies the body under new IDs and rewires references inside the copy", () => {
    const base = paymentsDoc();
    base.layout = { canvases: { cnv_expiryClock: { nodes: { nod_running: { x: 5, y: 6 } } } } };
    const result = applyBatch(base, [cmd("definition.detach", { owner: "nod_expiryClock" })]);
    const doc = result.doc;
    const inner = doc.canvases.cnv_lifecycle.nodes.nod_expiryClock.inner;
    expect(inner).toEqual({ canvas: "cnv_expiryClock2" });
    const copy = doc.canvases.cnv_expiryClock2;
    expect(Object.keys(copy.nodes).sort()).toEqual([
      "nod_elapsed2",
      "nod_expiryClockInitial2",
      "nod_paused2",
      "nod_running2",
      "nod_stopped2"
    ]);
    expect(copy.edges.edg_runningPaused2).toEqual({
      from: "nod_running2",
      to: "nod_paused2",
      on: ["evt_verifyStarted"]
    });
    expect(doc.layout.canvases.cnv_expiryClock2.nodes.nod_running2).toEqual({ x: 5, y: 6 });
    expect(doc.canvases.cnv_expiryClock).toEqual(base.canvases.cnv_expiryClock);
    expect(result.created[0]).toBe("cnv_expiryClock2");
    expect(parse(stringify(doc)).ok).toBe(true);
  });

  it("only detaches instances", () => {
    expect(failure(paymentsDoc(), cmd("definition.detach", { owner: "nod_lifecycleEngine" })).code).toBe("NOT_ALLOWED");
  });
});

describe("definition.remove", () => {
  it("is blocked by instances unless cascade, which leaves them without interior", () => {
    const doc = paymentsDoc();
    const error = failure(doc, cmd("definition.remove", { id: "def_expiryClock" }));
    expect(error.code).toBe("IN_USE");
    const next = run(doc, cmd("definition.remove", { id: "def_expiryClock", cascade: true }));
    expect(next.definitions.def_expiryClock).toBeUndefined();
    expect(next.canvases.cnv_expiryClock).toBeUndefined();
    expect(next.canvases.cnv_lifecycle.nodes.nod_expiryClock.inner).toBeUndefined();
  });
});
