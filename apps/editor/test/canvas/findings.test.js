import { describe, expect, it } from "vitest";

import { findingsOn } from "@/canvas/findings";

import { readExample } from "../fixtures.js";

describe("a badge's findings", () => {
  it("are the findings about its element whose codes it shows, in the badge's order", () => {
    const doc = readExample("get-paid-as-built");
    doc.annotations.findings.fnd_A2 = { code: "A2", title: "Second", severity: "low", targets: ["nod_processing"] };
    doc.annotations.findings.fnd_A1 = {
      code: "A1",
      title: "First",
      severity: "critical",
      targets: ["nod_failed", "nod_processing"]
    };
    expect(findingsOn(doc, "nod_processing", ["A1", "A2", "H1"]).map(finding => finding.id)).toEqual([
      "fnd_A1",
      "fnd_A2",
      "fnd_H1"
    ]);
    expect(findingsOn(doc, "nod_processing", ["H1"])).toEqual([{ id: "fnd_H1", ...doc.annotations.findings.fnd_H1 }]);
    expect(findingsOn(doc, "nod_nowhere", ["H1"])).toEqual([]);
    expect(findingsOn({ ...doc, annotations: {} }, "nod_processing", ["H1"])).toEqual([]);
  });
});
