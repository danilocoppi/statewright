import { describe, expect, it } from "vitest";
import { applyBatch, applyPatches } from "../../src/commands/index.js";
import { parse } from "../../src/serialize/parse.js";
import { stringify } from "../../src/serialize/stringify.js";
import { paymentsDoc } from "../helpers.js";
import { cmd } from "./helpers.js";

/** Batches covering every command group, applied to the payments example. */
const SCRIPTS = {
  "catalog and project": [
    cmd("project.update", { set: { description: "Edited" } }),
    cmd("catalog.add", { collection: "events", item: { name: "leg.started", source: "internal" } }),
    cmd("catalog.update", { id: "evt_legHalted", set: { payload: null } }),
    cmd("catalog.remove", { id: "act_refreshQuote", cascade: true })
  ],
  "canvases, nodes and edges": [
    cmd("canvas.create", { kind: "flow", name: "Refresh", owner: "act_extendExpiry" }),
    cmd("node.add", { canvas: "cnv_refresh", node: { kind: "start" }, at: { x: 0, y: 0 } }),
    cmd("node.add", { canvas: "cnv_refresh", node: { kind: "end" } }),
    cmd("edge.add", { canvas: "cnv_refresh", edge: { from: "nod_start", to: "nod_end" } }),
    cmd("node.update", { id: "nod_paused", set: { summary: "frozen" } }),
    cmd("edge.update", { id: "edg_runningPaused", set: { intent: "happy" } }),
    cmd("node.remove", { id: "nod_onHold", cascade: true })
  ],
  regions: [
    cmd("region.add", { canvas: "cnv_complianceHold", name: "Gate" }),
    cmd("region.add", { canvas: "cnv_complianceHold", name: "Audit" }),
    cmd("region.remove", { id: "rgn_gate", moveNodesTo: "rgn_audit" })
  ],
  definitions: [
    cmd("definition.detach", { owner: "nod_complianceHold" }),
    cmd("definition.create", { name: "Leg", kind: "machine" }),
    cmd("definition.remove", { id: "def_crossBorderSend", cascade: true })
  ],
  "annotations and layout": [
    cmd("findings.replace", {
      source: "lint",
      findings: [{ code: "L1", title: "t", severity: "low", targets: ["nod_paused"] }]
    }),
    cmd("note.add", { note: { text: "n", canvas: "cnv_expiryClock", target: "nod_paused" } }),
    cmd("focus.set", { ids: ["nod_running"] }),
    cmd("lane.add", { lane: { canvas: "cnv_expiryClock", label: "Rail", nodes: ["nod_running", "nod_paused"] } }),
    cmd("layout.node.set", { canvas: "cnv_expiryClock", id: "nod_paused", x: 10, y: 20 }),
    cmd("layout.note.set", { canvas: "cnv_expiryClock", id: "nte_note", x: 1, y: 2 }),
    cmd("legend.labels.set", { labels: { "edge.happy": "Forward path" } }),
    cmd("node.remove", { id: "nod_paused", cascade: true })
  ]
};

describe.each(Object.entries(SCRIPTS))("%s", (_name, script) => {
  it("produces a valid document whose inverse patches restore the original byte for byte", () => {
    const original = paymentsDoc();
    const before = stringify(original);
    const result = applyBatch(original, script);
    expect(parse(stringify(result.doc)).errors).toEqual([]);
    expect(stringify(applyPatches(result.doc, result.inversePatches))).toBe(before);
    expect(stringify(applyPatches(original, result.patches))).toBe(stringify(result.doc));
  });

  it("gives the same result one command at a time, and undoes step by step", () => {
    const original = paymentsDoc();
    const history = [];
    let doc = original;
    for (const command of script) {
      const result = applyBatch(doc, [command]);
      history.push(result.inversePatches);
      doc = result.doc;
    }
    expect(stringify(doc)).toBe(stringify(applyBatch(paymentsDoc(), script).doc));
    for (const inverse of history.reverse()) doc = applyPatches(doc, inverse);
    expect(stringify(doc)).toBe(stringify(original));
  });
});
