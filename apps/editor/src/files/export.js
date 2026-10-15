// Exports (spec §4.5): the current level as an image, the whole project as documentation or as a contract for code
// (source-of-truth spec §5), a scenario as a page (simulator spec §7.2). Always the light theme and Core's own output, so an exported SVG is byte-identical to
// `statewright render`.
import { toAIPack, toMarkdown } from "statewright";

import { APP } from "@/config/app";
import { renderDocumentPage, renderScenarioPage, renderSVG } from "@/lib/render";

import { slug } from "./names";

/** @typedef {{ name: string, type: string, data: string | Blob }} ExportedFile */

const imageName = (doc, canvasId, extension) =>
  `${slug(doc.project.name)}-${slug(doc.canvases[canvasId].name)}.${extension}`;

/** @returns {Promise<ExportedFile>} */
export async function exportSVG(doc, canvasId) {
  return { name: imageName(doc, canvasId, "svg"), type: "image/svg+xml", data: await renderSVG(doc, canvasId) };
}

/** @returns {ExportedFile} */
export function exportMarkdown(doc) {
  return { name: `${slug(doc.project.name)}.md`, type: "text/markdown", data: toMarkdown(doc) };
}

/** The platform guide's raw Markdown, which the AI pack points agents to. */
export function guideUrl(origin = globalThis.location?.origin ?? "") {
  return new URL("README.md", (APP.baseUrl || origin).replace(/\/?$/, "/")).href;
}

/** @returns {ExportedFile} */
/**
 * The design's contract for code, and the Problems that make it ambiguous; Core's contract module loads when it is
 * first asked for, so the editor's first screen does not carry it.
 * @returns {Promise<ExportedFile & { problems: object[] }>}
 */
export async function exportContract(doc) {
  const { stringifyContract, toContract } = await import("statewright/contract");
  const { contract, problems } = await toContract(doc);
  return {
    name: `${slug(doc.project.name)}.contract.json`,
    type: "application/json",
    data: stringifyContract(contract),
    problems
  };
}

export function exportAIPack(doc, { guideUrl: url = guideUrl() } = {}) {
  return { name: `${slug(doc.project.name)}.ai.md`, type: "text/markdown", data: toAIPack(doc, { guideUrl: url }) };
}

function base64(buffer) {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * The bundled fonts as data, for what cannot load them itself: an image, a page that makes no request.
 * @param {Array<{ family: string, weight: string, url: string }>} fonts
 * @param {{ fetch?: typeof fetch }} [env]
 * @returns {Promise<Array<{ family: string, weight: string, data: string }>>} `data`: the WOFF2 file in base64.
 */
export function fontData(fonts, { fetch: load = globalThis.fetch } = {}) {
  return Promise.all(
    fonts.map(async ({ family, weight, url }) => ({
      family,
      weight,
      data: base64(await (await load(url)).arrayBuffer())
    }))
  );
}

/**
 * A copy of an SVG with the fonts embedded, so it rasterizes with the right glyphs (an image cannot use the page's
 * fonts).
 * @param {string} svg
 * @param {Array<{ family: string, weight: string, url: string }>} fonts
 * @param {{ fetch?: typeof fetch }} [env]
 */
export async function svgWithFonts(svg, fonts, env) {
  const faces = (await fontData(fonts, env)).map(
    ({ family, weight, data }) =>
      `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${data}) format('woff2')}`
  );
  return svg.replace(/^(<svg[^>]*>)/, `$1<style>${faces.join("")}</style>`);
}

/**
 * A scenario as a page anyone can open (simulator spec §7.2): Core's page, with the bundled fonts in it, named after
 * the scenario ("verification-pauses-the-clock.html").
 * @param {Array<{ family: string, weight: string, url: string }>} fonts
 * @param {{ fetch?: typeof fetch }} [env]
 * @returns {Promise<ExportedFile>}
 */
export async function exportScenarioPage(doc, scenarioId, fonts, env) {
  const name = doc.annotations?.scenarios?.[scenarioId]?.name;
  const data = await renderScenarioPage(doc, scenarioId, { fonts: await fontData(fonts, env) });
  return { name: `${slug(name)}.html`, type: "text/html", data };
}

/**
 * The documentation as a page (documentation page spec): Core's page, with the bundled fonts in it, named after the
 * project ("payments.html").
 * @param {Array<{ family: string, weight: string, url: string }>} fonts
 * @param {{ fetch?: typeof fetch }} [env]
 * @returns {Promise<ExportedFile>}
 */
export async function exportDocumentPage(doc, fonts, env) {
  const data = await renderDocumentPage(doc, { fonts: await fontData(fonts, env) });
  return { name: `${slug(doc.project.name)}.html`, type: "text/html", data };
}

/**
 * Draw an SVG at `scale` into a PNG (browser only).
 * @param {string} svg
 * @param {number} scale
 * @returns {Promise<Blob>}
 */
export async function rasterize(svg, scale = 2) {
  const [, width, height] = /width="([\d.]+)" height="([\d.]+)"/.exec(svg).map(Number);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("The image could not be drawn"))), "image/png")
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * The current level as a PNG at 2×, with the bundled fonts.
 * @returns {Promise<ExportedFile>}
 */
export async function exportPNG(doc, canvasId, fonts) {
  const svg = await svgWithFonts((await exportSVG(doc, canvasId)).data, fonts);
  return { name: imageName(doc, canvasId, "png"), type: "image/png", data: await rasterize(svg, 2) };
}

/**
 * Put a PNG on the clipboard. Pass the promise of the image without awaiting it first: browsers only allow the write
 * during the click that asked for it.
 * @param {Blob | Promise<Blob>} image
 */
export async function copyImage(image, clipboard = globalThis.navigator?.clipboard) {
  await clipboard.write([new ClipboardItem({ "image/png": image })]);
}
