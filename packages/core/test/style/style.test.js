import { describe, expect, it } from "vitest";
import { cardSummary, createStyle, edgeLabel, edgeStyle, legendFor, nodeStyle } from "../../src/style/index.js";
import { paymentsDoc } from "../helpers.js";
import { cleanDoc } from "../rules/fixtures.js";

/** cleanDoc with a node of cnv_m changed. */
function withNode(id, changes) {
  const doc = cleanDoc();
  Object.assign(doc.canvases.cnv_m.nodes[id], changes);
  return doc;
}

describe("nodeStyle", () => {
  it("follows the precedence provenance › focus › kind › outcome › category › plain (spec §15)", () => {
    expect(nodeStyle(cleanDoc(), "nod_idle").key).toBe("state.plain");
    expect(nodeStyle(withNode("nod_idle", { category: "waiting" }), "nod_idle").key).toBe("state.waiting");
    expect(nodeStyle(withNode("nod_idle", { category: "waiting", outcome: "failure" }), "nod_idle").key).toBe(
      "outcome.failure"
    );
    const focused = withNode("nod_idle", { outcome: "failure" });
    focused.annotations = { focus: ["nod_idle"] };
    expect(nodeStyle(focused, "nod_idle").key).toBe("state.focus");
    expect(nodeStyle(withNode("nod_idle", { provenance: "legacy", outcome: "failure" }), "nod_idle").key).toBe(
      "prov.legacy"
    );
    expect(nodeStyle(withNode("nod_idle", { provenance: "built" }), "nod_idle").key).toBe("state.plain");
    expect(nodeStyle(cleanDoc(), "nod_engine").key).toBe("node.plain");
    expect(nodeStyle(cleanDoc(), "nod_tell").key).toBe("step.plain");
  });

  it("derives chips in order: provenance, kind, FINAL, category, then tags in capitals", () => {
    const doc = withNode("nod_done", {
      provenance: "proposed",
      category: "hold",
      tags: [{ text: "no exit", tone: "danger" }]
    });
    expect(nodeStyle(doc, "nod_done").chips).toEqual([
      { text: "NEW", color: "#0A66C2" },
      { text: "FINAL", color: "#0A66C2" },
      { text: "HOLD", color: "#B45309" },
      { text: "NO EXIT", color: "#B42318", fill: "#FEE4E2" }
    ]);
    doc.canvases.cnv_root.nodes.nod_db = { kind: "store", name: "DB" };
    expect(nodeStyle(doc, "nod_db")).toMatchObject({ key: "node.store", chips: [{ text: "STORE", color: "#5B6170" }] });
  });

  it("shows status pills, finding badges, low confidence and the interior", () => {
    const doc = withNode("nod_busy", { statuses: ["sts_live"], confidence: "low" });
    doc.catalog.statuses.sts_live = { name: "processing", tone: "info" };
    doc.annotations = {
      findings: {
        fnd_A2: { code: "A2", title: "t", severity: "low", targets: ["nod_busy"] },
        fnd_A1: { code: "A1", title: "t", severity: "low", targets: ["nod_busy", "edg_idleBusy"] }
      }
    };
    expect(nodeStyle(doc, "nod_busy")).toMatchObject({
      statuses: [{ text: "processing", tone: "info" }],
      badges: ["A1", "A2"],
      opacity: 0.6,
      interior: null
    });
    expect(nodeStyle(doc, "nod_engine").interior).toBe("cnv_m");
    expect(edgeStyle(doc, "edg_idleBusy").badges).toEqual(["A1"]);
  });

  it("gives pseudo-nodes their shapes", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_pick = { kind: "choice" };
    doc.canvases.cnv_m.nodes.nod_post = { kind: "entry", name: "POST /m" };
    doc.catalog.parties.pty_ops = { kind: "operator", name: "Ops" };
    doc.canvases.cnv_m.nodes.nod_desk = { kind: "entry", name: "Desk", by: "pty_ops" };
    const shape = id => nodeStyle(doc, id).shape;
    expect([shape("nod_init"), shape("nod_pick"), shape("nod_post"), shape("nod_desk"), shape("nod_busy")]).toEqual([
      "dot",
      "diamond",
      "dot",
      "actor",
      "box"
    ]);
    expect(nodeStyle(doc, "edg_idleBusy")).toBeNull();
  });
});

describe("edgeStyle", () => {
  const styled = changes => {
    const doc = cleanDoc();
    doc.catalog.parties.pty_ops = { kind: "operator", name: "Ops" };
    doc.catalog.timers.tmr_ttl = { name: "ttl", duration: "PT1H" };
    Object.assign(doc.canvases.cnv_m.edges.edg_idleBusy, changes);
    return edgeStyle(doc, "edg_idleBusy").key;
  };

  it("follows the precedence provenance › failure › ops › timer › happy › default (spec §15)", () => {
    expect(styled({})).toBe("edge.default");
    expect(styled({ intent: "happy" })).toBe("edge.happy");
    expect(styled({ on: [], after: "tmr_ttl", intent: "happy" })).toBe("edge.timer");
    expect(styled({ after: "tmr_ttl" })).toBe("edge.default");
    expect(styled({ by: "pty_ops", intent: "happy" })).toBe("edge.ops");
    expect(styled({ by: "pty_ops", intent: "failure" })).toBe("edge.failure");
    expect(styled({ intent: "failure", provenance: "implied" })).toBe("edge.implied");
    expect(styled({ provenance: "fix" })).toBe("edge.proposed");
    expect(styled({ provenance: "defect" })).toBe("edge.defect");
  });

  it("draws links and failing flow steps their own way", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_f.edges.edg_tellEnd.kind = "error";
    expect(edgeStyle(doc, "edg_tellEnd")).toMatchObject({ key: "edge.failure", stroke: "#B42318", dash: "5,4" });
    doc.canvases.cnv_m.nodes.nod_out = { kind: "ref", target: "cnv_root" };
    doc.canvases.cnv_m.edges.edg_busyOut = { kind: "link", from: "nod_busy", to: "nod_out" };
    expect(edgeStyle(doc, "edg_busyOut").key).toBe("edge.link");
  });
});

