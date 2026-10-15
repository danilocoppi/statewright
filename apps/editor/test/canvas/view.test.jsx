// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { legendFor } from "statewright";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { placedExample } from "../fixtures.js";

async function show(name, canvasId, view = {}) {
  act(() => useView.setState({ ...VIEW_DEFAULTS, ...view }));
  const doc = await placedExample(name);
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Canvas />);
  return doc;
}

afterEach(() => act(() => editorStore.getState().close()));

describe("the canvas's tools", () => {
  it("zooms in and out, back to 100 %, and fits the level, from the zoom island", async () => {
    // Without motion, as for someone who asks for less of it, each zoom is done at once. An animated zoom starts from
    // wherever the one before it has got to, so two quick clicks would land wherever the test's timing put them.
    const motion = vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }));
    onTestFinished(() => motion.mockRestore());
    await show("payments", "cnv_lifecycle");
    const zoom = screen.getByRole("toolbar", { name: "Zoom" });
    const level = () => within(zoom).getByRole("button", { name: "Zoom to 100 %" });
    fireEvent.click(level());
    expect(level().textContent).toBe("100%");
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom in" }));
    expect(level().textContent).toBe("120%");
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom out" }));
    fireEvent.click(within(zoom).getByRole("button", { name: "Zoom out" }));
    expect(level().textContent).toBe("83%");
    fireEvent.click(within(zoom).getByRole("button", { name: "Fit" }));
    expect(Number.parseInt(level().textContent)).toBeLessThanOrEqual(100);
  });

  it("shows the level's legend when asked, in the document's wording", async () => {
    const doc = await show("get-paid-as-built", "cnv_transaction", { legend: true });
    const legend = screen.getByRole("region", { name: "Legend" });
    const { nodes, edges, chips } = legendFor(doc, "cnv_transaction");
    expect(
      within(legend)
        .getAllByRole("listitem")
        .map(item => item.querySelector("span").textContent)
    ).toEqual([
      ...nodes.map(item => item.label),
      ...edges.map(item => item.label),
      ...chips.map(item => item.label),
      "Finding"
    ]);
    expect(legend.querySelector("line").getAttribute("marker-end")).toMatch(/^url\(#canvas-m-edge-/);
    const guide = within(legend).getByRole("link", { name: "How to read a diagram (opens in a new tab)" });
    expect(guide.getAttribute("href")).toBe("/readme#reading-a-diagram");
    expect(guide.getAttribute("target")).toBe("_blank");
  });

  it("hides the legend and the minimap until asked, and shows the minimap when asked", async () => {
    await show("payments", "cnv_runtime");
    expect(screen.queryByRole("region", { name: "Legend" })).toBeNull();
    expect(document.querySelector(".react-flow__minimap")).toBeNull();
    act(() => useView.getState().toggle("minimap"));
    expect(document.querySelector(".react-flow__minimap")).toBeTruthy();
  });

  it("remembers what the person chose to see", () => {
    act(() => useView.setState(VIEW_DEFAULTS));
    act(() => useView.getState().toggle("legend"));
    expect(JSON.parse(localStorage.getItem("statewright:view")).state).toMatchObject({ legend: true, minimap: false });
  });
});
