import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

const finding = (code, targets, extra = {}) => ({
  code,
  title: `Finding ${code}`,
  severity: "high",
  targets,
  ...extra
});

describe("findings", () => {
  it("upserts by ID and checks targets", () => {
    const result = applyBatch(paymentsDoc(), [cmd("finding.upsert", { finding: finding("AS2", ["nod_paused"]) })]);
    expect(result.created).toEqual(["fnd_AS2"]);
    const doc = run(result.doc, cmd("finding.upsert", { id: "fnd_AS2", finding: finding("AS2", ["nod_running"]) }));
    expect(doc.annotations.findings.fnd_AS2.targets).toEqual(["nod_running"]);
    expect(failure(doc, cmd("finding.upsert", { finding: finding("X", ["nod_none"]) })).code).toBe("NOT_FOUND");
  });

  it("replaces an engine's findings in one step with stable IDs, leaving other sources alone", () => {
    let doc = run(
      paymentsDoc(),
      cmd("finding.upsert", { finding: finding("H1", ["nod_paused"], { source: "human" }) }),
      cmd("findings.replace", {
        source: "lint",
        findings: [finding("L1", ["nod_paused"]), finding("L2", ["nod_running"])]
      })
    );
    doc = run(doc, cmd("findings.replace", { source: "lint", findings: [finding("L1", ["nod_running"])] }));
    expect(Object.keys(doc.annotations.findings).sort()).toEqual(["fnd_H1", "fnd_L1"]);
    expect(doc.annotations.findings.fnd_L1).toEqual(finding("L1", ["nod_running"], { source: "lint" }));
    doc = run(doc, cmd("findings.replace", { source: "lint", findings: [] }));
    expect(Object.keys(doc.annotations.findings)).toEqual(["fnd_H1"]);
  });

  it("gives repeated codes distinct IDs in list order", () => {
    const doc = run(
      paymentsDoc(),
      cmd("findings.replace", {
        source: "lint",
        findings: [finding("AS2", ["nod_paused"]), finding("AS2", ["nod_running"])]
      })
    );
    expect(Object.keys(doc.annotations.findings)).toEqual(["fnd_AS2", "fnd_AS22"]);
    expect(doc.annotations.findings.fnd_AS22.targets).toEqual(["nod_running"]);
  });

  it("removes a finding", () => {
    let doc = run(paymentsDoc(), cmd("finding.upsert", { finding: finding("A", ["nod_paused"]) }));
    doc = run(doc, cmd("finding.remove", { id: "fnd_A" }));
    // The emptied collection goes; the example's own annotations stay.
    expect(doc.annotations).toEqual(paymentsDoc().annotations);
  });
});

describe("notes, focus and lanes", () => {
  it("keeps note targets on the note's canvas", () => {
    const doc = paymentsDoc();
    const result = applyBatch(doc, [
      cmd("note.add", { note: { text: "no owner", canvas: "cnv_expiryClock", target: "nod_paused", tone: "defect" } })
    ]);
    expect(result.created).toEqual(["nte_note"]);
    expect(
      failure(doc, cmd("note.add", { note: { text: "x", canvas: "cnv_runtime", target: "nod_paused" } })).code
    ).toBe("NOT_ALLOWED");
    const updated = run(result.doc, cmd("note.update", { id: "nte_note", set: { text: "e-mail only" } }));
    expect(updated.annotations.notes.nte_note.text).toBe("e-mail only");
    expect(run(updated, cmd("note.remove", { id: "nte_note" })).annotations).toEqual(paymentsDoc().annotations);
  });

  it("sets and clears focus", () => {
    let doc = run(paymentsDoc(), cmd("focus.set", { ids: ["nod_paused", "edg_runningPaused"] }));
    expect(doc.annotations.focus).toEqual(["nod_paused", "edg_runningPaused"]);
    expect(failure(doc, cmd("focus.set", { ids: ["evt_opsFail"] })).code).toBe("WRONG_KIND");
    expect(failure(doc, cmd("focus.set", { ids: ["nod_paused", "nod_paused"] })).code).toBe("INVALID_ARGS");
    doc = run(doc, cmd("focus.set", { ids: [] }));
    expect(doc.annotations).toEqual(paymentsDoc().annotations);
  });

  it("adds lanes whose nodes are on the lane's canvas", () => {
    const doc = run(
      paymentsDoc(),
      cmd("lane.add", { lane: { canvas: "cnv_expiryClock", label: "FORWARD RAIL", nodes: ["nod_running"] } })
    );
    expect(doc.annotations.lanes.lne_forwardRail.nodes).toEqual(["nod_running"]);
    expect(
      failure(doc, cmd("lane.add", { lane: { canvas: "cnv_runtime", label: "X", nodes: ["nod_running"] } })).code
    ).toBe("NOT_ALLOWED");
    expect(run(doc, cmd("lane.remove", { id: "lne_forwardRail" })).annotations).toEqual(paymentsDoc().annotations);
  });
});

