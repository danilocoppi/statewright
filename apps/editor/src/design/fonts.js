// The app bundles its fonts (spec E8): no third-party requests, and the same files are embedded into exported PNGs.
// The family names are exactly the ones Core's SVG uses ('Inter', 'Geist Mono'), so diagrams pick them up.
import interUrl from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import mono400Url from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2?url";
import mono500Url from "@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2?url";
import mono600Url from "@fontsource/geist-mono/files/geist-mono-latin-600-normal.woff2?url";

/** @type {Array<{ family: string, weight: string, url: string }>} Latin covers English, Portuguese and Spanish. */
export const FONT_FILES = [
  { family: "Inter", weight: "100 900", url: interUrl },
  { family: "Geist Mono", weight: "400", url: mono400Url },
  { family: "Geist Mono", weight: "500", url: mono500Url },
  { family: "Geist Mono", weight: "600", url: mono600Url }
];

/** Register the fonts with the page (they load when first used). */
export function registerFonts(fonts = document.fonts) {
  for (const { family, weight, url } of FONT_FILES) {
    fonts.add(new FontFace(family, `url("${url}") format("woff2")`, { weight, style: "normal", display: "swap" }));
  }
}
