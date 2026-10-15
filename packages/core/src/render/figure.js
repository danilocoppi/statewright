import { BOX, chipWidth, createGeometry, labelSize, pillWidth, textWidth } from "../layout/geometry.js";
import {
  BADGE,
  EDGE_STYLES,
  INK,
  MONO,
  MUTED,
  NODE_STYLES,
  NOTE_TONES,
  ROLE_STYLES,
  RULE,
  SANS,
  SUB,
  TONES
} from "../style/palette.js";
import { associationsOf } from "../roles/index.js";
import { el, esc, num, pathData, wrap } from "./svg.js";

/** Fonts of the figure's own texts (box texts use BOX). */
export const FONTS = {
  kicker: { size: 10.5, mono: true, spacing: 0.14 },
  title: { size: 15.5, weight: 600 },
  caption: { size: 13 },
  legend: { size: 11 },
  legendTitle: { size: 9, mono: true, spacing: 0.14 },
  caps: { size: 9.5, mono: true, spacing: 0.14 },
  note: { size: 11 },
  badge: { size: 8.5, mono: true, weight: 600 }
};
const NOTE_WIDTH = 220;
const MAX_DEPTH = 6;
const WHITE = "#FFFFFF";
const identity = color => color;

const sortedKeys = map => Object.keys(map ?? {}).sort();
const center = rect => [rect.x + rect.w / 2, rect.y + rect.h / 2];
export const markerId = (prefix, key) => `${prefix}-m-${key.replace(/\./g, "-")}`;
const fontAttrs = (font, extra = {}) => ({
  "font-family": font.mono ? MONO : SANS,
  "font-size": font.size,
  "font-weight": font.weight && font.weight !== 400 ? font.weight : undefined,
  "letter-spacing": font.spacing ? `${font.spacing}em` : undefined,
  ...extra
});
export const text = (x, y, content, font, extra) => el("text", { x, y, ...fontAttrs(font, extra) }, esc(content));

/** Orthogonal route between two boxes when the layout stores none (or a loop above a box for a self-edge). */
function fallbackRoute(a, b, self) {
  if (self) {
    const x = a.x + a.w / 2;
    return [
      [x - 12, a.y],
      [x - 12, a.y - 22],
      [x + 12, a.y - 22],
      [x + 12, a.y]
    ];
  }
  const [ax, ay] = center(a);
  const [bx, by] = center(b);
  if (Math.abs(bx - ax) >= Math.abs(by - ay)) {
    const sx = bx > ax ? a.x + a.w : a.x;
    const tx = bx > ax ? b.x : b.x + b.w;
    const mx = (sx + tx) / 2;
    return [
      [sx, ay],
      [mx, ay],
      [mx, by],
      [tx, by]
    ];
  }
  const sy = by > ay ? a.y + a.h : a.y;
  const ty = by > ay ? b.y : b.y + b.h;
  const my = (sy + ty) / 2;
  return [
    [ax, sy],
    [ax, my],
    [bx, my],
    [bx, ty]
  ];
}

/** The point halfway along a polyline. */
function midpoint(points) {
  const lengths = points.slice(1).map(([x, y], index) => Math.hypot(x - points[index][0], y - points[index][1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] && lengths[index] > 0) {
      const t = remaining / lengths[index];
      const [x1, y1] = points[index];
      const [x2, y2] = points[index + 1];
      return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
    }
    remaining -= lengths[index];
  }
  return points[0];
}

/** Bounding box of rectangles and points. */
export function bounds(items) {
  let box = null;
  for (const { x, y, w = 0, h = 0 } of items) {
    if (!box) box = { x, y, right: x + w, bottom: y + h };
    else {
      box.x = Math.min(box.x, x);
      box.y = Math.min(box.y, y);
      box.right = Math.max(box.right, x + w);
      box.bottom = Math.max(box.bottom, y + h);
    }
  }
  return box ?? { x: 0, y: 0, right: 0, bottom: 0 };
}

/**
 * Everything drawn on one figure, in canvas coordinates: the canvas and, recursively, interiors displayed as frames.
 * `within` is the path of frame nodes an item is drawn inside (empty on the figure's own canvas).
 */
