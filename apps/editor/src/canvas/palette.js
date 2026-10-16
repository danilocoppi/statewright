// The diagram's colours (spec §5.3). Core draws with the hex values of its palette; the canvas asks Core to paint each
// one as a CSS variable, defined for the light theme with Core's own value (so the canvas looks like the export) and
// for the dark theme with the same meaning on a dark surface. Dashes, chips and widths never change between themes.
import {
  BADGE,
  EDGE_STYLES,
  HIGHLIGHT_COLOURS,
  highlightLook,
  INK,
  MUTED,
  NODE_STYLES,
  NOTE_TONES,
  RULE,
  SUB,
  TONES
} from "statewright";

/** Dark value of every colour of Core's palette, by its light value. */
export const DARK = {
  // Surfaces and text
  "#FFFFFF": "#3B414F",
  "#05060F": "#E8EAEF",
  "#464849": "#A9AFBA",
  "#878E91": "#8D94A0",
  "#E6E7EE": "#2A2F38",
  // Plain boxes and default edges
  "#3B3F4A": "#A9B0BD",
  "#5B6170": "#A6ADB9",
  // Happy path, focus, proposed, info
  "#0A66C2": "#73B0FF",
  "#EEF4FB": "#264366",
  "#E8F0FB": "#244268",
  // Failure
  "#B42318": "#FA8F88",
  "#FEF3F2": "#68312B",
  "#FEE4E2": "#673036",
  // Success
  "#059669": "#34D399",
  "#047857": "#34D399",
  "#ECFDF5": "#1C493B",
  // Ops, hold, warning
  "#B45309": "#F5A524",
  "#FFFBEB": "#4F3F22",
  "#92400E": "#FCD34D",
  "#FEF3C7": "#4F3F1D",
  // Defect, implied
  "#BE123C": "#FC8C9C",
  "#E11D48": "#FB7185",
  "#FFF1F2": "#6C2D3C",
  // Legacy, frame
  "#B9BDC9": "#6E7584",
  "#FAFBFD": "#16191E",
  // Waiting, stopped, external, store, neutral
  "#F6F7FA": "#3B414E",
  "#6B7280": "#A6ACB7",
  "#F3F4F6": "#3B424E",
  "#4B5563": "#C3C8D1",
  "#FAFAFC": "#3B4150",
  "#F3F5F9": "#3A4151"
};

// The highlights' palette (highlights spec §3) brings its own dark values; a colour the diagram already uses keeps its
// meaning's dark value.
for (const { light, dark } of Object.values(HIGHLIGHT_COLOURS)) {
  for (const role of ["stroke", "tint", "text"]) DARK[light[role]] ??= dark[role];
}

const variable = color => `--sw-${color.slice(1).toLowerCase()}`;

/** How the canvas asks Core to paint a colour: `paint("#0A66C2")` is `var(--sw-0a66c2)`. */
export const paint = color => `var(${variable(color)})`;

/** Every colour Core draws with. */
const PALETTE = [
  ...new Set(
    [
      INK,
      SUB,
      MUTED,
      RULE,
      "#FFFFFF",
      BADGE.fill,
      BADGE.color,
      ...Object.values(NODE_STYLES).flatMap(style => [style.fill, style.stroke]),
      ...Object.values(EDGE_STYLES).map(style => style.stroke),
      ...Object.values(TONES).flatMap(tone => [tone.color, tone.fill]),
      ...Object.values(NOTE_TONES).flatMap(tone => [tone.color, tone.fill]),
      ...Object.values(HIGHLIGHT_COLOURS).flatMap(({ light }) => [light.stroke, light.tint, light.text])
    ].map(color => color.toUpperCase())
  )
];

/** The CSS that defines the variables: Core's values on `:root`, the dark ones under `.dark`. */
export function diagramStyles() {
  const block = (selector, valueOf) =>
    `${selector} {\n${PALETTE.map(color => `  ${variable(color)}: ${valueOf(color)};`).join("\n")}\n}`;
  // A label's backing hides the edge under it: in dark it is the canvas, not the boxes' lighter surface.
  const label = [".dark g.label > rect", ".dark g.association > rect"]
    .map(selector => `${selector} {\n  fill: var(--canvas);\n}`)
    .join("\n");
  // A finding badge's code is white on rose in the export; in dark the rose is light, so the code takes the canvas.
  const badge = ".dark g.badge > text {\n  fill: var(--canvas);\n}";
  return `${block(":root", color => color)}\n${block(".dark", color => DARK[color])}\n${label}\n${badge}\n`;
}

const known = new Set(PALETTE);

/**
 * The CSS of the open document's hex highlights (highlights spec §4): each colour Core draws them with, defined with
 * its light value and, under `.dark`, the value Core derives for the dark theme. Palette highlights need none.
 * @param {any} doc
 */
export function highlightStyles(doc) {
  const light = new Map();
  const dark = new Map();
  for (const highlight of Object.values(doc?.catalog?.highlights ?? {})) {
    if (!highlight.colour?.startsWith("#")) continue;
    const day = highlightLook(highlight, "light");
    const night = highlightLook(highlight, "dark");
    for (const role of ["stroke", "tint", "text"]) {
      if (known.has(day[role]) || light.has(day[role])) continue;
      light.set(day[role], day[role]);
      dark.set(day[role], night[role]);
    }
  }
  if (!light.size) return "";
  const block = (selector, values) =>
    `${selector} {\n${[...values].map(([color, value]) => `  ${variable(color)}: ${value};`).join("\n")}\n}`;
  return `${block(":root", light)}\n${block(".dark", dark)}\n`;
}

/** The arrowhead keys of highlights (Core names them after their colour): the palette's, and the document's hex ones. */
export const highlightMarkers = doc => [
  ...new Set([
    ...Object.values(HIGHLIGHT_COLOURS).map(({ light }) => `highlight.${light.stroke.slice(1)}`),
    ...Object.values(doc?.catalog?.highlights ?? {})
      .filter(highlight => highlight.colour?.startsWith("#"))
      .map(highlight => `highlight.${highlightLook(highlight).stroke.slice(1)}`)
  ])
];
