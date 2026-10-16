// @vitest-environment jsdom
// Highlights on the canvas (highlights spec §4, §6): their colours and arrowheads in both themes, far out and in the
// legend.
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import { applyBatch, figureOf } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { DiagramDefs } from "@/canvas/DiagramDefs";
import { farLook } from "@/canvas/far";
import { Legend } from "@/canvas/Legend";
import { paint } from "@/canvas/palette";
import { MARKER_PREFIX } from "@/canvas/project";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

/** Payments with Critical (red, tint, tag) on the engine and Brand (a hex) on an arrow of its runtime. */
async function highlighted() {
  const doc = await placedExample("payments");
  const [arrow] = Object.keys(doc.canvases.cnv_runtime.edges);
  return applyBatch(doc, [
    {
      type: "catalog.add",
      args: {
        collection: "highlights",
        id: "hlt_critical",
        item: { name: "Critical", description: "Must not fail.", colour: "red", fill: "tint", chip: true }
      }
    },
    {
      type: "catalog.add",
      args: { collection: "highlights", id: "hlt_brand", item: { name: "Brand", colour: "#C2410C" } }
    },
    { type: "node.update", args: { id: "nod_lifecycleEngine", set: { highlights: ["hlt_critical"] } } },
    { type: "edge.update", args: { id: arrow, set: { highlights: ["hlt_brand"] } } }
  ]).doc;
}

afterEach(() => act(() => editorStore.getState().close()));

describe("highlights on the canvas", () => {
  it("defines the ten colours' arrowheads always, and a hex highlight's colours and arrowhead for its document", async () => {
    const doc = await highlighted();
    const { container, rerender } = render(<DiagramDefs />);
    expect(container.querySelector(`#${MARKER_PREFIX}-m-highlight-DC2626`)).not.toBeNull();
    expect(container.querySelector(`#${MARKER_PREFIX}-m-highlight-C2410C`)).toBeNull();
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
    rerender(<DiagramDefs />);
    expect(container.querySelector(`#${MARKER_PREFIX}-m-highlight-C2410C`)).not.toBeNull();
    expect(container.querySelector("style").textContent).toContain("--sw-c2410c: #C2410C");
  });

  it("draws a highlighted box far out in its highlight's outline and tint", async () => {
    const doc = await highlighted();
    const box = figureOf(doc, "cnv_runtime", { paint }).nodes.find(part => part.id === "nod_lifecycleEngine");
    const plain = structuredClone(doc);
    plain.canvases.cnv_runtime.nodes.nod_lifecycleEngine.highlights = [];
    const before = figureOf(plain, "cnv_runtime", { paint }).nodes.find(part => part.id === "nod_lifecycleEngine");
    // The engine has a level inside: its stack cards are drawn behind it, but far out it is the front card's look.
    expect(farLook(box).stroke).toBe(paint("#DC2626"));
    expect(farLook(box).fill).toBe(paint("#FEF2F2"));
    expect(farLook(box).stroke).not.toBe(farLook(before).stroke);
  });

  it("lists the level's highlights in the legend, with what they mean", async () => {
    const doc = await highlighted();
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
    const { unmount } = render(<Legend />);
    const legend = screen.getByRole("region", { name: "Legend" });
    expect(within(legend).getByText("Critical")).toBeTruthy();
    expect(within(legend).getByText("Must not fail.")).toBeTruthy();
    expect(within(legend).getByText("Brand")).toBeTruthy();
    unmount();
  });
});