function buildScene(doc, geometry, canvasId) {
  const style = geometry.style;
  const scene = {
    regions: [],
    frames: [],
    edges: [],
    labels: [],
    badges: [],
    nodes: [],
    lanes: [],
    notes: [],
    unplaced: []
  };
  const rectsById = new Map();
  const labelsById = new Map();

  function place(id, dx, dy, depth, seen, within) {
    if (seen.has(id)) return;
    const visiting = new Set(seen).add(id);
    const canvas = doc.canvases[id];
    const stored = doc.layout?.canvases?.[id] ?? {};
    const rects = new Map();
    for (const nodeId of sortedKeys(canvas.nodes)) {
      const at = stored.nodes?.[nodeId];
      if (!at) {
        scene.unplaced.push(nodeId);
        continue;
      }
      const rect = { x: at.x + dx, y: at.y + dy, ...geometry.size(id, nodeId) };
      rects.set(nodeId, rect);
      rectsById.set(nodeId, rect);
    }
    for (const [regionId, region] of Object.entries(canvas.regions ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))) {
      const members = [...rects].filter(([nodeId]) => canvas.nodes[nodeId].region === regionId).map(([, rect]) => rect);
      if (!members.length) continue;
      const box = bounds(members);
      scene.regions.push({
        regionId,
        canvasId: id,
        within,
        name: region.name,
        x: box.x - 12,
        y: box.y - 26,
        w: box.right - box.x + 24,
        h: box.bottom - box.y + 38
      });
    }
    for (const [nodeId, rect] of rects) {
      const interior = style.node(nodeId).interior;
      if (geometry.displayOf(id, nodeId) === "frame" && depth < MAX_DEPTH && !visiting.has(interior)) {
        scene.frames.push({ canvasId: id, nodeId, rect, within });
        const box = geometry.interiorBox(interior);
        if (box) {
          place(interior, rect.x + BOX.framePad - box.x, rect.y + BOX.frameTab - box.y, depth + 1, visiting, [
            ...within,
            nodeId
          ]);
        } else {
          scene.unplaced.push(...sortedKeys(doc.canvases[interior].nodes));
        }
      } else {
        scene.nodes.push({ canvasId: id, nodeId, rect, within });
      }
    }
    for (const edgeId of sortedKeys(canvas.edges)) {
      const edge = canvas.edges[edgeId];
      const from = rects.get(edge.from);
      const to = rects.get(edge.to);
      if (!from || !to) continue;
      const route = stored.edges?.[edgeId];
      const points =
        route?.points?.length >= 2 ?
          route.points.map(([x, y]) => [x + dx, y + dy])
        : fallbackRoute(from, to, edge.from === edge.to);
      const edgeStyle = style.edge(edgeId);
      scene.edges.push({ edgeId, canvasId: id, within, from: edge.from, to: edge.to, points, style: edgeStyle });
      const size = labelSize(style.edgeLabel(edgeId));
      if (size) {
        const [x, y] = route?.labelAt ? [route.labelAt[0] + dx, route.labelAt[1] + dy] : midpoint(points);
        const label = {
          edgeId,
          canvasId: id,
          within,
          x: x - size.w / 2,
          y: y - size.h / 2,
          w: size.w,
          h: size.h,
          lines: size.lines,
          color: edgeStyle.stroke
        };
        scene.labels.push(label);
        labelsById.set(edgeId, label);
      }
      // An edge's findings: their badge under its label, or under the middle of its route.
      if (edgeStyle.badges.length) {
        const label = labelsById.get(edgeId);
        const [middle, top] = label ? [label.x + label.w / 2, label.y + label.h + 2] : midpoint(points);
        const w = badgeWidth(edgeStyle.badges);
        // Below the label, or 9 under the route's middle, clear of the Editor's Problems marker there.
        const y = label ? top : top + 9;
        scene.badges.push({
          edgeId,
          x: middle - w / 2,
          y,
          w,
          h: 15,
          codes: edgeStyle.badges,
          labelled: Boolean(label)
        });
      }
    }
    for (const laneId of sortedKeys(doc.annotations?.lanes)) {
      const lane = doc.annotations.lanes[laneId];
      const members = lane.canvas === id ? lane.nodes.map(nodeId => rects.get(nodeId)).filter(Boolean) : [];
      if (!members.length) continue;
      const box = bounds(members);
      const caption = lane.label.toUpperCase();
      scene.lanes.push({
        laneId,
        canvasId: id,
        within,
        text: caption,
        x: box.x,
        y: box.y - 22,
        w: textWidth(caption, FONTS.caps),
        h: 12
      });
    }
    for (const noteId of sortedKeys(doc.annotations?.notes)) {
      const note = doc.annotations.notes[noteId];
      if (note.canvas === id)
        scene.notes.push({ noteId, canvasId: id, within, note, at: stored.notes?.[noteId], dx, dy });
    }
  }

  place(canvasId, 0, 0, 0, new Set(), []);
  scene.notes = scene.notes.map(item => placeNote(item, rectsById, labelsById));
  scene.associations = placeAssociations(doc, canvasId, scene, labelsById);
  return scene;
}

