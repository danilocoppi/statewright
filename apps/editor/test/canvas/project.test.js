import { createGeometry } from "statewright/layout";
import { describe, expect, it } from "vitest";

import { projectLevel } from "@/canvas/project";

import { placedExample, readExample } from "../fixtures.js";

const EXAMPLES = ["get-paid-as-built", "payments"];

describe("the canvas projection", () => {
  it.each(EXAMPLES)("puts every box of every level of %s where Core does, at Core's size", async name => {
    const doc = await placedExample(name);
    const geometry = createGeometry(doc);
    for (const canvasId of Object.keys(doc.canvases)) {
      const { nodes, edges } = projectLevel(doc, canvasId);
      const stored = doc.layout.canvases[canvasId];
      const boxes = nodes.filter(node => ["node", "frame"].includes(node.type) && !node.data.part.within.length);
      expect(boxes.map(node => node.id).sort(), canvasId).toEqual(Object.keys(doc.canvases[canvasId].nodes).sort());
      for (const node of boxes) {
        const { x, y } = stored.nodes[node.id];
        const { w, h } = geometry.size(canvasId, node.id);
        expect({ ...node.position, width: node.width, height: node.height }, `${canvasId}/${node.id}`).toEqual({
          x,
          y,
          width: w,
          height: h
        });
      }
      for (const edge of edges.filter(edge => !edge.data.part.within.length)) {
        expect(edge.data.part.points, `${canvasId}/${edge.id}`).toEqual(stored.edges[edge.id].points);
      }
    }
  });

  it("draws each part with Core's markup, painted with the theme's variables", async () => {
    const doc = await placedExample("get-paid-as-built");
    const { nodes, edges } = projectLevel(doc, "cnv_open");
    const created = nodes.find(node => node.id === "nod_created");
    expect(created.data.part.svg).toContain('<g class="node" data-id="nod_created">');
    expect(created.data.part.svg).toContain('fill="var(--sw-');
    expect([...nodes, ...edges].map(item => item.data.part?.svg ?? "").join("")).not.toMatch(/#[0-9a-f]{6}/i);
    expect(edges[0].data.part.svg).toContain('marker-end="url(#canvas-m-');
  });

  it("shows a frame's interior in place, seen but not selected or focused, above the frame", async () => {
    const doc = await placedExample("get-paid-as-built");
    const { nodes, edges } = projectLevel(doc, "cnv_transaction");
    const frame = nodes.find(node => node.type === "frame");
    expect(frame).toMatchObject({ id: "nod_open", selectable: true, focusable: true, zIndex: -1 });
    const inside = nodes.filter(node => node.data.part?.within?.[0] === "nod_open");
    expect(inside.length).toBeGreaterThan(0);
    for (const node of inside) {
      expect(node.id).toBe(`nod_open/${node.data.part.id}`);
      expect(node).toMatchObject({ selectable: false, focusable: false });
      // A picture of a box, named for screen readers (an unfocused name needs a role to be read).
      if (node.ariaLabel) expect(node.ariaRole).toBe("img");
    }
    expect(inside.some(node => node.ariaLabel)).toBe(true);
    expect(frame.ariaRole).toBeUndefined();
    const insideEdge = edges.find(edge => edge.data.part.within[0] === "nod_open");
    expect(insideEdge.source.startsWith("nod_open/")).toBe(true);
    expect(insideEdge.selectable).toBe(false);
  });

  it("lets the pointer through what is only seen: regions, the heading and parts inside frames", async () => {
    const { nodes } = projectLevel(await placedExample("payments"), "cnv_lifecycle");
    const seen = nodes.filter(node => !node.selectable);
    expect(seen.map(node => node.type)).toEqual(expect.arrayContaining(["region", "heading"]));
    expect(seen.every(node => node.style?.pointerEvents === "none")).toBe(true);
    expect(nodes.filter(node => node.selectable).every(node => node.style === undefined)).toBe(true);
  });

  it("stacks regions under frames, frames under edges, and edges under boxes, lanes and notes", async () => {
    const doc = await placedExample("payments");
    const { nodes, edges } = projectLevel(doc, "cnv_lifecycle");
    const z = type => [...new Set(nodes.filter(node => node.type === type).map(node => node.zIndex))];
    expect(z("region")).toEqual([-2]);
    expect(z("node")).toEqual([0]);
    expect([...new Set(edges.map(edge => edge.zIndex))]).toEqual([0]);
    expect(nodes.findIndex(node => node.type === "region")).toBeLessThan(nodes.findIndex(node => node.type === "node"));
    expect(nodes.filter(node => node.type === "region").every(node => !node.selectable && !node.focusable)).toBe(true);
  });

  it("calls the boxes and arrows the figure leaves unnamed as it is told to", async () => {
    const doc = await placedExample("get-paid-as-built");
    const nameOf = id => `named ${id}`;
    const { nodes, edges } = projectLevel(doc, "cnv_open", { nameOf });
    expect(nodes.find(node => node.id === "nod_openStart").ariaLabel).toBe("named nod_openStart");
    expect(edges.find(edge => edge.id === "edg_initialCreated").ariaLabel).toBe("named edg_initialCreated");
    const labelled = edges.find(edge => edge.data.part.label);
    expect(labelled.ariaLabel).toBe(labelled.data.part.label);
    const note = nodes.find(node => node.type === "note");
    if (note) expect(note.ariaLabel).toBe(doc.annotations.notes[note.id].text);
  });

  it("orders the boxes as a figure is read: left to right, then top to bottom", async () => {
    const doc = await placedExample("payments");
    const boxes = projectLevel(doc, "cnv_runtime").nodes.filter(node => node.focusable);
    const order = boxes.map(node => [node.position.x, node.position.y]);
    expect(order).toEqual([...order].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    expect(boxes.every(node => node.ariaLabel)).toBe(true);
  });

  it("prints the level's heading above the figure", async () => {
    const doc = await placedExample("get-paid-as-built");
    const { nodes, bounds } = projectLevel(doc, "cnv_transaction");
    const heading = nodes.find(node => node.type === "heading");
    expect(heading.data.title).toBe(doc.canvases.cnv_transaction.title ?? doc.canvases.cnv_transaction.name);
    expect(heading).toMatchObject({ position: { x: bounds.x, y: bounds.y - 32 }, origin: [0, 1], selectable: false });
  });

  it("lists the boxes that still need a position, and shows only the heading until they have one", () => {
    const { nodes, edges, unplaced } = projectLevel(readExample("payments"), "cnv_runtime");
    expect(unplaced).toHaveLength(8);
    expect(nodes.map(node => node.type)).toEqual(["heading"]);
    expect(edges).toEqual([]);
  });
});
