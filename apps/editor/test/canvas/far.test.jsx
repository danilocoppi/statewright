// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

afterEach(() => act(() => editorStore.getState().close()));

describe("far out, boxes draw less (performance spec §3 P2)", () => {
  it("marks the canvas far once names would be too small to read, and near again", async () => {
    const motion = vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }));
    onTestFinished(() => motion.mockRestore());
    const doc = await placedExample("payments");
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_lifecycle" }));
    render(<Canvas />);
    const zoom = screen.getByRole("toolbar", { name: "Zoom" });
    const canvas = screen.getByTestId("canvas");
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom to 100 %" }));
    expect(canvas.dataset.far).toBeUndefined();
    for (let step = 0; step < 6; step += 1) fireEvent.click(within(zoom).getByRole("button", { name: "Zoom out" }));
    expect(Number.parseInt(within(zoom).getByRole("button", { name: "Zoom to 100 %" }).textContent)).toBeLessThan(40);
    expect(canvas.dataset.far).toBe("true");
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom to 100 %" }));
    expect(canvas.dataset.far).toBeUndefined();
  });
});
