import { homeKind, isGuest } from "../roles/kinds.js";
import { createStyle, displayOf as displayOfNode, stepText } from "../style/index.js";

// Advance widths of Inter (regular and semibold) for the printable ASCII characters, in thousandths of an em.
// They let the layout size boxes the way browsers will draw them, without a DOM; other characters count as 0.6 em.
const INTER_400 = [
  281, 288, 466, 633, 642, 982, 644, 300, 365, 365, 501, 662, 288, 460, 288, 360, 631, 407, 610, 618, 646, 593, 620,
  566, 619, 620, 288, 302, 662, 662, 662, 511, 966, 690, 654, 730, 722, 601, 590, 746, 743, 269, 571, 672, 565, 903,
  753, 765, 639, 765, 644, 642, 646, 744, 690, 985, 682, 679, 629, 365, 360, 365, 471, 456, 323, 562, 612, 571, 612,
  583, 370, 613, 591, 242, 242, 549, 242, 876, 591, 600, 612, 612, 376, 528, 327, 591, 562, 818, 546, 562, 552, 426,
  333, 426, 662
];
const INTER_600 = [
  252, 321, 523, 644, 650, 1004, 663, 326, 373, 373, 540, 673, 319, 465, 319, 379, 660, 423, 623, 636, 666, 612, 640,
  576, 640, 640, 319, 329, 673, 673, 673, 543, 999, 728, 659, 737, 722, 605, 588, 749, 746, 277, 580, 703, 565, 922,
  759, 769, 645, 773, 652, 650, 660, 736, 728, 1020, 720, 713, 652, 373, 379, 373, 481, 469, 351, 574, 624, 583, 624,
  591, 389, 625, 612, 262, 262, 569, 262, 900, 612, 609, 624, 624, 397, 549, 353, 612, 587, 839, 569, 588, 566, 455,
  359, 455, 673
];

/**
 * Width in pixels of a text line: Inter (weight 400 or 600) or a monospace font (0.6 em per character, as Geist Mono).
 * @param {string} text
 * @param {{ size: number, weight?: number, mono?: boolean, spacing?: number }} font `spacing` is letter spacing in em.
 */
export function textWidth(text, { size, weight = 400, mono = false, spacing = 0 }) {
  const table = weight >= 600 ? INTER_600 : INTER_400;
  let units = 0;
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    units +=
      mono ? 600
      : code >= 32 && code < 127 ? table[code - 32]
      : 600;
    units += spacing * 1000;
  }
  return (units / 1000) * size;
}

/** Words a summary line breaks between: a separator (· → | / – —) stays with the word before it. */
function wordsOf(paragraph) {
  const words = [];
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    if (words.length && /^[·→|/–—]$/.test(word)) words[words.length - 1] += ` ${word}`;
    else words.push(word);
  }
  return words;
}

