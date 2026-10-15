import { describe, expect, it } from "vitest";

import { markedSvg } from "@/marks/image";
import { geometryOf } from "@/marks/payload";

import { placedExample } from "../fixtures.js";

describe("the image of the marks (collaboration spec §5.4)", () => {
  it("draws the level's figure with the marks on it, cropped to them with a margin", async () => {
    const doc = await placedExample("payments");
    const running = geometryOf(doc, "cnv_expiryClock").boxes.find(box => box.id === "nod_running");
    const rect = { x: running.x - 10, y: running.y - 10, width: running.width + 20, height: running.height + 20 };
    const drawn = markedSvg(doc, "cnv_expiryClock", {
      marks: [
        { id: "m1", level: "cnv_expiryClock", kind: "rectangle", colour: "red", rect },
        {
          id: "m2",
          level: "cnv_lifecycle",
          kind: "ellipse",
          colour: "green",
          rect: { x: 0, y: 0, width: 5, height: 5 }
        }
      ],
      forAI: []
    });
    expect(drawn.width).toBe(Math.ceil(rect.width + 96));
    expect(drawn.svg).toContain(`viewBox="${rect.x - 48} ${rect.y - 48} ${drawn.width} ${drawn.height}"`);
    expect(drawn.svg).toContain('stroke="#b42318"');
    expect(drawn.svg).not.toContain("<ellipse");
    expect(drawn.svg).toContain("running");
    // The arrows keep their heads: the figure's markers come with it.
    expect(drawn.svg).toMatch(/<marker id="marks-/);
    expect(drawn.scale).toBeLessThanOrEqual(2);
  });

  it("keeps the image at most 1600 px on its longer side, and draws nothing without marks on the level", async () => {
    const doc = await placedExample("payments");
    const wide = markedSvg(doc, "cnv_expiryClock", {
      marks: [
        {
          id: "m",
          level: "cnv_expiryClock",
          kind: "rectangle",
          colour: "red",
          rect: { x: 0, y: 0, width: 4000, height: 100 }
        }
      ],
      forAI: []
    });
    expect(Math.max(wide.width, wide.height) * wide.scale).toBeLessThanOrEqual(1600);
    expect(markedSvg(doc, "cnv_expiryClock", { marks: [], forAI: [] })).toBeNull();
  });
});
