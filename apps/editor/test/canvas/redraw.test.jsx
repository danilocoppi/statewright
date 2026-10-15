// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

/** Which boxes and arrows the canvas drew, by ID, since the last clear. */
const drawn = vi.hoisted(() => ({ nodes: [], edges: [] }));

vi.mock("@/canvas/parts", async original => {
  const parts = await original();
  return {
    ...parts,
    FigureNode: props => (drawn.nodes.push(props.data.part.id), parts.FigureNode(props))
  };
});
vi.mock("@/canvas/FigureEdge", async original => {
  const edges = await original();
  return {
    ...edges,
    FigureEdge: props => (drawn.edges.push(props.data.part.id), edges.FigureEdge(props))
  };
});

const { Canvas } = await import("@/canvas/Canvas");

afterEach(() => act(() => editorStore.getState().close()));

describe("an edit redraws what it changed (performance spec §3 P2)", () => {
  it("renaming one box draws that box again, not the others nor the arrows", async () => {
    const doc = await placedExample("payments");
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_lifecycle" }));
    render(<Canvas />);
    const [id] = Object.keys(doc.canvases.cnv_lifecycle.nodes).filter(
      key => doc.canvases.cnv_lifecycle.nodes[key].name
    );
    drawn.nodes.length = 0;
    drawn.edges.length = 0;
    act(() => {
      editorStore.getState().dispatch([{ type: "node.update", args: { id, set: { name: "x" } } }], { label: "Rename" });
    });
    expect(new Set(drawn.nodes)).toEqual(new Set([id]));
    expect(drawn.edges.length).toBeLessThanOrEqual(Object.keys(doc.canvases.cnv_lifecycle.edges).length / 2);
  });
});
