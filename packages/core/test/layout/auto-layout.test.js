import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { autoLayout, createGeometry, measureOverlaps } from "../../src/layout/index.js";
import { paymentsDoc } from "../helpers.js";
import { cleanDoc } from "../rules/fixtures.js";

/** Lay out a canvas and apply the commands. */
async function laidOut(doc, canvasId, scope = "missing") {
  return applyBatch(doc, await autoLayout(doc, canvasId, { scope })).doc;
}

describe("autoLayout", () => {
  it("places every canvas of the payments example without overlaps (spec §26)", async () => {
    let doc = paymentsDoc();
    for (const canvasId of Object.keys(doc.canvases)) {
      doc = await laidOut(doc, canvasId);
      expect(measureOverlaps(doc, canvasId), canvasId).toEqual([]);
      expect(Object.keys(doc.layout.canvases[canvasId].nodes).sort()).toEqual(
        Object.keys(doc.canvases[canvasId].nodes).sort()
      );
    }
  });

  it("returns layout commands, deterministically", async () => {
    const first = await autoLayout(paymentsDoc(), "cnv_expiryClock");
    expect(new Set(first.map(command => command.type))).toEqual(new Set(["layout.node.set", "layout.edge.set"]));
    expect(first.find(command => command.args.id === "edg_runningPaused").args).toMatchObject({
      canvas: "cnv_expiryClock",
      points: expect.any(Array),
      labelAt: expect.any(Array)
    });
    expect(await autoLayout(paymentsDoc(), "cnv_expiryClock")).toEqual(first);
  });

  it("starts machines at the left: the initial node is in the first layer", async () => {
    const doc = await laidOut(paymentsDoc(), "cnv_expiryClock");
    const nodes = doc.layout.canvases.cnv_expiryClock.nodes;
    const initial = nodes.nod_expiryClockInitial.x;
    for (const [id, position] of Object.entries(nodes))
      if (id !== "nod_expiryClockInitial") expect(position.x).toBeGreaterThan(initial);
  });

  it("with scope missing, places only new nodes, to the right of the placed ones", async () => {
    let doc = await laidOut(cleanDoc(), "cnv_m");
    const before = doc.layout.canvases.cnv_m.nodes;
    expect(await autoLayout(doc, "cnv_m")).toEqual([]);
    doc = applyBatch(doc, [
      { type: "node.add", args: { canvas: "cnv_m", id: "nod_new", node: { kind: "state", name: "new" } } }
    ]).doc;
    const commands = await autoLayout(doc, "cnv_m");
    expect(commands.map(command => command.args.id)).toEqual(["nod_new"]);
    const right = Math.max(...Object.values(before).map(position => position.x));
    expect(commands[0].args.x).toBeGreaterThan(right);
  });

  it("with scope all, recomputes everything but keeps each node's display and size", async () => {
    let doc = await laidOut(cleanDoc(), "cnv_root");
    doc = applyBatch(doc, [
      {
        type: "layout.node.set",
        args: { canvas: "cnv_root", id: "nod_engine", x: 999, y: 999, display: "card", w: 300 }
      }
    ]).doc;
    const commands = await autoLayout(doc, "cnv_root", { scope: "all" });
    const engine = commands.find(command => command.args.id === "nod_engine").args;
    expect(engine).toMatchObject({ display: "card", w: 300 });
    expect(engine.x).not.toBe(999);
  });

  it("with scope all, drops a display left behind by a removed interior", async () => {
    let doc = cleanDoc();
    doc = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "frame" } },
      { type: "canvas.remove", args: { id: "cnv_m", cascade: true } }
    ]).doc;
    const commands = await autoLayout(doc, "cnv_root", { scope: "all" });
    expect(commands.find(command => command.args.id === "nod_engine").args.display).toBeUndefined();
    expect(() => applyBatch(doc, commands)).not.toThrow();
  });

  it("with scope missing, places a new node of a region next to its region, so regions do not overlap", async () => {
    let doc = await laidOut(paymentsDoc(), "cnv_lifecycle");
    doc = applyBatch(doc, [
      {
        type: "node.add",
        args: { canvas: "cnv_lifecycle", id: "nod_new", node: { kind: "state", name: "new", region: "rgn_phase" } }
      }
    ]).doc;
    doc = await laidOut(doc, "cnv_lifecycle");
    const geometry = createGeometry(doc);
    const canvas = doc.canvases.cnv_lifecycle;
    const placed = doc.layout.canvases.cnv_lifecycle.nodes;
    const boxes = Object.keys(canvas.regions).map(region => {
      const members = Object.keys(canvas.nodes).filter(id => canvas.nodes[id].region === region);
      const rects = members.map(id => ({ ...placed[id], ...geometry.size("cnv_lifecycle", id) }));
      return {
        region,
        top: Math.min(...rects.map(rect => rect.y)),
        bottom: Math.max(...rects.map(rect => rect.y + rect.h))
      };
    });
    boxes.sort((a, b) => a.top - b.top);
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].top, boxes[i].region).toBeGreaterThan(boxes[i - 1].bottom);
  });

  it("leaves the caller's document mutable when it lays out frames", async () => {
    const doc = structuredClone(
      applyBatch(cleanDoc(), [
        { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "frame" } }
      ]).doc
    );
    await autoLayout(doc, "cnv_root", { scope: "all" });
    expect(Object.isFrozen(doc.canvases.cnv_root)).toBe(false);
  });

  it("lays out interiors shown as frames first and sizes the frame around them", async () => {
    let doc = cleanDoc();
    doc = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "frame" } }
    ]).doc;
    const commands = await autoLayout(doc, "cnv_root", { scope: "all" });
    expect(commands[0].args.canvas).toBe("cnv_m");
    doc = applyBatch(doc, commands).doc;
    const geometry = createGeometry(doc);
    const inner = geometry.interiorBox("cnv_m");
    expect(geometry.size("cnv_root", "nod_engine").w).toBe(inner.w + 32);
  });

  it("stacks the regions of a machine, one block under the other", async () => {
    const doc = await laidOut(paymentsDoc(), "cnv_lifecycle");
    const nodes = doc.layout.canvases.cnv_lifecycle.nodes;
    const ys = ["nod_complianceHold", "nod_expiryClock", "nod_sendCrossBorder"].map(id => nodes[id].y);
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
  });

  it("refuses unknown canvases", async () => {
    await expect(autoLayout(cleanDoc(), "cnv_none")).rejects.toThrow(/No canvas/);
  });
});
