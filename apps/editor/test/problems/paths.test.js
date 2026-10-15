import { check, hierarchy, pathTo } from "statewright";
import { afterEach, describe, expect, it, vi } from "vitest";

import { levelPathOf } from "@/lib/derived";
import { problemRows } from "@/problems/rows";

import { readExample } from "../fixtures.js";

// Spec §9: Problems for documents of up to 2,000 elements within 300 ms. The levels' paths are worked out once per
// document, not once per Problem.
vi.mock("statewright", async original => {
  const real = await original();
  return { ...real, hierarchy: vi.fn(real.hierarchy), pathTo: vi.fn(real.pathTo) };
});

afterEach(() => vi.clearAllMocks());

describe("the paths of the levels", () => {
  it("are the paths Core gives, for every level", () => {
    const doc = readExample("payments");
    for (const canvasId of Object.keys(doc.canvases)) {
      expect(levelPathOf(doc, canvasId)).toEqual(vi.mocked(pathTo).getMockImplementation()(doc, canvasId));
    }
  });

  it("are worked out once for all the Problems of a document", () => {
    const doc = readExample("payments");
    const problems = check(doc);
    expect(problems.filter(problem => problem.canvas).length).toBeGreaterThan(2);
    vi.clearAllMocks();
    problemRows(doc, problems);
    problemRows(doc, problems);
    expect(pathTo).not.toHaveBeenCalled();
    expect(hierarchy).toHaveBeenCalledTimes(1);
  });
});
