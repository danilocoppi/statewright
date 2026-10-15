import { describe, expect, it } from "vitest";

import {
  clearOfInspector,
  DOCK_SPACE,
  FIT,
  fitFor,
  INSPECTOR,
  inspectorLimits,
  inspectorSpace,
  inspectorWidth
} from "@/canvas/viewport";

describe("framing a level whole", () => {
  /** The room on each side of a level as wide as the canvas allows, framed with `padding` (React Flow's fit). */
  const side = (width, padding) => (width - width / (1 + padding)) / 2;

  it("frames as before where the canvas is wide, or not measured yet", () => {
    expect(fitFor(1440)).toEqual(FIT);
    expect(fitFor(1920)).toEqual(FIT);
    expect(fitFor(0)).toEqual(FIT);
  });

  it("keeps a level clear of the tool dock where the canvas is narrow", () => {
    for (const width of [800, 1024, 1280]) {
      expect(side(width, fitFor(width).padding)).toBeGreaterThanOrEqual(DOCK_SPACE - 1e-9);
    }
    expect(fitFor(1024).maxZoom).toBe(FIT.maxZoom);
  });
});

describe("keeping a box clear of the inspector", () => {
  const width = 1280;
  const edge = width - inspectorSpace();

  it("leaves the view alone when the box is clear of it", () => {
    expect(clearOfInspector(200, 400, width)).toBe(0);
    expect(clearOfInspector(edge - 200, edge, width)).toBe(0);
  });

  it("slides the view left by how much of the box is under it", () => {
    expect(clearOfInspector(edge - 100, edge + 60, width)).toBe(60);
  });

  it("never slides the box's left edge off the screen", () => {
    expect(clearOfInspector(100, edge + 300, width)).toBe(100 - 24);
    expect(clearOfInspector(10, edge + 300, width)).toBe(0);
  });
});

describe("the inspector's width", () => {
  it("goes from 340 px to 720 px, or 60 % of the window where that is less", () => {
    expect(inspectorLimits(1920)).toEqual({ min: 340, max: 720 });
    expect(inspectorLimits(1000)).toEqual({ min: 340, max: 600 });
    expect(inspectorLimits(1001)).toEqual({ min: 340, max: 600 });
  });

  it("never goes under 340 px, however narrow the window", () => {
    expect(inspectorLimits(500)).toEqual({ min: 340, max: 340 });
    expect(inspectorWidth(480, 500)).toBe(340);
  });

  it("keeps a width within its limits, and clamps it again in a smaller window", () => {
    expect(inspectorWidth(480, 1440)).toBe(480);
    expect(inspectorWidth(200, 1440)).toBe(340);
    expect(inspectorWidth(900, 1440)).toBe(720);
    expect(inspectorWidth(700, 1000)).toBe(600);
    expect(inspectorWidth(480.6, 1440)).toBe(481);
  });

  it("is 340 px when what was kept is not a width", () => {
    for (const kept of [undefined, null, "wide", Number.NaN, Infinity]) {
      expect(inspectorWidth(kept, 1440)).toBe(INSPECTOR.width);
    }
  });

  it("takes its room from the canvas: its width, its margin and some air", () => {
    expect(inspectorSpace()).toBe(340 + 16 + 24);
    expect(inspectorSpace(500)).toBe(500 + 16 + 24);
  });

  it("frames a level left of a widened panel", () => {
    expect(fitFor(1440, { beside: true, inspector: 500 }).padding.right).toBe(`${inspectorSpace(500)}px`);
  });

  it("slides a box clear of a widened inspector", () => {
    const width = 1280;
    const edge = width - inspectorSpace(500);
    expect(clearOfInspector(edge - 100, edge, width, 500)).toBe(0);
    expect(clearOfInspector(edge - 100, edge + 60, width, 500)).toBe(60);
    expect(clearOfInspector(edge - 100, edge + 60, width)).toBe(0);
  });
});
