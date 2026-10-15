// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FigureEdge } from "@/canvas/FigureEdge";
import { projectLevel } from "@/canvas/project";
import { useDrag } from "@/canvas/useDrag";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

const t = key => key;

afterEach(() => editorStore.getState().close());

describe("dragging boxes", () => {
  it("keeps positions in the view while dragging, and drops them as one change", async () => {
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime" });
    const { result } = renderHook(() => useDrag(t, "cnv_runtime"));
    const before = editorStore.getState().doc;
    act(() =>
      result.current.onMove([
        { id: "nod_scheduler", type: "position", position: { x: 500, y: 40 }, dragging: true },
        { id: "nod_clients", type: "position", position: { x: 20, y: 300 }, dragging: true }
      ])
    );
    expect(result.current.positions.get("nod_scheduler")).toEqual({ x: 500, y: 40 });
    expect(editorStore.getState().doc).toBe(before);
    act(() =>
      result.current.onDrop(null, null, [
        { id: "nod_scheduler", position: { x: 500.4, y: 40 } },
        { id: "nod_clients", position: { x: 20, y: 300 } }
      ])
    );
    expect(result.current.positions).toBeNull();
    const nodes = editorStore.getState().doc.layout.canvases.cnv_runtime.nodes;
    expect([nodes.nod_scheduler, nodes.nod_clients]).toEqual([
      { x: 500, y: 40 },
      { x: 20, y: 300 }
    ]);
    expect(editorStore.getState().history.past.map(entry => entry.label)).toEqual(["editing.move"]);
  });

  it("draws an edge touching a box being dragged as a plain stepped line, until Core routes it", async () => {
    const doc = await placedExample("payments");
    const edge = projectLevel(doc, "cnv_runtime").edges[0];
    const { container } = render(
      <svg>
        <FigureEdge data={{ ...edge.data, moving: true }} sourceX={0} sourceY={10} targetX={100} targetY={60} />
      </svg>
    );
    expect(container.querySelector(".sw-preview-edge").getAttribute("d")).toBe("M 0 10 H 50 V 60 H 100");
    expect(container.innerHTML).not.toContain(edge.data.part.svg.slice(0, 40));
  });
});
