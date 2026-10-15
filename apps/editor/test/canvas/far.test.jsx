// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    // Near again once the view holds still.
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom to 100 %" }));
    await waitFor(() => expect(canvas.dataset.far).toBeUndefined());
  });

  it("draws boxes and arrows plain far out, Core's drawing near", async () => {
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
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom to 100 %" }));
    const [id] = Object.entries(doc.canvases.cnv_lifecycle.nodes).find(([, node]) => node.kind === "state");
    const box = () => document.querySelector(`.react-flow__node-node[data-id="${id}"]`);
    expect(box().querySelector("svg g.node")).toBeTruthy();
    expect(box().querySelector("[data-far-box]")).toBeNull();
    for (let step = 0; step < 6; step += 1) fireEvent.click(within(zoom).getByRole("button", { name: "Zoom out" }));
    expect(box().querySelector("svg g.node")).toBeNull();
    const far = box().querySelector("[data-far-box]");
    expect(far.style.backgroundColor).not.toBe("");
    expect(document.querySelector("[data-far-edge]")).toBeTruthy();
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom to 100 %" }));
    await waitFor(() => expect(box().querySelector("svg g.node")).toBeTruthy());
  });
});
