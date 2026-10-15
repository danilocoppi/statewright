// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editorStore } from "@/store/editor";
import { handlers } from "@/workers/layout";

import { placedExample, readExample } from "../fixtures.js";

// The layout worker as each test needs it: the real handlers, slowed down, or failing.
const layout = vi.hoisted(() => ({ request: null }));
vi.mock("@/workers", async importOriginal => ({
  ...(await importOriginal()),
  layoutClient: () => ({ request: (type, payload) => layout.request(type, payload) })
}));

const box = (container, id) => container.querySelector(`.react-flow__node[data-id="${id}"]`);
const later = (ms, value) => new Promise(resolve => setTimeout(() => resolve(value), ms));
const zoomOf = container =>
  Number(container.querySelector(".react-flow__viewport").style.transform.match(/scale\(([0-9.]+)\)/)[1]);

beforeEach(() => {
  layout.request = (type, payload) => handlers[type](payload);
});

afterEach(() => act(() => editorStore.getState().close()));

describe("the canvas, when arranging a level takes time or fails", () => {
  it("frames an interior on its own when it is still being arranged after the zoom into its box", async () => {
    const doc = structuredClone(await placedExample("payments"));
    delete doc.layout.canvases.cnv_lifecycle;
    layout.request = async (type, payload) => later(500, await handlers[type](payload));
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
    const { container } = render(<Canvas onNavigate={id => editorStore.getState().setCanvas(id)} />);
    fireEvent.doubleClick(box(container, "nod_lifecycleEngine"));
    await waitFor(
      () => expect(container.querySelector('[data-canvas="cnv_lifecycle"] .react-flow__node-node')).toBeTruthy(),
      {
        timeout: 3000
      }
    );
    await later(400);
    expect(zoomOf(container)).toBeLessThanOrEqual(1);
    const { viewports } = editorStore.getState().view;
    expect(viewports.cnv_lifecycle?.zoom ?? 1).toBeLessThanOrEqual(1);
    expect(viewports.cnv_runtime.zoom).toBeLessThanOrEqual(1);
  });

  it("says when a level could not be arranged, and tries again when asked", async () => {
    layout.request = async () => {
      throw new Error("The layout failed");
    };
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    const { container } = render(<Canvas />);
    expect(await screen.findByText("This level could not be arranged.")).toBeTruthy();
    expect(screen.queryByText("Nothing on this level yet.")).toBeNull();
    layout.request = (type, payload) => handlers[type](payload);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(box(container, "nod_commandApi")).toBeTruthy(), { timeout: 5000 });
  });
});