/** Lines of a paragraph, broken between words so each fits `width` (a word wider than that has its own line). */
function wrapWords(paragraph, width, font) {
  const lines = [];
  let line = "";
  for (const word of wordsOf(paragraph)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(candidate, font) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  return [...lines, line];
}

/** Box metrics shared by the layout and the renderer. */
export const BOX = {
  minWidth: 140,
  minHeight: 48,
  pad: 8,
  stack: 8,
  maxAspect: 1.5,
  name: { size: 12, weight: 600 },
  summary: { size: 10, mono: true },
  chip: { size: 8, mono: true, spacing: 0.06 },
  pill: { size: 8.5, mono: true },
  label: { size: 10, mono: true },
  lineHeight: 13,
  chipHeight: 13,
  chipTop: 7,
  framePad: 16,
  frameTab: 28
};

/** Fixed sizes of pseudo-node shapes. */
const SHAPE_SIZES = { dot: [12, 12], end: [18, 18], history: [24, 24], bar: [8, 40] };

/** Widest line of an edge label: 32 characters. */
const LABEL_WIDTH = 32 * 0.6 * BOX.label.size;

/**
 * Lines of an edge label: long labels put each trigger on its own line, and wrap at words to 32 characters, so a
 * long label does not stretch its edge.
 */
export function labelLines(text) {
  if (!text) return [];
  const triggers = text.length <= 32 || !text.includes(" | ") ? [text] : text.split(" | ");
  return triggers.flatMap(trigger => wrapWords(trigger, LABEL_WIDTH, BOX.label));
}

/** Size of an edge label's backing box. */
export function labelSize(text) {
  const lines = labelLines(text);
  if (!lines.length) return null;
  const width = Math.max(...lines.map(line => textWidth(line, BOX.label)));
  return { w: Math.ceil(width + 8), h: 12 * lines.length + 3, lines };
}

/** Width of a chip (derived chips and tags, top-left). */
export const chipWidth = text => Math.ceil(textWidth(text, BOX.chip) + 10);

/** Width of a status pill (top-right). */
export const pillWidth = text => Math.ceil(textWidth(text, BOX.pill) + 12);

/**
 * Sizes and texts of the boxes of one document, shared by auto-layout, overlap checks and rendering.
 * @param {any} doc
 * @param {{ style?: ReturnType<typeof createStyle> }} [options]
 */
export function createGeometry(doc, { style = createStyle(doc) } = {}) {
  const placed = canvasId => doc.layout?.canvases?.[canvasId]?.nodes ?? {};
  const boxes = new Map();
  const interiors = new Map();

  /** Display of a node with an interior: "node", "card" or "frame" (stored layout; default node, embedded steps frame). */
  const displayOf = (canvasId, nodeId) => displayOfNode(doc, canvasId, nodeId);

  /** Name line of a box: label, name, or what the step does. */
  function title(canvasId, nodeId) {
    const node = doc.canvases[canvasId].nodes[nodeId];
    if (node.label ?? node.name) return node.label ?? node.name;
    if (node.kind === "ref") {
      const target = doc.canvases[node.target] ?? findValue(node.target);
      return `↗ ${target?.name ?? node.target}`;
    }
    if (node.kind === "if" || node.kind === "while") {
      const condition = node.condition;
      return condition?.text ?? (condition?.guard ? doc.catalog.guards[condition.guard]?.name : null) ?? node.kind;
    }
    if (node.kind === "any") return "any";
    const canvasKind = doc.canvases[canvasId].kind;
    const home = homeKind(canvasKind, node);
    return home === "flow" || isGuest(canvasKind, node) ? stepText(doc, node) : node.kind;
  }

  function findValue(id) {
    for (const canvas of Object.values(doc.canvases)) if (canvas.nodes[id]) return canvas.nodes[id];
    for (const collection of Object.values(doc.catalog)) if (collection[id]) return collection[id];
    return doc.definitions[id];
  }

  /** Paragraphs of a box's summary: the node summary's lines, plus the interior summary on a card. */
  function paragraphs(canvasId, nodeId) {
    const node = doc.canvases[canvasId].nodes[nodeId];
    const lines = node.summary ? node.summary.split("\n") : [];
    // A state guest says which machine its state belongs to (mixed levels spec §4.4).
    if (doc.canvases[canvasId].kind === "flow" && node.kind === "state") {
      const machine = Object.values(doc.canvases).find(
        canvas => canvas.kind === "machine" && canvas.nodes[node.target]?.kind === "state"
      );
      if (machine) lines.push(machine.name);
    }
    if (displayOf(canvasId, nodeId) === "card") {
      const card = style.cardSummary(nodeId);
      if (card) lines.push(card);
    }
    return lines;
  }

  /**
   * Summary lines of a box: its paragraphs, wrapped at word breaks within a box `width` wide (inside its margin);
   * unwrapped without a width.
   */
  function summaryLines(canvasId, nodeId, width) {
    const lines = paragraphs(canvasId, nodeId);
    if (width === undefined || !lines.length) return lines;
    return lines.flatMap(line => wrapWords(line, width - 2 * BOX.pad, BOX.summary));
  }

  /** Lines of the text under a diamond (a choice's label, or a flow step's question), wrapped at 32 characters. */
  function diamondLines(canvasId, nodeId) {
    const node = doc.canvases[canvasId].nodes[nodeId];
    const text = node.kind === "choice" ? (node.label ?? node.name ?? "") : title(canvasId, nodeId);
    return text ? wrapWords(text, LABEL_WIDTH, BOX.summary) : [];
  }

  /**
   * Bounding box of a canvas drawn inside a frame: its stored node positions and sizes. Null when nothing is placed.
   * @returns {{ x: number, y: number, w: number, h: number } | null}
   */
  function interiorBox(canvasId, seen = new Set()) {
    if (interiors.has(canvasId)) return interiors.get(canvasId);
    if (seen.has(canvasId)) return null;
    seen.add(canvasId);
    const positions = placed(canvasId);
    let box = null;
    for (const nodeId of Object.keys(doc.canvases[canvasId]?.nodes ?? {})) {
      const at = positions[nodeId];
      if (!at) continue;
      const { w, h } = size(canvasId, nodeId, seen);
      const right = Math.max(box ? box.x + box.w : -Infinity, at.x + w);
      const bottom = Math.max(box ? box.y + box.h : -Infinity, at.y + h);
      const x = Math.min(box?.x ?? Infinity, at.x);
      const y = Math.min(box?.y ?? Infinity, at.y);
      box = { x, y, w: right - x, h: bottom - y };
    }
    interiors.set(canvasId, box);
    return box;
  }

  /**
   * Size of a node's box. Stored `w`/`h` win; frames wrap their interior; other shapes size to their content.
   * @returns {{ w: number, h: number }}
   */
  function size(canvasId, nodeId, seen = new Set()) {
    const key = `${canvasId}/${nodeId}`;
    if (boxes.has(key)) return boxes.get(key);
    const stored = placed(canvasId)[nodeId];
    const nodeStyle = style.node(nodeId);
    let result;
    if (SHAPE_SIZES[nodeStyle.shape]) {
      const [w, h] = SHAPE_SIZES[nodeStyle.shape];
      result = { w, h };
    } else if (nodeStyle.shape === "diamond") {
      const lines = diamondLines(canvasId, nodeId);
      const widest = Math.max(0, ...lines.map(line => textWidth(line, BOX.summary)));
      result = {
        w: Math.max(32, Math.ceil(widest) + 8),
        h: lines.length ? 50 + BOX.lineHeight * (lines.length - 1) : 32
      };
    } else if (displayOf(canvasId, nodeId) === "frame") {
      const inner = interiorBox(nodeStyle.interior, seen);
      result = {
        w: Math.max(BOX.minWidth, (inner?.w ?? 120) + 2 * BOX.framePad),
        h: (inner?.h ?? 48) + BOX.framePad + BOX.frameTab
      };
    } else if (nodeStyle.shape === "any") {
      result = { w: Math.ceil(textWidth("from any state", BOX.summary)) + 24, h: 26 };
    } else {
      const chipsRow = nodeStyle.chips.reduce((sum, chip) => sum + chipWidth(chip.text) + 4, 0);
      const pillsRow = nodeStyle.statuses.reduce((sum, pill) => sum + pillWidth(pill.text) + 4, 0);
      const paragraphsOf = paragraphs(canvasId, nodeId);
      const words = paragraphsOf.flatMap(wordsOf);
      const top = chipsRow || pillsRow ? 22 : BOX.pad;
      const fit = text => Math.ceil(text + 2 * BOX.pad);
      const narrowest = Math.max(
        BOX.minWidth,
        fit(textWidth(title(canvasId, nodeId), BOX.name)),
        ...words.map(word => fit(textWidth(word, BOX.summary))),
        Math.ceil(chipsRow + pillsRow + 16)
      );
      const widest = Math.max(narrowest, ...paragraphsOf.map(line => fit(textWidth(line, BOX.summary))));
      const heightAt = width => {
        const count = summaryLines(canvasId, nodeId, width).length;
        return Math.max(BOX.minHeight, top + 14 + (count ? 4 + BOX.lineHeight * count : 0) + BOX.pad);
      };
      // The widest box no wider than 3:2: narrower boxes wrap the summary onto more lines, so they grow taller.
      let width = widest;
      if (width > BOX.maxAspect * heightAt(width)) {
        let [low, high] = [narrowest, widest];
        while (low < high) {
          const middle = Math.ceil((low + high) / 2);
          if (middle <= BOX.maxAspect * heightAt(middle)) low = middle;
          else high = middle - 1;
        }
        width = low;
      }
      result = { w: width, h: heightAt(width) };
      // A level inside stacks two cards behind the box: they are part of its room, so edges end on what is drawn.
      if (nodeStyle.interior) result = { w: result.w + BOX.stack, h: result.h + BOX.stack };
    }
    if (stored?.w !== undefined) result = { ...result, w: stored.w };
    if (stored?.h !== undefined) result = { ...result, h: stored.h };
    boxes.set(key, result);
    return result;
  }

  return { doc, style, size, title, summaryLines, diamondLines, displayOf, interiorBox };
}