/** Where a segment from the centre of a box towards a point leaves the box. */
function border(rect, [px, py]) {
  const [cx, cy] = center(rect);
  const [dx, dy] = [px - cx, py - cy];
  if (!dx && !dy) return [cx, cy];
  const t = Math.min(dx ? rect.w / 2 / Math.abs(dx) : Infinity, dy ? rect.h / 2 / Math.abs(dy) : Infinity);
  return [cx + dx * Math.min(t, 1), cy + dy * Math.min(t, 1)];
}

/**
 * The roles' connectors of a figure (mixed levels spec §3, §7): a straight line between the two ends, each a box (from
 * its border) or a transition (its label, else its route's middle). An association whose end is not drawn is left out;
 * it is drawn in the frame that holds both ends (the shorter `within`).
 */
function placeAssociations(doc, canvasId, scene, labels) {
  const boxes = new Map([...scene.nodes, ...scene.frames].map(item => [item.nodeId, item]));
  const routes = new Map(scene.edges.map(item => [item.edgeId, item]));
  const endOf = id => {
    const box = boxes.get(id);
    if (box) return { rect: box.rect, within: box.within };
    const route = routes.get(id);
    if (!route) return null;
    const label = labels.get(id);
    if (label) return { rect: label, within: route.within };
    const [x, y] = midpoint(route.points);
    return { rect: { x, y, w: 0, h: 0 }, within: route.within };
  };
  return associationsOf(doc, canvasId).flatMap(association => {
    const from = endOf(association.from);
    const to = endOf(association.to);
    if (!from || !to) return [];
    const points = [border(from.rect, center(to.rect)), border(to.rect, center(from.rect))];
    const within = from.within.length <= to.within.length ? from.within : to.within;
    return [{ ...association, points, within }];
  });
}

/** A role's connector: its line, a dot where it arrives, and what it stands for when its ends do not say it. */
function drawAssociation(item, paint) {
  const style = ROLE_STYLES[`role.${item.role}`];
  const [x, y] = item.points.at(-1);
  const [mx, my] = midpoint(item.points);
  return el(
    "g",
    { class: "association", "data-id": item.id, "data-role": item.role },
    el("path", {
      d: pathData(item.points),
      fill: "none",
      stroke: paint(style.stroke),
      "stroke-width": style.width,
      "stroke-dasharray": style.dash
    }) +
      el("circle", { cx: x, cy: y, r: 2, fill: paint(style.stroke) }) +
      (item.label ?
        el("rect", {
          x: mx - textWidth(item.label, BOX.summary) / 2 - 3,
          y: my - 7,
          width: textWidth(item.label, BOX.summary) + 6,
          height: 13,
          rx: 2,
          fill: paint(WHITE)
        }) + text(mx, my + 3, item.label, BOX.summary, { "text-anchor": "middle", fill: paint(MUTED) })
      : "")
  );
}

/** Position and shape of a note: stored position, above its node, under its edge's label, or floating. */
function placeNote({ noteId, canvasId, within, note, at, dx, dy }, rects, labels) {
  const tone = NOTE_TONES[note.tone ?? "info"];
  const lines = wrap(note.text, NOTE_WIDTH, line => textWidth(line, FONTS.note));
  const w = Math.ceil(Math.max(...lines.map(line => textWidth(line, FONTS.note)))) + 16;
  const h = lines.length * 15 + 10;
  const target = note.target && rects.get(note.target);
  const label = note.target && labels.get(note.target);
  const base = { noteId, canvasId, within, tone, lines, w, h };
  if (at) return { ...base, kind: "box", x: at.x + dx, y: at.y + dy };
  if (target && note.tone === "defect") {
    return { ...base, kind: "loop", x: target.x + target.w / 2 - w / 2, y: target.y - 34 - h, target };
  }
  if (target) return { ...base, kind: "box", x: target.x + target.w - 24, y: target.y - h - 14, target };
  if (label) return { ...base, kind: "text", x: label.x + label.w / 2 - w / 2, y: label.y + label.h + 2 };
  return { ...base, kind: "box", x: null, y: null };
}