describe("layout", () => {
  it("places nodes with rounded coordinates; display needs an interior", () => {
    let doc = run(
      paymentsDoc(),
      cmd("layout.node.set", {
        canvas: "cnv_runtime",
        id: "nod_lifecycleEngine",
        x: 1.5,
        y: 2.4,
        w: 140,
        h: 56,
        display: "frame"
      })
    );
    expect(doc.layout.canvases.cnv_runtime.nodes.nod_lifecycleEngine).toEqual({
      x: 2,
      y: 2,
      w: 140,
      h: 56,
      display: "frame"
    });
    expect(
      failure(doc, cmd("layout.node.set", { canvas: "cnv_runtime", id: "nod_clients", x: 0, y: 0, display: "card" }))
        .code
    ).toBe("NOT_ALLOWED");
    expect(failure(doc, cmd("layout.node.set", { canvas: "cnv_lifecycle", id: "nod_clients", x: 0, y: 0 })).code).toBe(
      "NOT_ALLOWED"
    );
    expect(
      failure(doc, cmd("layout.node.set", { canvas: "cnv_runtime", id: "nod_clients", x: 0, y: 0, w: 0.2 })).code
    ).toBe("SCHEMA");
    doc = run(doc, cmd("layout.canvas.clear", { canvas: "cnv_runtime" }));
    expect(doc.layout).toBeUndefined();
  });

  it("stores and clears edge routes and note positions", () => {
    let doc = run(
      paymentsDoc(),
      cmd("layout.edge.set", {
        canvas: "cnv_expiryClock",
        id: "edg_runningPaused",
        points: [
          [0.4, 0],
          [10, 10.6]
        ],
        labelAt: [5, 5]
      }),
      cmd("note.add", { note: { text: "n", canvas: "cnv_expiryClock" } }),
      cmd("layout.note.set", { canvas: "cnv_expiryClock", id: "nte_note", x: 3, y: 4 })
    );
    expect(doc.layout.canvases.cnv_expiryClock).toEqual({
      edges: {
        edg_runningPaused: {
          points: [
            [0, 0],
            [10, 11]
          ],
          labelAt: [5, 5]
        }
      },
      notes: { nte_note: { x: 3, y: 4 } }
    });
    doc = run(doc, cmd("layout.edge.set", { canvas: "cnv_expiryClock", id: "edg_runningPaused" }));
    expect(doc.layout.canvases.cnv_expiryClock.edges).toBeUndefined();
  });

  it("sets legend labels and validates style keys", () => {
    const doc = run(minimalDoc(), cmd("legend.labels.set", { labels: { "state.waiting": "Waiting" } }));
    expect(doc.layout).toEqual({ legend: { labels: { "state.waiting": "Waiting" } } });
    expect(run(doc, cmd("legend.labels.set", { labels: {} })).layout).toBeUndefined();
    expect(failure(doc, cmd("legend.labels.set", { labels: { Waiting: "x" } })).code).toBe("SCHEMA");
  });

  it("moves nodes of a machine canvas too", () => {
    const doc = run(machineDoc(minimalDoc()), cmd("layout.node.set", { canvas: "cnv_m", id: "nod_a", x: 1, y: 1 }));
    expect(doc.layout.canvases.cnv_m.nodes.nod_a).toEqual({ x: 1, y: 1 });
  });
});
