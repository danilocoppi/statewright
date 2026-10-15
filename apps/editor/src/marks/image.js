// The image of the marks (collaboration spec §5.4): the level's figure as Core draws it — in the same coordinates the
// canvas shows — with the person's marks on it, cropped to them with a margin, at most 1600 px on its longer side.
import { edgeMarkers, figureOf } from "statewright";

import { FONT_FILES } from "@/design/fonts";
import { rasterize, svgWithFonts } from "@/files/export";

import { geometryOf } from "./payload";

/** Around the marks, in the level's units. */
const MARGIN = 48;
/** The image's longest side, and its most detailed scale. */
const LONGEST = 1600;
const SCALE = 2;
/** The marks' colours as an image draws them (it cannot read the page's tokens): the light theme's. */
const HEX = { red: "#b42318", amber: "#b45309", green: "#12805c", neutral: "#05060f" };
const ACCENT = "#0a66c2";
const CHARACTER = 7;

const escape = text =>
  text.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

/** A mark's bounds. */
function boundsOf(mark) {
  if (mark.kind === "stroke") {
    const xs = mark.points.map(([x]) => x);
    const ys = mark.points.map(([, y]) => y);
    return { x: Math.min(...xs), y: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
  }
  if (mark.kind === "label") {
    const [x, y] = mark.at;
    return { x, y: y - 14, right: x + mark.text.length * CHARACTER, bottom: y + 4 };
  }
  const { x, y, width, height } = mark.rect;
  return { x, y, right: x + width, bottom: y + height };
}

/** A mark as SVG. */
function markSvg(mark) {
  const stroke = `stroke="${HEX[mark.colour]}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  if (mark.kind === "stroke")
    return `<polyline ${stroke} points="${mark.points.map(point => point.join(",")).join(" ")}"/>`;
  if (mark.kind === "label") {
    const [x, y] = mark.at;
    return `<text x="${x}" y="${y}" fill="${HEX[mark.colour]}" stroke="#ffffff" stroke-width="4" paint-order="stroke" font-family="Inter, sans-serif" font-size="13" font-weight="600">${escape(mark.text)}</text>`;
  }
  const { x, y, width, height } = mark.rect;
  if (mark.kind === "rectangle")
    return `<rect ${stroke} x="${x}" y="${y}" width="${width}" height="${height}" rx="6"/>`;
  return `<ellipse ${stroke} cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}"/>`;
}

/**
 * The level's figure with its marks, as SVG, and the scale to draw it at; null when the level has no marks.
 * @param {any} doc
 * @param {string} level
 * @param {{ marks: import("./store").Mark[], forAI: Array<{ id: string, level: string }> }} state
 * @returns {{ svg: string, width: number, height: number, scale: number } | null}
 */
export function markedSvg(doc, level, { marks, forAI }) {
  const drawn = marks.filter(mark => mark.level === level);
  const marked = new Set(forAI.filter(item => item.level === level).map(item => item.id));
  const { boxes, regions, lines } = geometryOf(doc, level);
  const rings = [...boxes, ...regions].filter(box => marked.has(box.id));
  const traced = lines.filter(line => marked.has(line.id));
  const all = [
    ...drawn.map(boundsOf),
    ...rings.map(box => ({ x: box.x - 6, y: box.y - 6, right: box.x + box.width + 6, bottom: box.y + box.height + 6 })),
    ...traced.map(line => boundsOf({ kind: "stroke", points: line.points }))
  ];
  if (!all.length) return null;
  const x = Math.min(...all.map(bounds => bounds.x)) - MARGIN;
  const y = Math.min(...all.map(bounds => bounds.y)) - MARGIN;
  const width = Math.ceil(Math.max(...all.map(bounds => bounds.right)) + MARGIN - x);
  const height = Math.ceil(Math.max(...all.map(bounds => bounds.bottom)) + MARGIN - y);
  const figure = figureOf(doc, level, { idPrefix: "marks" });
  const scene = ["regions", "frames", "associations", "edges", "labels", "nodes", "lanes", "notes"]
    .flatMap(layer => figure[layer].map(part => part.svg))
    .join("");
  const ringSvg = [
    ...rings.map(
      box =>
        `<rect x="${box.x - 6}" y="${box.y - 6}" width="${box.width + 12}" height="${box.height + 12}" rx="10" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-dasharray="5 4"/>`
    ),
    ...traced.map(
      line =>
        `<polyline points="${line.points.map(point => point.join(",")).join(" ")}" fill="none" stroke="${ACCENT}" stroke-opacity="0.35" stroke-width="8" stroke-linecap="round"/>`
    )
  ].join("");
  // The arrows' heads, as Core's figure refers to them.
  const markers = edgeMarkers([...new Set(figure.edges.map(part => part.key))], { idPrefix: "marks" });
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" width="${width}" height="${height}">` +
    `<defs>${markers}</defs>` +
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff"/>${scene}${ringSvg}${drawn.map(markSvg).join("")}</svg>`;
  return { svg, width, height, scale: Math.min(SCALE, LONGEST / Math.max(width, height)) };
}

/**
 * The image of the level's marks, as a PNG data URL (browser only); null without marks on the level.
 * @returns {Promise<string | null>}
 */
export async function imageOf(doc, level, state, fonts = FONT_FILES) {
  const drawn = markedSvg(doc, level, state);
  if (!drawn) return null;
  const blob = await rasterize(await svgWithFonts(drawn.svg, fonts), drawn.scale);
  let binary = "";
  for (const byte of new Uint8Array(await blob.arrayBuffer())) binary += String.fromCharCode(byte);
  return `data:image/png;base64,${btoa(binary)}`;
}