/** Chips (derived chips and tags) from the left, at (x, y). */
export function drawChips(chips, x, y, paint = identity) {
  let left = x;
  return chips
    .map(chip => {
      const w = chipWidth(chip.text);
      const out =
        el("rect", {
          x: left,
          y,
          width: w,
          height: BOX.chipHeight,
          rx: 2,
          fill: chip.fill ? paint(chip.fill) : "none",
          stroke: paint(chip.color),
          "stroke-opacity": 0.45,
          "stroke-width": 0.8
        }) + text(left + w / 2, y + 9.5, chip.text, BOX.chip, { "text-anchor": "middle", fill: paint(chip.color) });
      left += w + 4;
      return out;
    })
    .join("");
}

function drawPills(pills, right, y, paint) {
  let edge = right;
  return pills
    .map(pill => {
      const w = pillWidth(pill.text);
      edge -= w;
      const tone = TONES[pill.tone];
      const out =
        el("rect", { x: edge, y, width: w, height: BOX.chipHeight, rx: 6.5, fill: paint(tone.fill) }) +
        text(edge + w / 2, y + 9.5, pill.text, BOX.pill, { "text-anchor": "middle", fill: paint(tone.color) });
      edge -= 4;
      return out;
    })
    .join("");
}

/** The width of the badge that shows these finding codes. */
const badgeWidth = codes => Math.ceil(textWidth(codes.join(" · "), FONTS.badge)) + 10;

/**
 * The badge of an element's finding codes, its top left corner at x, y: a group marked with the element and the codes
 * (the Editor finds their findings by them) and, with `tooltips`, a `<title>` listing each finding's code and title —
 * the browser's own tooltip on an exported figure.
 * @param {string} target The element the findings are about.
 * @param {string[]} codes
 * @param {number} x
 * @param {number} y
 * @param {{ style: ReturnType<typeof createGeometry>["style"], paint: (color: string) => string, tooltips: boolean }} pen
 */
function drawBadge(target, codes, x, y, { style, paint, tooltips }) {
  const w = badgeWidth(codes);
  const titles = tooltips ? style.findings(target).map(finding => `${finding.code} · ${finding.title}`) : [];
  return el(
    "g",
    { class: "badge", "data-target": target, "data-codes": codes.join(" ") },
    (titles.length ? el("title", {}, esc(titles.join("\n"))) : "") +
      el("rect", { x, y, width: w, height: 15, rx: 3, fill: paint(BADGE.fill) }) +
      text(x + w / 2, y + 10.5, codes.join(" · "), FONTS.badge, { "text-anchor": "middle", fill: paint(BADGE.color) })
  );
}

/** A box's badge, on its bottom right corner. */
function drawBadges(target, codes, rect, pen) {
  if (!codes.length) return "";
  return drawBadge(target, codes, rect.x + rect.w - badgeWidth(codes) + 6, rect.y + rect.h - 8, pen);
}

/** What kind of level a box holds, on its bottom left corner: `↳ flow`, `↳ machine` or `↳ system`. */
function drawInteriorMark(geometry, interior, rect, paint) {
  const kind = interior ? geometry.doc.canvases[interior]?.kind : null;
  if (!kind) return "";
  const label = `↳ ${kind}`;
  const w = Math.ceil(textWidth(label, BOX.pill) + 10);
  const x = rect.x + 10;
  const y = rect.y + rect.h - 7;
  return el(
    "g",
    { class: "interior-mark" },
    el("rect", { x, y, width: w, height: 13, rx: 3, fill: paint(WHITE), stroke: paint(MUTED) }) +
      text(x + w / 2, y + 9.5, label, BOX.pill, { "text-anchor": "middle", fill: paint(SUB) })
  );
}

