// A highlight's look (highlights spec §3): a palette of ten colours tuned for the light and the dark theme, and any
// `#RRGGBB` derived to the same rules — the stroke reads on the canvas (3:1), a chip's text on its tint (4.5:1).
import { HIGHLIGHT_PALETTE } from "../constants.js";

/** The canvases and the surfaces a tint lies on, per theme. */
const CANVAS = { light: "#FBFBFC", dark: "#121419" };
const SURFACE = { light: "#FFFFFF", dark: "#1A1D24" };
const TINT = 0.12;
const STEPS = 40;

/** Each palette colour's stroke, tint and chip text, per theme. */
export const HIGHLIGHT_COLOURS = Object.freeze({
  red: {
    light: { stroke: "#DC2626", tint: "#FEF2F2", text: "#991B1B" },
    dark: { stroke: "#F87171", tint: "#3A1A1D", text: "#FCA5A5" }
  },
  orange: {
    light: { stroke: "#EA580C", tint: "#FFF7ED", text: "#9A3412" },
    dark: { stroke: "#FB923C", tint: "#3A2414", text: "#FDBA74" }
  },
  amber: {
    light: { stroke: "#B45309", tint: "#FFFBEB", text: "#92400E" },
    dark: { stroke: "#FBBF24", tint: "#3A2E12", text: "#FCD34D" }
  },
  green: {
    light: { stroke: "#15803D", tint: "#F0FDF4", text: "#166534" },
    dark: { stroke: "#4ADE80", tint: "#15301F", text: "#86EFAC" }
  },
  teal: {
    light: { stroke: "#0D9488", tint: "#F0FDFA", text: "#115E59" },
    dark: { stroke: "#2DD4BF", tint: "#12302D", text: "#5EEAD4" }
  },
  blue: {
    light: { stroke: "#2563EB", tint: "#EFF6FF", text: "#1E40AF" },
    dark: { stroke: "#60A5FA", tint: "#172A45", text: "#93C5FD" }
  },
  indigo: {
    light: { stroke: "#4F46E5", tint: "#EEF2FF", text: "#3730A3" },
    dark: { stroke: "#818CF8", tint: "#1E2245", text: "#A5B4FC" }
  },
  violet: {
    light: { stroke: "#7C3AED", tint: "#F5F3FF", text: "#5B21B6" },
    dark: { stroke: "#A78BFA", tint: "#261E45", text: "#C4B5FD" }
  },
  pink: {
    light: { stroke: "#DB2777", tint: "#FDF2F8", text: "#9D174D" },
    dark: { stroke: "#F472B6", tint: "#3A1A2C", text: "#F9A8D4" }
  },
  grey: {
    light: { stroke: "#64748B", tint: "#F1F5F9", text: "#334155" },
    dark: { stroke: "#94A3B8", tint: "#23272F", text: "#CBD5E1" }
  }
});

if (Object.keys(HIGHLIGHT_COLOURS).join() !== HIGHLIGHT_PALETTE.join()) {
  throw new Error("HIGHLIGHT_COLOURS must follow HIGHLIGHT_PALETTE");
}

/** A border's width on a box and on an arrow. */
const WIDTHS = { normal: { box: 1, edge: 1.25 }, bold: { box: 2, edge: 2 }, heavy: { box: 3, edge: 3 } };

const rgbOf = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
const hexOf = rgb =>
  `#${rgb
    .map(channel =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")
    .toUpperCase()}`;
const linear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** WCAG 2 contrast ratio of two `#RRGGBB` colours. */
export function contrast(a, b) {
  const luminance = hex => {
    const [r, g, bl] = rgbOf(hex).map(linear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/** sRGB hex → OKLab [L, a, b]. */
function oklabOf(hex) {
  const [r, g, b] = rgbOf(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}

/** OKLab [L, a, b] → sRGB hex (out-of-gamut channels clipped). */
function hexOfOklab([L, A, B]) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return hexOf(
    [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ].map(gamma)
  );
}

/** Move a colour's lightness (OKLab L) towards `direction` (-1 darker, +1 lighter) until `good` holds. */
function until(hex, direction, good) {
  if (good(hex)) return hex;
  const [L, A, B] = oklabOf(hex);
  for (let step = 1; step <= STEPS; step += 1) {
    const lightness = Math.min(1, Math.max(0, L + (direction * step) / STEPS));
    // Chroma fades towards the ends, so very light or dark values stay in gamut.
    const keep = 1 - Math.abs(lightness - L) * 0.5;
    const found = hexOfOklab([lightness, A * keep, B * keep]);
    if (good(found)) return found;
  }
  return direction < 0 ? "#000000" : "#FFFFFF";
}

const mix = (hex, over, amount) => {
  const top = rgbOf(hex);
  return hexOf(rgbOf(over).map((channel, index) => channel + (top[index] - channel) * amount));
};

const derived = new Map();

/** A hex colour's stroke, tint and text for a theme, to the palette's rules. */
function deriveHex(hex, theme) {
  const key = `${hex}|${theme}`;
  if (derived.has(key)) return derived.get(key);
  const towards = theme === "light" ? -1 : 1;
  const stroke = until(hex, towards, colour => contrast(colour, CANVAS[theme]) >= 3);
  const tint = mix(stroke, SURFACE[theme], TINT);
  const text = until(stroke, towards, colour => contrast(colour, tint) >= 4.5);
  const look = Object.freeze({ stroke, tint, text });
  derived.set(key, look);
  return look;
}

/**
 * What a highlight looks like in a theme: `{ stroke, tint, text, width: { box, edge } }`.
 * @param {{ colour?: string, border?: "normal" | "bold" | "heavy" }} highlight
 * @param {"light" | "dark"} [theme]
 */
export function highlightLook(highlight, theme = "light") {
  const colour = highlight.colour ?? "grey";
  const values = HIGHLIGHT_COLOURS[colour]?.[theme] ?? deriveHex(colour.toUpperCase(), theme);
  return { ...values, width: WIDTHS[highlight.border ?? "bold"] };
}
