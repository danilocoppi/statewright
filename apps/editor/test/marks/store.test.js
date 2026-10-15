import { describe, expect, it } from "vitest";

import { createMarksStore } from "@/marks/store";

describe("the marks (collaboration spec §5.1)", () => {
  it("takes back the last mark drawn, and nothing when there is none", () => {
    const store = createMarksStore();
    const first = store.getState().add({ level: "cnv_a", kind: "stroke", colour: "red", points: [[0, 0]] });
    store
      .getState()
      .add({ level: "cnv_a", kind: "rectangle", colour: "red", rect: { x: 0, y: 0, width: 1, height: 1 } });
    store.getState().toggleForAI("nod_a", "cnv_a");
    expect(store.getState().undo()).toBe(true);
    expect(store.getState().marks.map(mark => mark.id)).toEqual([first]);
    expect(store.getState().forAI).toEqual([{ id: "nod_a", level: "cnv_a" }]);
    expect(store.getState().undo()).toBe(true);
    expect(store.getState().undo()).toBe(false);
  });

  it("marks an element for the AI, and unmarks it", () => {
    const store = createMarksStore();
    store.getState().toggleForAI("nod_a", "cnv_a");
    store.getState().toggleForAI("nod_b", "cnv_b");
    store.getState().toggleForAI("nod_a", "cnv_a");
    expect(store.getState().forAI).toEqual([{ id: "nod_b", level: "cnv_b" }]);
  });

  it("removes a mark, and clears all but the tool and the colour", () => {
    const store = createMarksStore();
    store.getState().setTool("pencil");
    store.getState().setColour("green");
    const id = store.getState().add({ level: "cnv_a", kind: "label", colour: "green", at: [0, 0], text: "x" });
    store.getState().add({ level: "cnv_a", kind: "label", colour: "green", at: [1, 1], text: "y" });
    store.getState().remove(id);
    expect(store.getState().marks.map(mark => mark.text)).toEqual(["y"]);
    store.getState().toggleForAI("nod_a", "cnv_a");
    store.getState().clear();
    expect(store.getState()).toMatchObject({ tool: "pencil", colour: "green", marks: [], forAI: [], shown: null });
  });

  it("takes back the last mark of the level shown, not an unseen one of another level", () => {
    const store = createMarksStore();
    const here = store.getState().add({ level: "cnv_a", kind: "stroke", colour: "red", points: [[0, 0]] });
    store.getState().add({ level: "cnv_b", kind: "stroke", colour: "red", points: [[0, 0]] });
    expect(store.getState().undo("cnv_a")).toBe(true);
    expect(store.getState().marks.map(mark => mark.level)).toEqual(["cnv_b"]);
    expect(store.getState().marks.some(mark => mark.id === here)).toBe(false);
    expect(store.getState().undo("cnv_a")).toBe(false);
  });
});
