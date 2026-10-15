// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAbovePoint, useInside } from "@/editing/useInside";

/**
 * A popover of a size, centred at `left`, its top at `top`, on a canvas of 1000 × 600; `above`: where its bottom may
 * rest, above what it is placed under.
 */
function popover(left, top, above) {
  const box = document.createElement("section");
  Object.assign(box.style, { left: `${left}px`, top: `${top}px` });
  if (above !== undefined) box.dataset.above = String(above);
  Object.defineProperties(box, {
    offsetParent: { value: { clientWidth: 1000, clientHeight: 600 } },
    offsetWidth: { value: 320 },
    offsetHeight: { value: 300 }
  });
  return box;
}

describe("keeping a popover on the canvas", () => {
  it("moves a popover in from the right and the bottom edges, leaving room", () => {
    const box = popover(950, 500);
    renderHook(() => useInside({ current: box }));
    expect([box.style.marginLeft, box.style.marginTop]).toEqual(["-118px", "-208px"]);
  });

  it("moves it in from the left edge, and leaves a popover that fits where it is", () => {
    const near = popover(100, 0);
    renderHook(() => useInside({ current: near }));
    expect(near.style.marginLeft).toBe("68px");
    const middle = popover(500, 100);
    renderHook(() => useInside({ current: middle }));
    expect([middle.style.marginLeft, middle.style.marginTop]).toEqual(["0px", "0px"]);
  });

  it("puts a popover that does not fit below what it is placed under above it, where there is room", () => {
    const above = popover(500, 400, 380);
    renderHook(() => useInside({ current: above }));
    expect(above.style.marginTop).toBe("-320px");
    const cramped = popover(500, 400, 200);
    renderHook(() => useInside({ current: cramped }));
    expect(cramped.style.marginTop).toBe("-108px");
  });
});

/** A callout drawn above a point (`left`, `top`), 240 × 80, on a canvas of 1000 × 600. */
function callout(left, top) {
  const box = document.createElement("div");
  Object.assign(box.style, { left: `${left}px`, top: `${top}px` });
  Object.defineProperties(box, {
    offsetParent: { value: { clientWidth: 1000, clientHeight: 600 } },
    offsetWidth: { value: 240 },
    offsetHeight: { value: 80 }
  });
  return box;
}

describe("keeping a callout over a point on the canvas", () => {
  it("stays above the point where there is room, and goes below it near the top", () => {
    const middle = callout(500, 300);
    renderHook(() => useAbovePoint({ current: middle }));
    expect([middle.dataset.side, middle.style.marginLeft]).toEqual(["above", "0px"]);
    const high = callout(500, 40);
    renderHook(() => useAbovePoint({ current: high }));
    expect(high.dataset.side).toBe("below");
  });

  it("moves in from the left and right edges", () => {
    const right = callout(980, 300);
    renderHook(() => useAbovePoint({ current: right }));
    expect(parseFloat(right.style.marginLeft)).toBeLessThan(-100);
    const left = callout(20, 300);
    renderHook(() => useAbovePoint({ current: left }));
    expect(parseFloat(left.style.marginLeft)).toBeGreaterThan(100);
  });
});
