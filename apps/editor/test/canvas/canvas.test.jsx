// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createGeometry } from "statewright/layout";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { projectLevel } from "@/canvas/project";
import { editorStore } from "@/store/editor";

import { demoDoc, placedExample, readExample } from "../fixtures.js";

function show(doc, canvasId, options = {}, onNavigate = undefined) {
  act(() => editorStore.getState().open(doc, { canvasId, ...options }));
  return render(<Canvas onNavigate={onNavigate} />);
}

const box = (container, id) => container.querySelector(`.react-flow__node[data-id="${id}"]`);

/** Core's markup as the browser keeps it (serialized again, as innerHTML gives it back). */
function asParsed(markup) {
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "g");
  probe.innerHTML = markup;
  return probe.innerHTML;
}

afterEach(() => {
  act(() => editorStore.getState().close());
  document.documentElement.classList.remove("dark");
});

describe("the canvas", () => {
  it.each(["get-paid-as-built", "payments"])(
    "draws every box of every level of %s where Core does, with Core's markup, in both themes",
    async name => {
      const doc = await placedExample(name);
      const geometry = createGeometry(doc);
      for (const canvasId of Object.keys(doc.canvases)) {
        const markup = {};
        for (const theme of ["light", "dark"]) {
          document.documentElement.classList.toggle("dark", theme === "dark");
          const { container, unmount } = show(doc, canvasId);
          const parts = projectLevel(doc, canvasId).nodes.filter(node => ["node", "frame"].includes(node.type));
          for (const { id, data } of parts.filter(node => !node.data.part.within.length)) {
            const element = box(container, id);
            const { x, y } = doc.layout.canvases[canvasId].nodes[id];
            const { w, h } = geometry.size(canvasId, id);
            expect(element.style.transform, `${canvasId}/${id}`).toBe(`translate(${x}px,${y}px)`);
            expect([element.style.width, element.style.height]).toEqual([`${w}px`, `${h}px`]);
            const svg = element.querySelector("svg");
            expect(svg.getAttribute("viewBox")).toBe(`${x} ${y} ${w} ${h}`);
            expect(svg.innerHTML).toBe(asParsed(data.part.svg));
          }
          markup[theme] = container.querySelector(".react-flow__viewport").innerHTML;
          unmount();
        }
        expect(markup.dark, canvasId).toBe(markup.light);
      }
    }
  );

  it("defines every diagram colour for the light theme and for the dark one", async () => {
    show(await placedExample("get-paid-as-built"), "cnv_open");
    const css = document.querySelector("style").textContent;
    const [light, dark] = css.split(".dark");
    expect(light).toContain("--sw-ffffff: #FFFFFF;");
    expect(dark).toContain("--sw-ffffff: #262A33;");
  });

  it("draws every edge of the level with Core's route, arrowhead and label", async () => {
    const doc = await placedExample("get-paid-as-built");
    const { container } = show(doc, "cnv_open");
    const { edges } = projectLevel(doc, "cnv_open");
    await waitFor(() => expect(container.querySelectorAll(".react-flow__edge")).toHaveLength(edges.length));
    const edge = container.querySelector(`.react-flow__edge[data-id="${edges[0].id}"]`);
    expect(edge.innerHTML).toContain(asParsed(edges[0].data.part.svg));
    expect(document.querySelector('marker[id="canvas-m-edge-default"]')).toBeTruthy();
  });

  it("prints the level's heading on the canvas", async () => {
    const doc = await placedExample("get-paid-as-built");
    show(doc, "cnv_transaction");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      doc.canvases.cnv_transaction.title ?? doc.canvases.cnv_transaction.name
    );
  });

  it("selects a box or an edge by clicking it, and clears the selection by clicking the canvas", async () => {
    const doc = await placedExample("get-paid-as-built");
    const { container } = show(doc, "cnv_open");
    fireEvent.click(box(container, "nod_created"));
    expect(editorStore.getState().view.selections.cnv_open).toEqual(["nod_created"]);
    await waitFor(() => expect(box(container, "nod_created").querySelector(".sw-selection")).toBeTruthy());
    const edgeId = projectLevel(doc, "cnv_open").edges[0].id;
    await waitFor(() => expect(container.querySelector(`.react-flow__edge[data-id="${edgeId}"]`)).toBeTruthy());
    fireEvent.click(container.querySelector(`.react-flow__edge[data-id="${edgeId}"]`));
    expect(editorStore.getState().view.selections.cnv_open).toEqual([edgeId]);
    // Dragging on the canvas selects with a rectangle, so a click on it is a press and a release without moving.
    const pane = container.querySelector(".react-flow__pane");
    fireEvent.pointerDown(pane, { button: 0, isPrimary: true, pointerId: 1, clientX: 5, clientY: 5 });
    fireEvent.pointerUp(pane, { button: 0, isPrimary: true, pointerId: 1, clientX: 5, clientY: 5 });
    expect(editorStore.getState().view.selections.cnv_open).toEqual([]);
  });

  it("places a level shown without positions, stores them, and leaves them out of undo", async () => {
    const { container } = show(readExample("payments"), "cnv_runtime");
    expect(screen.getByRole("status").textContent).toBe("Arranging this level…");
    await waitFor(() => expect(box(container, "nod_commandApi")).toBeTruthy(), { timeout: 5000 });
    const { doc, history } = editorStore.getState();
    expect(Object.keys(doc.layout.canvases.cnv_runtime.nodes)).toHaveLength(8);
    expect(history.past).toEqual([]);
  });

  it("in a read-only tab, shows the placed level without storing it", async () => {
    const doc = readExample("payments");
    const { container } = show(doc, "cnv_runtime", { readOnly: true });
    await waitFor(() => expect(box(container, "nod_commandApi")).toBeTruthy(), { timeout: 5000 });
    expect(editorStore.getState().doc).toBe(doc);
  });

  it("says when a level has nothing on it yet", () => {
    const doc = demoDoc();
    doc.canvases.cnv_demo.nodes = {};
    show(doc, "cnv_demo");
    expect(screen.getByRole("status").textContent).toBe("Nothing on this level yet.");
  });
  it("opens a box's interior with a double-click, after zooming into the box", async () => {
    const onNavigate = vi.fn();
    const { container } = show(await placedExample("payments"), "cnv_runtime", {}, onNavigate);
    fireEvent.doubleClick(box(container, "nod_lifecycleEngine"));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("cnv_lifecycle"));
    fireEvent.doubleClick(box(container, "nod_clients"));
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("opens the focused box's interior with Enter, and says how when it is selected", async () => {
    const onNavigate = vi.fn();
    const { container } = show(await placedExample("payments"), "cnv_runtime", {}, onNavigate);
    fireEvent.click(box(container, "nod_lifecycleEngine"));
    await waitFor(() => expect(box(container, "nod_lifecycleEngine").textContent).toContain("to open"));
    expect(box(container, "nod_lifecycleEngine").querySelector("kbd").textContent).toBe("↵");
    fireEvent.keyDown(box(container, "nod_lifecycleEngine"), { key: "Enter" });
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("cnv_lifecycle"));
  });

  it("says how to open a box only while it is selected alone", async () => {
    const { container } = show(await placedExample("payments"), "cnv_runtime");
    act(() => editorStore.getState().select(["nod_lifecycleEngine"]));
    await waitFor(() => expect(box(container, "nod_lifecycleEngine").textContent).toContain("to open"));
    act(() => editorStore.getState().select(["nod_lifecycleEngine", "nod_scheduler"]));
    await waitFor(() => expect(box(container, "nod_lifecycleEngine").textContent).not.toContain("to open"));
  });

  it("opens the interior a frame shows by double-clicking anything inside it", async () => {
    const onNavigate = vi.fn();
    const { container } = show(await placedExample("get-paid-as-built"), "cnv_transaction", {}, onNavigate);
    expect(getComputedStyle(box(container, "nod_open/nod_created")).pointerEvents).toBe("none");
    fireEvent.doubleClick(box(container, "nod_open"));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("cnv_open"));
  });

  it("names for a screen reader what the figure leaves unnamed, and never says an ID", async () => {
    const { container } = show(await placedExample("get-paid-as-built"), "cnv_open");
    const live = container.querySelector("p[aria-live]");
    expect(box(container, "nod_openStart").getAttribute("aria-label")).toBe("Initial node");
    act(() => editorStore.getState().select(["edg_initialCreated"]));
    await waitFor(() => expect(live.textContent).toBe("Selected: Initial node → created"));
    // A box removed while selected (an undo, another tab) is no longer said.
    act(() => editorStore.getState().select(["nod_created", "nod_gone"]));
    await waitFor(() => expect(live.textContent).toBe("Selected: created"));
  });

  it("tells a screen reader which level is shown and what is selected", async () => {
    const { container } = show(await placedExample("payments"), "cnv_runtime");
    const live = container.querySelector("p[aria-live]");
    expect(live.textContent).toBe("Runtime is shown");
    fireEvent.click(box(container, "nod_lifecycleEngine"));
    await waitFor(() => expect(live.textContent).toBe("Selected: Lifecycle engine"));
  });
});
