import { describe, expect, it } from "vitest";

import { beginGesture, eraseAlong, eraseAt } from "@/marks/gesture";
import { createMarksStore } from "@/marks/store";

const fresh = (tool = "rectangle", colour = "amber") => {
  const store = createMarksStore();
  store.getState().setTool(tool);
  store.getState().setColour(colour);
  return store;
};

describe("drawing a mark (collaboration spec §5.1)", () => {
  it("draws a rectangle by dragging, in the colour chosen, on the level shown", () => {
    const store = fresh();
    const gesture = beginGesture(store, "cnv_a", [10, 20]);
    gesture.move([110, 70]);
    expect(gesture.draft()).toMatchObject({ kind: "rectangle", rect: { x: 10, y: 20, width: 100, height: 50 } });
    gesture.end();
    expect(store.getState().marks).toMatchObject([
      { level: "cnv_a", kind: "rectangle", colour: "amber", rect: { x: 10, y: 20, width: 100, height: 50 } }
    ]);
  });

  it("draws upwards and leftwards too, and a square or a circle with Shift", () => {
    const store = fresh("ellipse");
    const gesture = beginGesture(store, "cnv_a", [100, 100]);
    gesture.move([40, 80], { shift: true });
    gesture.end();
    expect(store.getState().marks[0]).toMatchObject({ kind: "ellipse", rect: { x: 40, y: 40, width: 60, height: 60 } });
  });

  it("draws a pencil stroke through the points it passed, and nothing for a click", () => {
    const store = fresh("pencil");
    const click = beginGesture(store, "cnv_a", [0, 0]);
    click.end();
    expect(store.getState().marks).toEqual([]);
    const gesture = beginGesture(store, "cnv_a", [0, 0]);
    for (const x of [1, 5, 10, 20]) gesture.move([x, 0]);
    gesture.end();
    expect(store.getState().marks[0].points).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
      [20, 0]
    ]);
  });
});

describe("erasing (collaboration spec §5.1)", () => {
  it("takes away the mark under the pointer on its level only", () => {
    const store = fresh("pencil");
    const stroke = beginGesture(store, "cnv_a", [0, 0]);
    stroke.move([100, 0]);
    stroke.end();
    store
      .getState()
      .add({ level: "cnv_b", kind: "rectangle", colour: "red", rect: { x: 0, y: 0, width: 50, height: 50 } });
    expect(eraseAt(store, "cnv_a", [50, 30], 6)).toBeNull();
    expect(eraseAt(store, "cnv_a", [50, 4], 6)).toMatch(/^mrk_/);
    expect(store.getState().marks.map(mark => mark.level)).toEqual(["cnv_b"]);
    expect(eraseAt(store, "cnv_b", [25, 25], 6)).toMatch(/^mrk_/);
    store.getState().add({ level: "cnv_a", kind: "label", colour: "red", at: [200, 200], text: "needs a timeout" });
    expect(eraseAt(store, "cnv_a", [230, 196], 6)).toMatch(/^mrk_/);
  });

  it("takes away every mark a drag crosses", () => {
    const store = fresh();
    store
      .getState()
      .add({ level: "cnv_a", kind: "rectangle", colour: "red", rect: { x: 0, y: 0, width: 50, height: 50 } });
    store
      .getState()
      .add({ level: "cnv_a", kind: "ellipse", colour: "red", rect: { x: 100, y: 0, width: 50, height: 50 } });
    store
      .getState()
      .add({ level: "cnv_a", kind: "rectangle", colour: "red", rect: { x: 0, y: 300, width: 50, height: 50 } });
    expect(eraseAlong(store, "cnv_a", [-10, 25], [200, 25], 6)).toHaveLength(2);
    expect(store.getState().marks.map(mark => mark.rect.y)).toEqual([300]);
  });
});