/** A box node (also actors, refs and cards): rect, chips, status pills, name, summary, badges. */
function drawBox(geometry, item, nodeStyle, paint, tooltips) {
  // With a level inside, the front card leaves the stack's room on the right and below.
  const stack = nodeStyle.interior ? BOX.stack : 0;
  const rect = { ...item.rect, w: item.rect.w - stack, h: item.rect.h - stack };
  const lines = geometry.summaryLines(item.canvasId, item.nodeId, rect.w);
  const top = nodeStyle.chips.length || nodeStyle.statuses.length ? 22 : BOX.pad;
  const content = 14 + (lines.length ? 4 + BOX.lineHeight * lines.length : 0);
  const nameY = rect.y + top + (rect.h - top - BOX.pad - content) / 2 + 11;
  const parts = [];
  // A level inside: two cards stacked behind the box, the farther one fainter.
  if (nodeStyle.interior) {
    for (const [offset, opacity] of [
      [BOX.stack, 0.3],
      [BOX.stack / 2, 0.6]
    ]) {
      parts.push(
        el("rect", {
          x: rect.x + offset,
          y: rect.y + offset,
          width: rect.w,
          height: rect.h,
          rx: 8,
          fill: paint(WHITE),
          stroke: paint(nodeStyle.stroke),
          "stroke-opacity": opacity
        })
      );
    }
  }
  parts.push(
    el("rect", {
      x: rect.x,
      y: rect.y,
      width: rect.w,
      height: rect.h,
      rx: 8,
      fill: paint(nodeStyle.fill),
      stroke: paint(nodeStyle.stroke),
      "stroke-width": 1,
      "stroke-dasharray": nodeStyle.dash
    }),
    drawChips(nodeStyle.chips, rect.x + 8, rect.y + BOX.chipTop, paint),
    drawPills(nodeStyle.statuses, rect.x + rect.w - 8, rect.y + BOX.chipTop, paint),
    text(rect.x + rect.w / 2, nameY, geometry.title(item.canvasId, item.nodeId), BOX.name, {
      "text-anchor": "middle",
      fill: paint(INK)
    }),
    ...lines.map((line, index) =>
      text(rect.x + rect.w / 2, nameY + 4 + BOX.lineHeight * (index + 1), line, BOX.summary, {
        "text-anchor": "middle",
        fill: paint(SUB)
      })
    ),
    drawInteriorMark(geometry, nodeStyle.interior, rect, paint),
    drawBadges(item.nodeId, nodeStyle.badges, rect, { style: geometry.style, paint, tooltips })
  );
  return parts.join("");
}

function drawNode(doc, geometry, item, paint, tooltips) {
  const nodeStyle = geometry.style.node(item.nodeId);
  const node = doc.canvases[item.canvasId].nodes[item.nodeId];
  const { rect } = item;
  const [cx, cy] = center(rect);
  let body;
  switch (nodeStyle.shape) {
    case "dot":
      body = el("circle", { cx, cy, r: 6, fill: paint(INK) });
      break;
    case "end": {
      const color =
        node.outcome === "failure" ? NODE_STYLES["outcome.failure"].stroke : NODE_STYLES["outcome.success"].stroke;
      body =
        el("circle", { cx, cy, r: 9, fill: paint(WHITE), stroke: paint(color), "stroke-width": 1.5 }) +
        el("circle", { cx, cy, r: 5, fill: paint(color) });
      break;
    }
    case "history":
      body =
        el("circle", { cx, cy, r: 12, fill: paint(WHITE), stroke: paint(NODE_STYLES["state.plain"].stroke) }) +
        text(
          cx,
          cy + 4,
          node.depth === "deep" ? "H*" : "H",
          { size: 11, weight: 600 },
          { "text-anchor": "middle", fill: paint(INK) }
        );
      break;
    case "bar":
      body = el("rect", { x: rect.x, y: rect.y, width: rect.w, height: rect.h, rx: 2, fill: paint(INK) });
      break;
    case "diamond": {
      const top = rect.y;
      body = el("polygon", {
        points: `${num(cx)},${num(top)} ${num(cx + 16)},${num(top + 16)} ${num(cx)},${num(top + 32)} ${num(cx - 16)},${num(top + 16)}`,
        fill: paint(WHITE),
        stroke: paint(NODE_STYLES["state.plain"].stroke)
      });
      geometry.diamondLines(item.canvasId, item.nodeId).forEach((line, index) => {
        body += text(cx, top + 46 + BOX.lineHeight * index, line, BOX.summary, {
          "text-anchor": "middle",
          fill: paint(SUB)
        });
      });
      break;
    }
    case "any":
      body =
        el("rect", {
          x: rect.x,
          y: rect.y,
          width: rect.w,
          height: rect.h,
          rx: 13,
          fill: paint(WHITE),
          stroke: paint(MUTED),
          "stroke-dasharray": "3,2"
        }) + text(cx, cy + 3.5, "from any state", BOX.summary, { "text-anchor": "middle", fill: paint(MUTED) });
      break;
    default:
      body = drawBox(geometry, item, nodeStyle, paint, tooltips);
  }
  return el(
    "g",
    { class: "node", "data-id": item.nodeId, opacity: nodeStyle.opacity < 1 ? nodeStyle.opacity : undefined },
    body
  );
}

