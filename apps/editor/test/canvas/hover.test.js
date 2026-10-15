import { describe, expect, it } from "vitest";

import { besideTarget, createHoverStore, hoverShown } from "@/canvas/hover";

describe("what the pointer rests on", () => {
  it("is shown in a store of its own, and any shown is known", () => {
    const one = createHoverStore();
    const two = createHoverStore();
    expect(hoverShown()).toBe(false);
    two.getState().show({ target: "nod_a", rect: { left: 0, top: 0, right: 1, bottom: 1 } });
    expect(one.getState().shown).toBeNull();
    expect(hoverShown()).toBe(true);
    two.getState().close();
    expect(hoverShown()).toBe(false);
  });
});

describe("where the details of what the pointer rests on show", () => {
  const room = { w: 1000, h: 800 };
  const size = { w: 300, h: 200 };
  const target = (left, top) => ({ left, top, right: left + 40, bottom: top + 15 });

  it("beside the target on its right, their first line level with it", () => {
    expect(besideTarget(target(100, 300), size, room)).toEqual({ left: 148, top: 286.5, side: "right" });
  });

  it("on its left near the right edge of the window, and up from it near the bottom", () => {
    expect(besideTarget(target(800, 300), size, room)).toEqual({ left: 492, top: 286.5, side: "left" });
    expect(besideTarget(target(100, 700), size, room)).toEqual({ left: 148, top: 528.5, side: "right" });
  });

  it("never past an edge of the window", () => {
    expect(besideTarget(target(100, 0), size, room).top).toBe(8);
    expect(besideTarget(target(100, 300), { w: 300, h: 900 }, room).top).toBe(8);
    // Too narrow a window for either side: the side with more room, moved in from the edge.
    expect(besideTarget(target(250, 300), size, { w: 520, h: 800 })).toMatchObject({ left: 8, side: "left" });
    expect(besideTarget(target(200, 300), size, { w: 500, h: 800 })).toMatchObject({ left: 192, side: "right" });
  });
});
