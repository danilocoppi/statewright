import { describe, expect, it } from "vitest";

import { besideBadge, findingsOn } from "@/canvas/findings";

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

describe("where a badge's findings show", () => {
  const room = { w: 1000, h: 800 };
  const size = { w: 300, h: 200 };
  const badge = (left, top) => ({ left, top, right: left + 40, bottom: top + 15 });

  it("beside the badge on its right, its first line level with the badge", () => {
    expect(besideBadge(badge(100, 300), size, room)).toEqual({ left: 148, top: 286.5, side: "right" });
  });

  it("on its left near the right edge of the window, and up from it near the bottom", () => {
    expect(besideBadge(badge(800, 300), size, room)).toEqual({ left: 492, top: 286.5, side: "left" });
    expect(besideBadge(badge(100, 700), size, room)).toEqual({ left: 148, top: 528.5, side: "right" });
  });

  it("never past an edge of the window", () => {
    expect(besideBadge(badge(100, 0), size, room).top).toBe(8);
    expect(besideBadge(badge(100, 300), { w: 300, h: 900 }, room).top).toBe(8);
    // Too narrow a window for either side: the side with more room, moved in from the edge.
    expect(besideBadge(badge(250, 300), size, { w: 520, h: 800 })).toMatchObject({ left: 8, side: "left" });
    expect(besideBadge(badge(200, 300), size, { w: 500, h: 800 })).toMatchObject({ left: 192, side: "right" });
  });
});
