// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { change, editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

afterEach(() => act(() => editorStore.getState().close()));

describe("a refused change on the canvas", () => {
  it("says why near the gesture, with Core's own words under More, until the next click elsewhere", async () => {
    const doc = await placedExample("payments");
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
    render(<Canvas />);
    act(() => {
      change([{ type: "node.remove", args: { id: "nod_nowhere" } }], { label: "Remove", at: { x: 100, y: 50 } });
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Something this change needs is not in the project.");
    expect(alert.textContent).not.toContain("nod_nowhere");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(alert.textContent).toContain('No element with ID "nod_nowhere"');
    // Core's own words stay English in every interface language, and say so (WCAG 3.1.2).
    expect(alert.querySelector('[lang="en"]').textContent).toContain('No element with ID "nod_nowhere"');
    fireEvent.pointerDown(alert);
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("puts the tool down when the level changes", async () => {
    const doc = await placedExample("payments");
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
    render(<Canvas />);
    act(() => editingStore.getState().setTool("service"));
    act(() => editorStore.getState().setCanvas("cnv_lifecycle"));
    expect(editingStore.getState().tool).toBe("select");
  });
});
