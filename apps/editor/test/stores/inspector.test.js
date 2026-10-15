// @vitest-environment jsdom
// The inspector's width (spec §6.1): the person's choice is kept in this browser for every project, and what is shown
// stays within the window's limits.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "statewright:inspector";

/** The store, loaded afresh as a new page would (reading what this browser kept). */
const load = async () => {
  vi.resetModules();
  return import("@/stores/inspector");
};

/** The window, `width` px wide, as a resize leaves it. */
const resize = width => {
  window.innerWidth = width;
  window.dispatchEvent(new Event("resize"));
};

beforeEach(() => {
  localStorage.clear();
  resize(1440);
});
afterEach(() => localStorage.clear());

describe("the inspector's width", () => {
  it("is 340 px until the person changes it", async () => {
    const { currentInspectorWidth, inspectorWidthStore } = await load();
    expect(inspectorWidthStore.getState().width).toBe(340);
    expect(currentInspectorWidth()).toBe(340);
  });

  it("is kept in this browser, within its limits", async () => {
    const { inspectorWidthStore } = await load();
    inspectorWidthStore.getState().setWidth(480);
    expect(JSON.parse(localStorage.getItem(KEY)).state).toEqual({ width: 480 });
    inspectorWidthStore.getState().setWidth(900);
    expect(inspectorWidthStore.getState().width).toBe(720);
    inspectorWidthStore.getState().setWidth(100);
    expect(inspectorWidthStore.getState().width).toBe(340);
  });

  it("is what was kept when the Editor opens again", async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { width: 500 }, version: 0 }));
    const { currentInspectorWidth } = await load();
    expect(currentInspectorWidth()).toBe(500);
  });

  it("is 340 px when what was kept is not a width", async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { width: "wide" }, version: 0 }));
    const { currentInspectorWidth } = await load();
    expect(currentInspectorWidth()).toBe(340);
  });

  it("follows the window: narrower where the window is, and back as it was where it widens again", async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { width: 600 }, version: 0 }));
    const { useInspectorWidth } = await load();
    const { result } = renderHook(() => useInspectorWidth());
    expect(result.current).toBe(600);
    act(() => resize(800));
    expect(result.current).toBe(480);
    act(() => resize(1440));
    expect(result.current).toBe(600);
  });
});
