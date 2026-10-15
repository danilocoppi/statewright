// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { marksStore } from "@/marks/store";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

afterEach(() =>
  act(() => {
    marksStore.getState().clear();
    marksStore.getState().setTool(null);
    editorStore.getState().close();
  })
);

async function show(canvasId) {
  const doc = await placedExample("payments");
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Canvas />);
}

describe("the marks on the canvas (collaboration spec §5.1)", () => {
  it("draws the level's own marks and rings what is marked for the AI, and nothing of another level", async () => {
    act(() => {
      marksStore.getState().add({
        level: "cnv_lifecycle",
        kind: "rectangle",
        colour: "red",
        rect: { x: 0, y: 0, width: 50, height: 50 }
      });
      marksStore.getState().add({ level: "cnv_lifecycle", kind: "label", colour: "amber", at: [10, 90], text: "why?" });
      marksStore
        .getState()
        .add({ level: "cnv_expiryClock", kind: "ellipse", colour: "green", rect: { x: 0, y: 0, width: 9, height: 9 } });
      marksStore.getState().toggleForAI("nod_expiryClock", "cnv_lifecycle");
    });
    await show("cnv_lifecycle");
    const layer = document.querySelector('[data-testid="marks-layer"]');
    expect([...layer.querySelectorAll("[data-mark]")].map(mark => mark.dataset.mark)).toEqual(["rectangle", "label"]);
    expect(layer.querySelector('[data-mark="label"]').textContent).toBe("why?");
    expect(layer.querySelector('[data-for-ai="nod_expiryClock"]')).toBeTruthy();
    expect(layer.querySelector('[data-mark="rectangle"]').getAttribute("stroke")).toBe("var(--danger)");
  });

  it("takes the pointer only while a marking tool is in hand", async () => {
    await show("cnv_lifecycle");
    expect(document.querySelector(".sw-canvas").classList.contains("sw-marking")).toBe(false);
    act(() => marksStore.getState().setTool("pencil"));
    expect(document.querySelector(".sw-canvas").classList.contains("sw-marking")).toBe(true);
  });

  it("shows a sent message's marks again until the person clicks elsewhere", async () => {
    await show("cnv_lifecycle");
    const drawn = {
      marks: [{ id: "m", level: "cnv_lifecycle", kind: "label", colour: "red", at: [0, 0], text: "again" }],
      forAI: []
    };
    act(() => marksStore.getState().show(drawn));
    expect(document.querySelector('[data-mark="label"]').textContent).toBe("again");
    fireEvent.pointerDown(document.body);
    expect(marksStore.getState().shown).toBeNull();
    expect(document.querySelector('[data-mark="label"]')).toBeNull();
  });
});
