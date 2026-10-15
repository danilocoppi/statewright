import { describe, expect, it } from "vitest";

import { drawnCount } from "@/canvas/figures";
import { projectLevel } from "@/canvas/project";
import { geometryOf } from "@/marks/payload";

import { readExample } from "../fixtures.js";

describe("one drawing of a level per document (performance spec §3 P2)", () => {
  it("is shared by the canvas and the layers that read its geometry", () => {
    const doc = readExample("payments");
    const before = drawnCount();
    projectLevel(doc, "cnv_lifecycle");
    geometryOf(doc, "cnv_lifecycle");
    expect(drawnCount() - before).toBe(1);
  });

  it("is drawn once when only the layers ask", () => {
    const doc = readExample("payments");
    const before = drawnCount();
    geometryOf(doc, "cnv_expiryClock");
    geometryOf(doc, "cnv_expiryClock");
    expect(drawnCount() - before).toBe(1);
  });
});
