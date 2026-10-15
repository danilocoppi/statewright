import { describe, expect, it } from "vitest";

import { createProblemsStore, summarize, worstByElement } from "@/problems/store";

const problem = (target, severity) => ({ code: "x", severity, target, message: "m" });

describe("Problems", () => {
  it("counts by severity and names the worst present", () => {
    expect(summarize([problem("a", "incomplete"), problem("b", "warning"), problem("c", "warning")])).toEqual({
      total: 3,
      error: 0,
      warning: 2,
      incomplete: 1,
      worst: "warning"
    });
    expect(summarize([]).worst).toBeNull();
  });

  it("keeps the worst severity of each element", () => {
    const worst = worstByElement([problem("a", "incomplete"), problem("a", "error"), problem("b", "warning")]);
    expect(Object.fromEntries(worst)).toEqual({ a: "error", b: "warning" });
  });

  it("stores the Problems of a version, and forgets them", () => {
    const store = createProblemsStore();
    store.getState().set(3, [problem("a", "warning")]);
    expect(store.getState()).toMatchObject({ version: 3, list: [problem("a", "warning")] });
    expect(store.getState().byElement.get("a")).toBe("warning");
    store.getState().clear();
    expect(store.getState()).toMatchObject({ version: null, list: [] });
  });
});

describe("the Problems panel on an element", () => {
  it("is asked for with the element, highlighted on the canvas, and forgotten", () => {
    const store = createProblemsStore();
    store.getState().showElement("nod_a");
    expect(store.getState()).toMatchObject({ focus: "nod_a", highlight: "nod_a" });
    store.getState().setFocus(null);
    expect(store.getState().focus).toBeNull();
    store.getState().showElement("nod_b");
    store.getState().clear();
    expect(store.getState()).toMatchObject({ focus: null, highlight: null });
  });
});