function drawFrame(geometry, item, paint, tooltips) {
  const { rect } = item;
  const nodeStyle = geometry.style.node(item.nodeId);
  const frame = NODE_STYLES.frame;
  const node = geometry.doc.canvases[item.canvasId].nodes[item.nodeId];
  const tab = [geometry.title(item.canvasId, item.nodeId), node.summary?.split("\n")[0]].filter(Boolean).join(" · ");
  const tabWidth = Math.ceil(textWidth(tab, FONTS.caps)) + 12;
  return el(
    "g",
    { class: "frame", "data-id": item.nodeId, opacity: nodeStyle.opacity < 1 ? nodeStyle.opacity : undefined },
    el("rect", {
      x: rect.x,
      y: rect.y,
      width: rect.w,
      height: rect.h,
      rx: 10,
      fill: paint(frame.fill),
      stroke: paint(frame.stroke),
      "stroke-dasharray": frame.dash
    }) +
      el("rect", {
        x: rect.x + 10,
        y: rect.y + 7,
        width: tabWidth,
        height: 15,
        rx: 3,
        fill: paint(WHITE),
        stroke: paint(frame.stroke)
      }) +
      text(rect.x + 16, rect.y + 18, tab, FONTS.caps, { fill: paint(SUB) }) +
      drawPills(nodeStyle.statuses, rect.x + rect.w - 10, rect.y + BOX.chipTop, paint) +
      drawBadges(item.nodeId, nodeStyle.badges, rect, { style: geometry.style, paint, tooltips })
  );
}

function drawRegion(region, paint) {
  return (
    el("rect", {
      x: region.x,
      y: region.y,
      width: region.w,
      height: region.h,
      rx: 10,
      fill: "none",
      stroke: paint(RULE),
      "stroke-dasharray": "4,3"
    }) + text(region.x + 10, region.y + 15, region.name.toUpperCase(), FONTS.caps, { fill: paint(MUTED) })
  );
}

function drawEdge(item, idPrefix, paint) {
  return el("path", {
    d: pathData(item.points),
    fill: "none",
    stroke: paint(item.style.stroke),
    "stroke-width": item.style.width,
    "stroke-dasharray": item.style.dash,
    "marker-end": `url(#${markerId(idPrefix, item.style.key)})`,
    opacity: item.style.opacity < 1 ? item.style.opacity : undefined,
    "data-id": item.edgeId
  });
}

/** An edge's label, named by its edge (`data-id`) like the edge's route, so a page can find both. */
function drawLabel(label, paint) {
  return el(
    "g",
    { class: "label", "data-id": label.edgeId },
    el("rect", { x: label.x, y: label.y, width: label.w, height: label.h, rx: 2, fill: paint(WHITE) }) +
      label.lines
        .map((line, index) =>
          text(label.x + label.w / 2, label.y + 11 + 12 * index, line, BOX.label, {
            "text-anchor": "middle",
            fill: paint(label.color)
          })
        )
        .join("")
  );
}

