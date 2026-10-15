import { describe, expect, it } from "vitest";

import { createMarksStore } from "@/marks/store";
import { geometryOf, marksOf, summaryOf } from "@/marks/payload";

import { placedExample } from "../fixtures.js";

describe("what the marks say in a message (collaboration spec §5.4)", () => {
  it("reads each mark on its own level, with its colour's meaning, and names the elements marked for the AI", async () => {
    const doc = await placedExample("payments");
    const paused = geometryOf(doc, "cnv_expiryClock").boxes.find(box => box.id === "nod_paused");
    const store = createMarksStore();
    store.getState().add({
      level: "cnv_expiryClock",
      kind: "rectangle",
      colour: "red",
      rect: { x: paused.x - 10, y: paused.y - 10, width: paused.width + 20, height: paused.height + 20 }
    });
    store.getState().add({ level: "cnv_lifecycle", kind: "label", colour: "amber", at: [-9999, -9999], text: "why?" });
    store.getState().toggleForAI("nod_complianceHold", "cnv_lifecycle");
    const marks = marksOf(store.getState(), doc);
    expect(marks).toEqual([
      {
        kind: "rectangle",
        level: "cnv_expiryClock",
        colour: "red",
        meaning: "wrong",
        encloses: [{ id: "nod_paused", name: "paused" }],
        // The arrows into and out of paused cross its border.
        touches: expect.arrayContaining([{ id: "edg_runningPaused", name: "verify.started" }])
      },
      { kind: "label", level: "cnv_lifecycle", colour: "amber", meaning: "question", text: "why?" },
      {
        kind: "element",
        level: "cnv_lifecycle",
        element: { id: "nod_complianceHold", name: "compliance_hold", kind: "state" }
      }
    ]);
    expect(summaryOf(store.getState())).toEqual({ elements: 1, levels: 1, marks: 2 });
  });

  it("finds a level's boxes and edges in Core's figure, named", async () => {
    const doc = await placedExample("payments");
    const { boxes, lines } = geometryOf(doc, "cnv_expiryClock");
    expect(boxes.map(box => box.id)).toContain("nod_running");
    expect(boxes.find(box => box.id === "nod_running")).toMatchObject({ name: "running", width: expect.any(Number) });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].points.length).toBeGreaterThan(1);
  });
});
