// A highlight's look (highlights spec §3): ten palette colours tuned for both themes, and any hex derived to match.
import { describe, expect, it } from "vitest";
import { HIGHLIGHT_PALETTE } from "../../src/constants.js";
import { HIGHLIGHT_COLOURS, contrast, highlightLook } from "../../src/style/highlights.js";

const CANVAS = { light: "#FBFBFC", dark: "#121419" };
const meets = (look, theme) => {
  expect(contrast(look.stroke, CANVAS[theme]), `${theme} stroke ${look.stroke}`).toBeGreaterThanOrEqual(3);
  expect(contrast(look.text, look.tint), `${theme} text ${look.text} on ${look.tint}`).toBeGreaterThanOrEqual(4.5);
};

describe("highlight looks", () => {
  it("measures contrast as WCAG does", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrast("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });

  it("has every palette colour, in both themes, legible on the canvas and on its tint", () => {
    expect(Object.keys(HIGHLIGHT_COLOURS)).toEqual([...HIGHLIGHT_PALETTE]);
    for (const name of HIGHLIGHT_PALETTE) {
      for (const theme of ["light", "dark"]) meets(highlightLook({ name: "x", colour: name }, theme), theme);
    }
  });

  it("answers a palette colour's values as the table has them", () => {
    expect(highlightLook({ name: "x", colour: "teal" }, "dark")).toMatchObject(HIGHLIGHT_COLOURS.teal.dark);
    expect(highlightLook({ name: "x", colour: "teal" })).toMatchObject(HIGHLIGHT_COLOURS.teal.light);
  });

  it("derives a hex colour's tint, text and dark variant so that they meet the same contrast", () => {
    for (const hex of ["#7C3AED", "#FFF3B0", "#111111", "#00FF00", "#C2410C"]) {
      for (const theme of ["light", "dark"]) meets(highlightLook({ name: "x", colour: hex }, theme), theme);
    }
  });

  it("keeps a hex that already reads well as the light stroke, and derives the same look twice", () => {
    expect(highlightLook({ name: "x", colour: "#7C3AED" }).stroke).toBe("#7C3AED");
    expect(highlightLook({ name: "x", colour: "#7c3aed" }, "dark")).toEqual(
      highlightLook({ name: "x", colour: "#7C3AED" }, "dark")
    );
  });

  it("is grey and bold when the highlight says nothing, and widens box and arrow by its border", () => {
    const plain = highlightLook({ name: "x" });
    expect(plain).toMatchObject({ ...HIGHLIGHT_COLOURS.grey.light, width: { box: 2, edge: 2 } });
    expect(highlightLook({ name: "x", border: "normal" }).width).toEqual({ box: 1, edge: 1.25 });
    expect(highlightLook({ name: "x", border: "heavy" }).width).toEqual({ box: 3, edge: 3 });
  });
});