function drawNote(note, paint) {
  const lines = (x, y, anchor) =>
    note.lines
      .map((line, index) =>
        text(x, y + 13 + 15 * index, line, FONTS.note, { "text-anchor": anchor, fill: paint(note.tone.color) })
      )
      .join("");
  if (note.kind === "loop") {
    const { target } = note;
    const left = target.x + 16;
    const right = target.x + target.w - 16;
    return (
      el("path", {
        d: `M ${num(left)} ${num(target.y)} C ${num(left)} ${num(target.y - 30)} ${num(right)} ${num(target.y - 30)} ${num(right)} ${num(target.y)}`,
        fill: "none",
        stroke: paint(note.tone.color),
        "stroke-width": 1.2,
        "stroke-dasharray": "2,3"
      }) + lines(note.x + note.w / 2, note.y, "middle")
    );
  }
  if (note.kind === "text") return lines(note.x + note.w / 2, note.y, "middle");
  const leader =
    note.target ?
      el("line", {
        x1: note.x + 12,
        y1: note.y + note.h,
        x2: note.x + 12,
        y2: note.target.y,
        stroke: paint(note.tone.color),
        "stroke-dasharray": "2,2",
        "stroke-opacity": 0.6
      })
    : "";
  return (
    leader +
    el("rect", {
      x: note.x,
      y: note.y,
      width: note.w,
      height: note.h,
      rx: 4,
      fill: paint(note.tone.fill),
      stroke: paint(note.tone.color),
      "stroke-opacity": 0.4
    }) +
    lines(note.x + 8, note.y, "start")
  );
}

/**
 * @typedef {object} FigurePart One drawn element, in canvas coordinates, with its SVG markup.
 * @property {string} id The element's ID (node, edge, region, lane or note).
 * @property {string} canvas The canvas the element belongs to.
 * @property {string[]} within Frame nodes the element is drawn inside, outermost first (empty on the figure's canvas).
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {string} svg
 */

/**
 * The parts of one figure (spec §15): everything `toSVG` draws between the header and the legend, in drawing order
 * and canvas coordinates, each with its SVG markup. Only stored positions are used: nodes without one are listed in
 * `unplaced` and left out with their edges. Draw the parts in the order of the keys (regions first, notes last).
 * @param {any} doc A valid document.
 * @param {string} canvasId
 * @param {{ paint?: (color: string) => string, idPrefix?: string, geometry?: ReturnType<typeof createGeometry>,
 *   tooltips?: boolean }} [options] `paint` maps every colour of the palette (the Editor turns them into CSS variables
 *   for its dark theme); `idPrefix` names the edge markers the edges refer to (see `edgeMarkers`); default
 *   `sw-<canvasId>`. `tooltips`: each finding badge lists its findings in a `<title>`, the browser's own tooltip
 *   (default; the Editor, which shows its own, turns it off).
 * @returns {{ canvas: string, regions: FigurePart[], frames: Array<FigurePart & { title: string, interior: string }>,
 *   edges: Array<FigurePart & { from: string, to: string, points: number[][], key: string, label: string }>,
 *   labels: FigurePart[], nodes: Array<FigurePart & { title: string, shape: string, interior: string | null }>,
 *   lanes: FigurePart[], notes: FigurePart[], bounds: { x: number, y: number, w: number, h: number },
 *   unplaced: string[] }} `title` is the name line of a box; `label` is an edge's label text.
 */
