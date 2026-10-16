import { describe, expect, it } from "vitest";
import { documentSchema } from "../../src/schema/index.js";
import { minimalDoc } from "../helpers.js";

const issuesOf = doc => {
  const result = documentSchema.safeParse(doc);
  return result.success ? [] : result.error.issues;
};

describe("documentSchema", () => {
  it("accepts the minimal document", () => {
    expect(issuesOf(minimalDoc())).toEqual([]);
  });

  it("rejects unknown keys and reports where", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.colour = "red";
    const [issue] = issuesOf(doc);
    expect(issue.code).toBe("unrecognized_keys");
    expect(issue.path).toEqual(["canvases", "cnv_root"]);
  });

  it("accepts x- extension keys anywhere", () => {
    const doc = minimalDoc();
    doc["x-engine"] = { run: 1 };
    doc.canvases.cnv_root["x-owner"] = "team-a";
    expect(issuesOf(doc)).toEqual([]);
  });

  it("rejects IDs with the wrong prefix as map keys", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.edg_wrong = { kind: "service", name: "API" };
    expect(issuesOf(doc).length).toBeGreaterThan(0);
  });

  it("only allows node kinds that belong to the canvas kind", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.nod_s = { kind: "state", name: "s" };
    expect(issuesOf(doc).length).toBeGreaterThan(0);
  });

  it("requires a format version it knows", () => {
    const doc = minimalDoc();
    doc.statewright = "1.5";
    expect(issuesOf(doc).length).toBeGreaterThan(0);
  });
});

describe("cross-field checks", () => {
  const withMachine = (node, edge) => {
    const doc = minimalDoc();
    doc.canvases.cnv_m = {
      kind: "machine",
      name: "M",
      nodes: { nod_a: { kind: "state", name: "a" }, ...(node ? { nod_b: node } : {}) },
      edges: edge ? { edg_e: edge } : {}
    };
    return doc;
  };

  it("rejects an empty condition", () => {
    const doc = withMachine(null, { from: "nod_a", to: "nod_a", guard: {} });
    expect(issuesOf(doc).map(issue => issue.message)).toContain(
      "A condition needs at least one of guard, expr or text"
    );
  });

  it("rejects internal transitions that are not self-transitions", () => {
    const doc = withMachine({ kind: "state", name: "b" }, { from: "nod_a", to: "nod_b", internal: true });
    expect(issuesOf(doc).map(issue => issue.message)).toContain("Only self-transitions can be internal");
  });

  it("rejects summaries longer than 3 lines", () => {
    const doc = withMachine({ kind: "state", name: "b", summary: "1\n2\n3\n4" });
    expect(issuesOf(doc).map(issue => issue.message)).toContain("A summary has at most 3 lines");
  });

  it("keeps type fields consistent with the type kind", () => {
    const doc = minimalDoc();
    doc.catalog.types.typ_t = { kind: "enum", name: "T", fields: [{ name: "a", type: "string" }] };
    expect(issuesOf(doc).map(issue => issue.message)).toContain('"fields" is only allowed on object types');
  });

  it("rejects duplicate field names", () => {
    const doc = minimalDoc();
    doc.catalog.types.typ_t = {
      kind: "object",
      name: "T",
      fields: [
        { name: "a", type: "string" },
        { name: "a", type: "integer" }
      ]
    };
    expect(issuesOf(doc).map(issue => issue.message)).toContain('Duplicate field "a"');
  });

  it("requires timer offsets and reminders to have a deadline", () => {
    const doc = minimalDoc();
    doc.catalog.timers.tmr_t = { name: "t", duration: "PT1H", reminders: ["-PT10M"] };
    expect(issuesOf(doc).map(issue => issue.message)).toContain('"reminders" requires "at"');
  });

  it("requires case values exactly on case edges", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_f = {
      kind: "flow",
      name: "F",
      nodes: { nod_s: { kind: "start" }, nod_e: { kind: "end" } },
      edges: { edg_c: { from: "nod_s", to: "nod_e", kind: "case" } }
    };
    expect(issuesOf(doc).map(issue => issue.message)).toContain(
      '"case" is required when kind is "case", and only then'
    );
  });

  it("validates event names", () => {
    const doc = minimalDoc();
    doc.catalog.events.evt_bad = { name: "Payin Confirmed" };
    expect(issuesOf(doc).length).toBeGreaterThan(0);
  });

  it("validates ISO 8601 durations", () => {
    const doc = minimalDoc();
    doc.catalog.timers.tmr_t = { name: "t", duration: "30 minutes" };
    expect(issuesOf(doc).length).toBeGreaterThan(0);
  });
});
