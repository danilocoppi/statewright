import { figureOf } from "statewright";
import { afterEach, describe, expect, it, vi } from "vitest";

import { projectLevel } from "@/canvas/project";
import { boxesOf } from "@/editing/changes";

import { placedExample } from "../fixtures.js";

// Spec §9: an edit on the canvas within 50 ms. Core draws a level once per version of the document: the canvas draws
// it to show it, and the edits made on it find its boxes there.
vi.mock("statewright", async original => {
  const real = await original();
  return { ...real, figureOf: vi.fn(real.figureOf) };
});

afterEach(() => vi.mocked(figureOf).mockClear());

describe("a level's boxes", () => {
  it("are worked out once per version of the document and level", async () => {
    const doc = await placedExample("payments");
    vi.mocked(figureOf).mockClear();
    const boxes = boxesOf(doc, "cnv_runtime");
    expect(boxesOf(doc, "cnv_runtime")).toBe(boxes);
    expect(boxes.get("nod_commandApi")).toMatchObject({ w: expect.any(Number), h: expect.any(Number) });
    expect(figureOf).toHaveBeenCalledTimes(1);
  });

  it("come from the figure the canvas drew to show the level", async () => {
    const doc = await placedExample("get-paid-as-built");
    projectLevel(doc, "cnv_transaction");
    vi.mocked(figureOf).mockClear();
    const boxes = boxesOf(doc, "cnv_transaction");
    expect(figureOf).not.toHaveBeenCalled();
    expect([...boxes.keys()]).toContain("nod_open");
    // A level drawn without some layers (the View menu) is not the whole figure: its boxes are drawn apart.
    projectLevel(doc, "cnv_open", { hidden: ["findings"] });
    vi.mocked(figureOf).mockClear();
    boxesOf(doc, "cnv_open");
    expect(figureOf).toHaveBeenCalledTimes(1);
  });
});