export function figureOf(
  doc,
  canvasId,
  { paint = identity, idPrefix = `sw-${canvasId}`, geometry, tooltips = true } = {}
) {
  if (!doc.canvases[canvasId]) throw new Error(`No canvas "${canvasId}"`);
  geometry ??= createGeometry(doc);
  const style = geometry.style;
  const scene = buildScene(doc, geometry, canvasId);

  const fixed = bounds([
    ...scene.nodes.map(item => item.rect),
    ...scene.frames.map(item => item.rect),
    ...scene.regions,
    ...scene.labels,
    ...scene.badges,
    ...scene.lanes,
    ...scene.edges.flatMap(item => item.points.map(([x, y]) => ({ x, y }))),
    ...scene.notes.filter(note => note.x !== null)
  ]);
  let floating = fixed.bottom + 16;
  for (const note of scene.notes.filter(item => item.x === null)) {
    note.x = fixed.x;
    note.y = floating;
    floating += note.h + 8;
  }
  const body = bounds([
    { x: fixed.x, y: fixed.y, w: fixed.right - fixed.x, h: fixed.bottom - fixed.y },
    ...scene.notes
  ]);

  const box = rect => ({ x: rect.x, y: rect.y, w: rect.w, h: rect.h });
  const badges = new Map(scene.badges.map(badge => [badge.edgeId, badge]));
  /** The badge of an edge's findings, drawn with its label when it has one, else with its route. */
  const badgeOf = (edgeId, labelled) => {
    const badge = badges.get(edgeId);
    return badge && badge.labelled === labelled ?
        drawBadge(edgeId, badge.codes, badge.x, badge.y, { style, paint, tooltips })
      : "";
  };
  return {
    canvas: canvasId,
    associations: scene.associations.map(item => {
      const box = bounds(item.points.map(([x, y]) => ({ x, y })));
      return {
        id: item.id,
        role: item.role,
        from: item.from,
        to: item.to,
        field: item.field,
        owners: item.owners,
        ...(item.label ? { label: item.label } : {}),
        canvas: canvasId,
        within: item.within,
        x: box.x,
        y: box.y,
        w: box.right - box.x,
        h: box.bottom - box.y,
        points: item.points,
        svg: drawAssociation(item, paint)
      };
    }),
    regions: scene.regions.map(region => ({
      id: region.regionId,
      canvas: region.canvasId,
      within: region.within,
      ...box(region),
      svg: drawRegion(region, paint)
    })),
    frames: scene.frames.map(item => ({
      id: item.nodeId,
      canvas: item.canvasId,
      within: item.within,
      ...box(item.rect),
      title: geometry.title(item.canvasId, item.nodeId),
      interior: style.node(item.nodeId).interior,
      svg: drawFrame(geometry, item, paint, tooltips)
    })),
    edges: scene.edges.map(item => {
      const box = bounds(item.points.map(([x, y]) => ({ x, y })));
      return {
        id: item.edgeId,
        canvas: item.canvasId,
        within: item.within,
        x: box.x,
        y: box.y,
        w: box.right - box.x,
        h: box.bottom - box.y,
        from: item.from,
        to: item.to,
        points: item.points,
        key: item.style.key,
        label: style.edgeLabel(item.edgeId),
        svg: drawEdge(item, idPrefix, paint) + badgeOf(item.edgeId, false)
      };
    }),
    labels: scene.labels.map(label => ({
      id: label.edgeId,
      canvas: label.canvasId,
      within: label.within,
      ...box(label),
      svg: drawLabel(label, paint) + badgeOf(label.edgeId, true)
    })),
    nodes: scene.nodes.map(item => ({
      id: item.nodeId,
      canvas: item.canvasId,
      within: item.within,
      ...box(item.rect),
      title: geometry.title(item.canvasId, item.nodeId),
      shape: style.node(item.nodeId).shape,
      interior: style.node(item.nodeId).interior,
      svg: drawNode(doc, geometry, item, paint, tooltips)
    })),
    lanes: scene.lanes.map(lane => ({
      id: lane.laneId,
      canvas: lane.canvasId,
      within: lane.within,
      ...box(lane),
      svg: text(lane.x, lane.y + 9, lane.text, FONTS.caps, { fill: paint(MUTED) })
    })),
    notes: scene.notes.map(note => ({
      id: note.noteId,
      canvas: note.canvasId,
      within: note.within,
      ...box(note),
      svg: drawNote(note, paint)
    })),
    bounds: { x: body.x, y: body.y, w: body.right - body.x, h: body.bottom - body.y },
    unplaced: scene.unplaced
  };
}

/**
 * The heading of a canvas's figure: kicker (code, then the canvas kicker or stage · subject, in capitals), title and
 * caption.
 * @param {any} canvas
 * @returns {{ kicker: string, title: string, caption: string | null }}
 */
export function figureHeading(canvas) {
  const kicker = [
    canvas.code,
    canvas.kicker ?? [canvas.stage, canvas.kind === "machine" ? canvas.subject : null].filter(Boolean).join(" · ")
  ]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
  return { kicker, title: canvas.title ?? canvas.name, caption: canvas.caption ?? null };
}

/**
 * The `<marker>` elements of edge styles (arrowheads), for a `<defs>`; edges refer to them by `idPrefix`.
 * @param {string[]} keys Edge style keys, e.g. `["edge.default", "edge.happy"]`.
 * @param {{ idPrefix: string, paint?: (color: string) => string }} options
 * @returns {string}
 */
export function edgeMarkers(keys, { idPrefix, paint = identity }) {
  return keys
    .map(key =>
      el(
        "marker",
        {
          id: markerId(idPrefix, key),
          markerWidth: 9,
          markerHeight: 7,
          refX: 8,
          refY: 3.5,
          orient: "auto",
          markerUnits: "userSpaceOnUse"
        },
        el("polygon", { points: "0 0, 9 3.5, 0 7", fill: paint(EDGE_STYLES[key].stroke) })
      )
    )
    .join("");
}
