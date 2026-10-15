// The diagram's colours (spec §5.3). Core draws with the hex values of its palette; the canvas asks Core to paint each
// one as a CSS variable, defined for the light theme with Core's own value (so the canvas looks like the export) and
// for the dark theme with the same meaning on a dark surface. Dashes, chips and widths never change between themes.
import { BADGE, EDGE_STYLES, INK, MUTED, NODE_STYLES, NOTE_TONES, RULE, SUB, TONES } from "statewright";

/** Dark value of every colour of Core's palette, by its light value. */
export const DARK = {
  // Surfaces and text
  "#FFFFFF": "#262A33",
  "#05060F": "#E8EAEF",
  "#464849": "#A9AFBA",
  "#878E91": "#8B929E",
  "#E6E7EE": "#2A2F38",
  // Plain boxes and default edges
  "#3B3F4A": "#9AA1AE",
  "#5B6170": "#8C93A1",
  // Happy path, focus, proposed, info
  "#0A66C2": "#5AA2FF",
  "#EEF4FB": "#1A2D45",
  "#E8F0FB": "#1A2F4A",
  // Failure
  "#B42318": "#F97066",
  "#FEF3F2": "#44201C",
  "#FEE4E2": "#3F1D21",
  // Success
  "#059669": "#34D399",
  "#047857": "#34D399",
  "#ECFDF5": "#15362C",
  // Ops, hold, warning
  "#B45309": "#F5A524",
  "#FFFBEB": "#362B17",
  "#92400E": "#FCD34D",
  "#FEF3C7": "#3A2E15",
  // Defect, implied
  "#BE123C": "#FB7185",
  "#E11D48": "#FB7185",
  "#FFF1F2": "#441C26",
  // Legacy, frame
  "#B9BDC9": "#565D6A",
  "#FAFBFD": "#16191E",
  // Waiting, stopped, external, store, neutral
  "#F6F7FA": "#282C35",
  "#6B7280": "#9CA3AF",
  "#F3F4F6": "#2C313A",
  "#4B5563": "#C3C8D1",
  "#FAFAFC": "#262A34",
  "#F3F5F9": "#262B35"
};

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
      ...Object.values(NOTE_TONES).flatMap(tone => [tone.color, tone.fill])
    ].map(color => color.toUpperCase())
  )
];

/** The CSS that defines the variables: Core's values on `:root`, the dark ones under `.dark`. */
export function diagramStyles() {
  const block = (selector, valueOf) =>
    `${selector} {\n${PALETTE.map(color => `  ${variable(color)}: ${valueOf(color)};`).join("\n")}\n}`;
  // A label's backing hides the edge under it: in dark it is the canvas, not the boxes' lighter surface.
  const label = ".dark g.label > rect {\n  fill: var(--canvas);\n}";
  return `${block(":root", color => color)}\n${block(".dark", color => DARK[color])}\n${label}\n`;
}
