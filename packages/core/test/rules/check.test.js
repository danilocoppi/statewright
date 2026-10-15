import { describe, expect, it } from "vitest";
import { check, listRules } from "../../src/rules/index.js";
import { cleanDoc } from "./fixtures.js";

/** The same document with every ID map's keys in reverse order. */
function reversed(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const keys = Object.keys(value);
  const ids = keys.length > 0 && keys.every(key => /^[a-z]{3}_/.test(key));
  return Object.fromEntries((ids ? keys.reverse() : keys).map(key => [key, reversed(value[key])]));
}

describe("check", () => {
  it("finds nothing in a clean document", () => {
    expect(check(cleanDoc())).toEqual([]);
  });

  it("returns Problems ordered by rule, then target", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_lost = { kind: "machine", name: "Lost", transitions: "unknown", nodes: {}, edges: {} };
    doc.canvases.cnv_m.edges.edg_idleBusy.on = ["evt_go", "evt_missing"];
    doc.canvases.cnv_m.edges.edg_busyDone.on = ["evt_stop", "evt_gone"];
    expect(check(doc).map(problem => [problem.code, problem.target])).toEqual([
      ["ref.dangling", "edg_busyDone"],
      ["ref.dangling", "edg_idleBusy"],
      ["canvas.orphan", "cnv_lost"]
    ]);
  });

  it("gives Problems in the shape of spec §22", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_idleBusy.on = ["evt_go", "evt_missing"];
    const [problem] = check(doc);
    expect(Object.keys(problem)).toEqual(["code", "severity", "target", "canvas", "message", "data"]);
    expect(problem).toMatchObject({ code: "ref.dangling", severity: "error", target: "edg_idleBusy", canvas: "cnv_m" });
  });

  it("survives documents whose references are broken everywhere", () => {
    const doc = cleanDoc();
    doc.root = "cnv_gone";
    doc.definitions.def_ghost = { kind: "machine", name: "Ghost", canvas: "cnv_ghost" };
    const machine = doc.canvases.cnv_m;
    machine.nodes.nod_busy.inner = { definition: "def_ghost" };
    machine.nodes.nod_idle.region = "rgn_gone";
    machine.nodes.nod_any = { kind: "any", except: ["nod_gone"] };
    machine.edges.edg_ghost = { from: "nod_gone", to: "nod_alsoGone", on: ["evt_gone"] };
    doc.canvases.cnv_f.edges.edg_away = { from: "nod_tell", to: "nod_gone" };
    doc.annotations = { focus: ["nod_gone"], notes: { nte_x: { text: "n", canvas: "cnv_gone", target: "nod_gone" } } };
    doc.layout = { canvases: { cnv_gone: { nodes: { nod_gone: { x: 0, y: 0 } } } } };
    const found = check(doc);
    expect(found.filter(problem => problem.code === "ref.dangling").length).toBeGreaterThanOrEqual(10);
  });

  it("does not depend on the key order of the input", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_lost = { kind: "flow", name: "Lost", nodes: {}, edges: {} };
    doc.canvases.cnv_m.edges.edg_idleBusy.on = ["evt_missing"];
    expect(check(doc).length).toBeGreaterThan(1);
    expect(check(reversed(doc))).toEqual(check(doc));
  });
});

describe("listRules", () => {
  it("describes every rule with a code, a severity and one line of text", () => {
    for (const rule of listRules()) {
      expect(rule.code).toMatch(/^[a-z]+\.[A-Za-z]+$/);
      expect(["error", "warning", "incomplete", "by level"]).toContain(rule.severity);
      expect(rule.description.length, rule.code).toBeGreaterThan(10);
    }
  });
});
