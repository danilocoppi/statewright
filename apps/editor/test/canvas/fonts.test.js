// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { whenFontsAreIn } from "@/canvas/useLevelView";

const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done))));

describe("framing a level once its fonts are in", () => {
  it("frames at once when no font is loading", () => {
    const then = vi.fn();
    whenFontsAreIn(then, { status: "loaded", ready: Promise.resolve() });
    whenFontsAreIn(then, undefined);
    expect(then).toHaveBeenCalledTimes(2);
  });

  it("waits for the fonts, and for the boxes to be measured in them, while they load", async () => {
    let loaded;
    const fonts = { status: "loading", ready: new Promise(done => (loaded = done)) };
    const then = vi.fn();
    whenFontsAreIn(then, fonts);
    await frames();
    expect(then).not.toHaveBeenCalled();
    loaded();
    await frames();
    expect(then).toHaveBeenCalledTimes(1);
  });

  it("does nothing once cancelled — another level was shown meanwhile", async () => {
    const then = vi.fn();
    const cancel = whenFontsAreIn(then, { status: "loading", ready: Promise.resolve() });
    cancel();
    await frames();
    expect(then).not.toHaveBeenCalled();
  });
});
