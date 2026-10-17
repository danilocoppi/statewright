// Highlights through the commands and the rules (highlights spec §5).
import { describe, expect, it } from "vitest";
import { check } from "../../src/rules/index.js";
import { minimalDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

const critical = cmd("catalog.add", {
  collection: "highlights",
  id: "hlt_critical",
  item: { name: "Critical", colour: "red", border: "bold", fill: "tint", chip: true }
});
const marked = () =>
  run(
    machineDoc(minimalDoc()),
    critical,
    cmd("node.update", { id: "nod_a", set: { highlights: ["hlt_critical"] } }),
    cmd("edge.update", { id: "edg_ab", set: { highlights: ["hlt_critical"] } }),
    cmd("note.add", { id: "nte_a", note: { text: "Watch", canvas: "cnv_m", highlights: ["hlt_critical"] } })
  );
const codes = (doc, target) =>
  check(doc)
    .filter(problem => problem.target === target)
    .map(problem => problem.code);

describe("highlights through commands", () => {
  it("adds a highlight to the catalog and applies it to a box, an arrow and a note", () => {
    const doc = marked();
    expect(doc.annotations.notes.nte_a.highlights).toEqual(["hlt_critical"]);
    expect(doc.catalog.highlights.hlt_critical.name).toBe("Critical");
    expect(doc.canvases.cnv_m.nodes.nod_a.highlights).toEqual(["hlt_critical"]);
    expect(doc.canvases.cnv_m.edges.edg_ab.highlights).toEqual(["hlt_critical"]);
  });

  it("refuses to remove a highlight in use, and with cascade takes it off every element", () => {
    expect(failure(marked(), cmd("catalog.remove", { id: "hlt_critical" })).code).toBe("IN_USE");
    const doc = run(marked(), cmd("catalog.remove", { id: "hlt_critical", cascade: true }));
    expect(doc.catalog.highlights).toEqual({});
    expect(doc.canvases.cnv_m.nodes.nod_a.highlights ?? []).toEqual([]);
    expect(doc.canvases.cnv_m.edges.edg_ab.highlights ?? []).toEqual([]);
    expect(doc.annotations.notes.nte_a.highlights ?? []).toEqual([]);
  });

  it("reports a highlight that is not in the catalog as a dangling reference", () => {
    const doc = structuredClone(marked());
    delete doc.catalog.highlights.hlt_critical;
    expect(codes(doc, "nod_a")).toContain("ref.dangling");
    expect(codes(doc, "nte_a")).toContain("ref.dangling");
  });

  it("does not report a highlight nobody uses: a project may keep a set ready", () => {
    const doc = run(machineDoc(minimalDoc()), critical);
    expect(codes(doc, "hlt_critical")).toEqual([]);
  });
});
