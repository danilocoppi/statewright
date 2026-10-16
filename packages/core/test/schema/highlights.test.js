// Highlights (highlights spec §3, §8): named looks in the catalog, applied to boxes and arrows, in format 1.4.
import { describe, expect, it } from "vitest";
import { FORMAT_VERSION } from "../../src/constants.js";
import { migrate } from "../../src/migrate.js";
import { documentSchema } from "../../src/schema/document.js";
import { minimalDoc } from "../helpers.js";
import { machineDoc } from "../commands/helpers.js";

const withHighlight = (item, extra = doc => doc) => {
  const doc = machineDoc(minimalDoc());
  doc.catalog.highlights.hlt_critical = item;
  return extra(doc);
};
const issues = doc => {
  const result = documentSchema.safeParse(doc);
  return result.success ? [] : result.error.issues.map(issue => issue.path.join("."));
};

describe("highlights in the format", () => {
  it("is format 1.4, with a highlights collection in every new catalog", () => {
    expect(FORMAT_VERSION).toBe("1.4");
    expect(issues(minimalDoc())).toEqual([]);
  });

  it("accepts a highlight with every field, and with a name only", () => {
    const full = {
      name: "Critical",
      description: "The path that must not fail.",
      colour: "red",
      border: "bold",
      fill: "tint",
      chip: true
    };
    expect(issues(withHighlight(full))).toEqual([]);
    expect(issues(withHighlight({ name: "Start" }))).toEqual([]);
    expect(issues(withHighlight({ name: "Brand", colour: "#7c3aed" }))).toEqual([]);
    expect(issues(withHighlight({ name: "Calm", colour: "teal" }))).toEqual([]);
  });

  it("rejects a colour outside the palette, a short hex, a border it does not know, and unknown keys", () => {
    expect(issues(withHighlight({ name: "X", colour: "#7c3" }))).toEqual(["catalog.highlights.hlt_critical.colour"]);
    expect(issues(withHighlight({ name: "X", colour: "purple" }))).toEqual(["catalog.highlights.hlt_critical.colour"]);
    expect(issues(withHighlight({ name: "X", border: "thin" }))).toEqual(["catalog.highlights.hlt_critical.border"]);
    expect(issues(withHighlight({ name: "X", fill: "solid" }))).toEqual(["catalog.highlights.hlt_critical.fill"]);
    expect(issues(withHighlight({ name: "X", tone: "danger" })).length).toBe(1);
    expect(issues(withHighlight({ name: "X", "x-mine": 1 }))).toEqual([]);
  });

  it("lets nodes and edges carry highlights, in order and once each", () => {
    const marked = withHighlight({ name: "Critical" }, doc => {
      doc.canvases.cnv_m.nodes.nod_a.highlights = ["hlt_critical"];
      doc.canvases.cnv_m.edges.edg_ab.highlights = ["hlt_critical"];
      return doc;
    });
    expect(issues(marked)).toEqual([]);
    marked.canvases.cnv_m.nodes.nod_a.highlights = ["hlt_critical", "hlt_critical"];
    expect(issues(marked)).toEqual(["canvases.cnv_m.nodes.nod_a.highlights"]);
  });

  it("does not let a level or a catalog item carry highlights", () => {
    const onLevel = withHighlight({ name: "Critical" }, doc => {
      doc.canvases.cnv_m.highlights = ["hlt_critical"];
      return doc;
    });
    expect(issues(onLevel).length).toBe(1);
    const onItem = withHighlight({ name: "Critical" }, doc => {
      doc.catalog.events.evt_a = { name: "a", highlights: ["hlt_critical"] };
      return doc;
    });
    expect(issues(onItem).length).toBe(1);
  });

  it("migrates a 1.3 document to 1.4 with an empty highlights collection, nothing else changed", () => {
    const old = minimalDoc();
    old.statewright = "1.3";
    delete old.catalog.highlights;
    const result = migrate(old);
    expect(result.ok).toBe(true);
    expect(result.doc.statewright).toBe("1.4");
    expect(result.doc.catalog.highlights).toEqual({});
    expect({ ...result.doc, statewright: "1.3", catalog: { ...result.doc.catalog, highlights: undefined } }).toEqual({
      ...old,
      catalog: { ...old.catalog, highlights: undefined }
    });
  });
});
