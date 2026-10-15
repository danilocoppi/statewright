import { check } from "statewright";
import { describe, expect, it } from "vitest";

import { problemRows, sentence } from "@/problems/rows";

import { placedExample, readExample } from "../fixtures.js";

describe("the lines of the Problems panel", () => {
  it("writes Core's messages as sentences", () => {
    expect(sentence('state "a" has no way out')).toBe('State "a" has no way out');
    expect(sentence("")).toBe("");
  });

  it("puts errors first, then warnings, then incomplete, in Core's order within each", async () => {
    const doc = await placedExample("payments");
    const problems = [
      { code: "x.one", severity: "incomplete", target: "nod_complianceHold", canvas: "cnv_lifecycle", message: "a" },
      { code: "x.two", severity: "error", target: "nod_complianceHold", canvas: "cnv_lifecycle", message: "b" },
      { code: "x.three", severity: "warning", target: "nod_complianceHold", canvas: "cnv_lifecycle", message: "c" },
      { code: "x.four", severity: "error", target: "nod_expiryClock", canvas: "cnv_lifecycle", message: "d" }
    ];
    expect(problemRows(doc, problems).map(row => row.code)).toEqual(["x.two", "x.four", "x.three", "x.one"]);
  });

  it("says where a Problem on a level is: the path of levels down to it", () => {
    const doc = readExample("get-paid-as-built");
    const [row] = problemRows(doc, check(doc));
    expect(row).toMatchObject({
      kind: "one",
      code: "machine.unreachable",
      target: "nod_underpaid",
      message: 'State "underpaid" cannot be reached from an initial node or entry',
      location: { kind: "level", canvas: "cnv_open", path: ["Transaction", "Open"] }
    });
  });

  it("groups catalog items with the same finding into one line that names them", () => {
    const doc = readExample("payments");
    const rows = problemRows(doc, check(doc));
    const events = rows.find(row => row.kind === "group" && row.collection === "events");
    const eventProblems = check(doc).filter(problem => problem.target.startsWith("evt_"));
    expect(events).toMatchObject({ code: "spec.unspecified", severity: "incomplete", fields: ["payload"] });
    expect(events.names).toEqual(eventProblems.map(problem => doc.catalog.events[problem.target].name));
    const endpoint = rows.find(row => row.target === "ept_createPayment");
    expect(endpoint).toMatchObject({ kind: "one", location: { kind: "catalog", collection: "endpoints" } });
  });
});
