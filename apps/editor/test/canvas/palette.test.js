import { BADGE, EDGE_STYLES, INK, MUTED, NODE_STYLES, NOTE_TONES, RULE, SUB, TONES } from "statewright";
import { describe, expect, it } from "vitest";

import { DARK, diagramStyles, paint } from "@/canvas/palette";

/** The canvas behind the diagram (globals.css: --color-canvas). */
const CANVAS = { light: "#FBFBFC", dark: "#121419" };
const WHITE = "#FFFFFF";

/** Variables of one theme block of the generated CSS, by colour. */
function variables(css, selector) {
  const block = css.match(new RegExp(`${selector.replace(".", "\\.")}\\s*{([^}]*)}`))[1];
  return Object.fromEntries(
    [...block.matchAll(/--sw-([0-9a-f]{6}):\s*(#[0-9A-F]{6})/g)].map(([, key, value]) => [key, value])
  );
}

const luminance = hex => {
  const [r, g, b] = [1, 3, 5]
    .map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** Every text Core draws, as [what, text colour, background] — "canvas" is the page behind the figure. */
const TEXTS = [
  ...Object.entries(NODE_STYLES).flatMap(([key, style]) => [
    [`name on ${key}`, INK, style.fill],
    [`summary on ${key}`, SUB, style.fill],
    [`chip on ${key}`, style.stroke, style.fill],
    [`muted chip on ${key}`, MUTED, style.fill]
  ]),
  ...Object.entries(TONES).map(([key, tone]) => [`${key} tag or status`, tone.color, tone.fill]),
  // An edge label is backed by the canvas in dark (white, the light canvas, in the export).
  ...Object.entries(EDGE_STYLES).map(([key, style]) => [`${key} label`, style.stroke, "canvas"]),
  ...Object.entries(NOTE_TONES).flatMap(([key, tone]) => [
    [`${key} note`, tone.color, tone.fill],
    [`${key} note under a label`, tone.color, "canvas"]
  ]),
  ["region and lane captions", MUTED, "canvas"],
  ["frame tab", SUB, WHITE],
  ["diamond label", SUB, "canvas"]
];

describe("the diagram palette", () => {
  it("paints Core's colours as CSS variables", () => {
    expect(paint("#0A66C2")).toBe("var(--sw-0a66c2)");
    expect(paint("#ffffff")).toBe("var(--sw-ffffff)");
  });

  it("gives every colour of Core's palette its own value in light and a value in dark", () => {
    const css = diagramStyles();
    const light = variables(css, ":root");
    const dark = variables(css, ".dark");
    const palette = [
      INK,
      SUB,
      MUTED,
      RULE,
      WHITE,
      BADGE.fill,
      BADGE.color,
      ...Object.values(NODE_STYLES).flatMap(style => [style.fill, style.stroke]),
      ...Object.values(EDGE_STYLES).map(style => style.stroke),
      ...Object.values(TONES).flatMap(tone => [tone.color, tone.fill]),
      ...Object.values(NOTE_TONES).flatMap(tone => [tone.color, tone.fill])
    ];
    for (const color of palette) {
      const key = color.slice(1).toLowerCase();
      expect(light[key], color).toBe(color.toUpperCase());
      expect(dark[key], color).toBe(DARK[color.toUpperCase()]);
    }
  });

  it("keeps the meaning colours of spec §5.3 in dark", () => {
    expect(DARK["#FFFFFF"]).toBe("#3B414F");
    expect(DARK["#0A66C2"]).toBe("#73B0FF");
    expect(DARK["#B42318"]).toBe("#FA8F88");
    expect(DARK["#059669"]).toBe("#34D399");
    expect(DARK["#B45309"]).toBe("#F5A524");
    expect(DARK["#BE123C"]).toBe("#FC8C9C");
    expect(DARK["#878E91"]).toBe("#8D94A0");
  });

  it("lifts every box off the dark canvas, the plain ones and the tinted ones", () => {
    const fills = [...new Set(Object.values(NODE_STYLES).map(style => style.fill.toUpperCase()))].filter(
      fill => fill !== "#FAFBFD"
    );
    // Every box stands well off the canvas (the meaning colours are lifted just enough to stay legible on them).
    expect(fills.filter(fill => contrast(DARK[fill], CANVAS.dark) < 1.75)).toEqual([]);
  });

  it("writes a finding badge's code in the canvas colour in dark, legible on its rose", () => {
    expect(diagramStyles()).toContain(".dark g.badge > text {\n  fill: var(--canvas);\n}");
    expect(contrast(CANVAS.dark, DARK[BADGE.fill.toUpperCase()])).toBeGreaterThanOrEqual(4.5);
  });

  it("backs an edge's label with the canvas in dark, so a lighter box colour does not show behind it", () => {
    expect(diagramStyles()).toContain(".dark g.label > rect {\n  fill: var(--canvas);\n}");
    expect(diagramStyles()).toContain(".dark g.association > rect {\n  fill: var(--canvas);\n}");
  });

  it("keeps every text at least as legible in dark as in the exported figure, up to AA", () => {
    const behind = (background, theme) =>
      background === "canvas" ? CANVAS[theme]
      : theme === "light" ? background.toUpperCase()
      : DARK[background.toUpperCase()];
    const below = TEXTS.filter(([, text, background]) => {
      const light = contrast(text.toUpperCase(), behind(background, "light"));
      const dark = contrast(DARK[text.toUpperCase()], behind(background, "dark"));
      return dark < Math.min(4.5, light);
    }).map(([what]) => what);
    expect(below).toEqual([]);
  });
});
