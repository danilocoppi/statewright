import { applyBatch } from "../commands/engine.js";
import { chipWidth, createGeometry, textWidth } from "../layout/geometry.js";
import { autoLayout } from "../layout/index.js";
import { BADGE, EDGE_STYLES, INK, MUTED, RULE, SUB } from "../style/palette.js";
import { documentPageOf } from "./document-page.js";
import { drawChips, edgeMarkers, FONTS, figureHeading, figureOf, markerId, text } from "./figure.js";
import { scenarioPageOf } from "./scenario-page.js";
import { el, esc, num, wrap } from "./svg.js";

const PAD = 24;
const MIN_WIDTH = 520;

/** Legend rows: items flow left to right and wrap at `width`. */
function layoutLegend(legend, badgeCode, width, prefix) {
  const groups = [
    legend.nodes.map(item => ({
      w: 24 + textWidth(item.label, FONTS.legend),
      draw: (x, y) =>
        el("rect", {
          x,
          y: y - 10,
          width: 18,
          height: 13,
          rx: 3,
          fill: item.fill,
          stroke: item.stroke,
          "stroke-dasharray": item.dash
        }) + text(x + 24, y, item.label, FONTS.legend, { fill: SUB })
    })),
    [
      ...legend.edges.map(item => ({
        w: 32 + textWidth(item.label, FONTS.legend),
        draw: (x, y) =>
          el("line", {
            x1: x,
            y1: y - 3.5,
            x2: x + 24,
            y2: y - 3.5,
            stroke: item.stroke,
            "stroke-width": item.width,
            "stroke-dasharray": item.dash,
            "marker-end": `url(#${markerId(prefix, item.key)})`
          }) + text(x + 32, y, item.label, FONTS.legend, { fill: SUB })
      })),
      ...legend.chips.map(item => ({
        w: chipWidth(item.text) + 6 + textWidth(item.label, FONTS.legend),
        draw: (x, y) =>
          drawChips([{ text: item.text, color: MUTED }], x, y - 10) +
          text(x + chipWidth(item.text) + 6, y, item.label, FONTS.legend, { fill: SUB })
      })),
      ...(legend.findings ?
        [
          {
            w: textWidth(badgeCode, FONTS.badge) + 16 + textWidth("Finding", FONTS.legend),
            draw: (x, y) => {
              const w = Math.ceil(textWidth(badgeCode, FONTS.badge)) + 10;
              return (
                el("rect", { x, y: y - 11, width: w, height: 15, rx: 3, fill: BADGE.fill }) +
                text(x + w / 2, y - 0.5, badgeCode, FONTS.badge, { "text-anchor": "middle", fill: BADGE.color }) +
                text(x + w + 6, y, "Finding", FONTS.legend, { fill: SUB })
              );
            }
          }
        ]
      : [])
    ]
  ];
  const rows = [];
  for (const group of groups.filter(items => items.length)) {
    let row = [];
    let used = 0;
    for (const item of group) {
      if (row.length && used + item.w > width) {
        rows.push(row);
        row = [];
        used = 0;
      }
      row.push({ item, x: used });
      used += item.w + 22;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Static SVG of one canvas (spec §15, §20): header (kicker, title, caption), the diagram with chips, status pills,
 * finding badges, lanes, notes and expanded frames, and a legend of the styles actually used. Missing positions are
 * computed with auto-layout (the document is not changed). Deterministic: the same document gives the same bytes.
 * @param {any} doc A valid document.
 * @param {string} canvasId
 * @param {{ header?: boolean, legend?: boolean, idPrefix?: string }} [options] `idPrefix` keeps marker IDs unique
 *   when several SVGs are inlined in one page (default `sw-<canvasId>`).
 * @returns {Promise<string>}
 */
export async function toSVG(
  doc,
  canvasId,
  { header = true, legend: showLegend = true, idPrefix = `sw-${canvasId}` } = {}
) {
  const canvas = doc.canvases[canvasId];
  if (!canvas) throw new Error(`No canvas "${canvasId}"`);
  const commands = await autoLayout(doc, canvasId, { scope: "missing" });
  // Applied to a copy: applying commands to the caller's document would freeze it.
  const working = commands.length ? applyBatch(structuredClone(doc), commands).doc : doc;
  const geometry = createGeometry(working);
  const figure = figureOf(working, canvasId, { idPrefix, geometry });
  const body = figure.bounds;

  const { kicker, title, caption } = figureHeading(canvas);
  const width = Math.ceil(
    Math.max(
      MIN_WIDTH,
      body.w + 2 * PAD,
      header ? textWidth(title, FONTS.title) + 2 * PAD : 0,
      header ? textWidth(kicker, FONTS.kicker) + 2 * PAD : 0
    )
  );
  const captionLines = header && caption ? wrap(caption, width - 2 * PAD, line => textWidth(line, FONTS.caption)) : [];

  const parts = [];
  let y = 0;
  if (header) {
    y = 20;
    if (kicker) {
      parts.push(text(PAD, y + 10, kicker, FONTS.kicker, { fill: MUTED }));
      y += 18;
    }
    parts.push(text(PAD, y + 15, title, FONTS.title, { fill: INK }));
    y += 24;
    captionLines.forEach((line, index) =>
      parts.push(text(PAD, y + 14 + 19 * index, line, FONTS.caption, { fill: SUB }))
    );
    y += captionLines.length * 19 + 16;
  } else {
    y = PAD;
  }
  const dx = PAD + (width - 2 * PAD - body.w) / 2 - body.x;
  const dy = y + 8 - body.y;
  const scenePart = ["regions", "frames", "edges", "labels", "nodes", "lanes", "notes"]
    .flatMap(layer => figure[layer].map(part => part.svg))
    .join("");
  parts.push(el("g", { transform: `translate(${num(dx)} ${num(dy)})` }, scenePart));
  y = dy + body.y + body.h + 20;

  const legend = geometry.style.legend(canvasId);
  const badgeCode = figure.nodes.map(part => geometry.style.node(part.id).badges[0]).find(Boolean) ?? "F1";
  const hasLegend =
    showLegend && (legend.nodes.length || legend.edges.length || legend.chips.length || legend.findings);
  if (hasLegend) {
    const rows = layoutLegend(legend, badgeCode, width - 2 * PAD - 72, idPrefix);
    parts.push(el("line", { x1: PAD, y1: y, x2: width - PAD, y2: y, stroke: RULE }));
    parts.push(text(PAD, y + 24, "LEGEND", FONTS.legendTitle, { fill: MUTED }));
    rows.forEach((row, index) => {
      for (const { item, x } of row) parts.push(item.draw(PAD + 72 + x, y + 24 + 22 * index));
    });
    y += 24 + 22 * rows.length;
  }
  const height = Math.ceil(y + 12);

  const markerKeys = Object.keys(EDGE_STYLES).filter(
    key => figure.edges.some(part => part.key === key) || (hasLegend && legend.edges.some(item => item.key === key))
  );
  const defs = edgeMarkers(markerKeys, { idPrefix });
  return (
    el(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${width} ${height}`,
        width,
        height,
        role: "img",
        "aria-label": title
      },
      el("title", {}, esc(title)) +
        (defs ? el("defs", {}, defs) : "") +
        el("rect", { x: 0.5, y: 0.5, width: width - 1, height: height - 1, rx: 12, fill: "#FFFFFF", stroke: RULE }) +
        parts.join("")
    ) + "\n"
  );
}

/**
 * A scenario as a page anyone can open (simulator spec §7.2): one self-contained HTML file that makes no request — its
 * style, a small script, the fonts when given, one figure per level the scenario visits (`toSVG`, without heading and
 * legend) and its story as data. The story on the left, the figure on the right; ← → step through it, and Present shows
 * the stage layout in full screen. English, the light theme; names and captions as written. Deterministic.
 * @param {any} doc A valid document.
 * @param {string} scenarioId
 * @param {{ fonts?: Array<{ family: string, weight: string, data: string }> }} [options] `fonts`: WOFF2 files in
 *   base64 (`data`), embedded with `@font-face` under `family` and `weight` (a number or a range, `"100 900"`).
 * @returns {Promise<string>}
 */
export function toScenarioPage(doc, scenarioId, { fonts } = {}) {
  return scenarioPageOf(doc, scenarioId, { fonts, render: toSVG });
}

/**
 * The documentation as a page (documentation page spec): the whole project as one self-contained HTML file to read,
 * share or print, saying what the Markdown documentation says — a cover with the project's numbers, the map, every
 * level with its diagram (`toSVG`, with its legend) and its tables, scenarios and findings, the catalog and the
 * findings — with the contents on the left. It makes no request. English, the light theme; names and descriptions as
 * written. Deterministic.
 * @param {any} doc A valid document.
 * @param {{ fonts?: Array<{ family: string, weight: string, data: string }> }} [options] `fonts`: WOFF2 files in
 *   base64 (`data`), embedded with `@font-face` under `family` and `weight`; without them the page uses the system's.
 * @returns {Promise<string>}
 */
export function toDocumentPage(doc, { fonts } = {}) {
  return documentPageOf(doc, { fonts, render: toSVG });
}