describe("edgeLabel", () => {
  it("joins triggers with | and adds the guard in brackets (spec §15)", () => {
    const doc = cleanDoc();
    doc.catalog.guards.grd_ready = { name: "ready", description: "d" };
    doc.catalog.endpoints.ept_archive = { name: "Archive", method: "PUT", path: "/archive" };
    doc.catalog.timers.tmr_ttl = { name: "ttl", duration: "PT1H" };
    Object.assign(doc.canvases.cnv_m.edges.edg_idleBusy, {
      onMatch: ["leg.*"],
      after: "tmr_ttl",
      via: "ept_archive",
      guard: { guard: "grd_ready" }
    });
    expect(edgeLabel(doc, "edg_idleBusy")).toBe("go | leg.* | ttl | PUT /archive [ready]");
    doc.canvases.cnv_m.edges.edg_idleBusy.label = "start";
    expect(edgeLabel(doc, "edg_idleBusy")).toBe("start");
  });

  it("names completed regions and labels the edge out of an unperformed entry with its name", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.regions = { rgn_main: { name: "payout" } };
    for (const node of Object.values(doc.canvases.cnv_m.nodes)) node.region = "rgn_main";
    doc.canvases.cnv_m.edges.edg_busyDone = {
      from: "nod_busy",
      to: "nod_done",
      done: "rgn_main",
      guard: { text: "≤ 10 d" }
    };
    expect(edgeLabel(doc, "edg_busyDone")).toBe("payout ✓ [≤ 10 d]");
    doc.canvases.cnv_m.nodes.nod_init = { kind: "entry", name: "POST /m", region: "rgn_main" };
    expect(edgeLabel(doc, "edg_initIdle")).toBe("POST /m");
  });

  it("labels flow branches and system interactions", () => {
    const doc = cleanDoc();
    Object.assign(doc.canvases.cnv_f.edges.edg_tellEnd, { kind: "case", case: "eur" });
    expect(edgeLabel(doc, "edg_tellEnd")).toBe("eur");
    expect(edgeLabel(doc, "edg_startTell")).toBe("");
    const payments = paymentsDoc();
    expect(edgeLabel(payments, "edg_providersProviderInbox")).toBe("Provider events");
    expect(edgeLabel(payments, "edg_clientsCommandApi")).toBe("command");
  });
});

describe("legendFor", () => {
  it("lists only the styles used, in palette order, with legend label overrides", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_idleBusy.intent = "happy";
    doc.layout = { legend: { labels: { "state.plain": "Status" } } };
    doc.annotations = { findings: { fnd_A1: { code: "A1", title: "t", severity: "low", targets: ["nod_busy"] } } };
    const legend = legendFor(doc, "cnv_m");
    expect(legend.nodes.map(item => [item.key, item.label])).toEqual([
      ["state.plain", "Status"],
      ["outcome.success", "Outcome · success"]
    ]);
    expect(legend.edges.map(item => item.key)).toEqual(["edge.default", "edge.happy"]);
    expect(legend.chips).toEqual([{ text: "FINAL", label: "Terminal · no exits" }]);
    expect(legend.findings).toBe(true);
  });

  it("includes the styles of interiors drawn as frames", () => {
    const doc = cleanDoc();
    doc.layout = { canvases: { cnv_root: { nodes: { nod_engine: { x: 0, y: 0, display: "frame" } } } } };
    expect(legendFor(doc, "cnv_root").nodes.map(item => item.key)).toEqual(["state.plain", "outcome.success", "frame"]);
  });
});

describe("cardSummary", () => {
  it("summarizes an interior in reading order", () => {
    expect(cardSummary(cleanDoc(), "nod_engine")).toBe("idle → busy → done");
    expect(cardSummary(paymentsDoc(), "nod_expiryClock")).toBe("running → elapsed → paused → stopped");
    expect(cardSummary(cleanDoc(), "nod_idle")).toBe("");
  });

  it("stops at four names", () => {
    const doc = cleanDoc();
    const machine = doc.canvases.cnv_m;
    for (const name of ["e", "f", "g"]) {
      machine.nodes[`nod_${name}`] = { kind: "state", name };
      machine.edges[`edg_${name}`] = { from: "nod_done", to: `nod_${name}`, on: ["evt_go"] };
    }
    expect(createStyle(doc).cardSummary("nod_engine")).toBe("idle → busy → done → e …");
  });
});
