import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { autoLayout } from "../../src/layout/index.js";
import { edgeMarkers, figureHeading, figureOf } from "../../src/render/figure.js";
import { toSVG } from "../../src/render/index.js";
import { parse } from "../../src/serialize/parse.js";
import { BADGE, EDGE_STYLES, INK, MUTED, NODE_STYLES, NOTE_TONES, RULE, SUB, TONES } from "../../src/style/palette.js";
import { readExample } from "../helpers.js";
import { cleanDoc } from "../rules/fixtures.js";

const LAYERS = ["regions", "frames", "edges", "labels", "nodes", "lanes", "notes"];
const drawn = figure => LAYERS.flatMap(layer => figure[layer].map(part => part.svg)).join("");

/** An example with every canvas laid out, as the Editor stores it after showing each level. */
async function placed(name) {
  let doc = parse(readExample(`${name}.sttw`)).doc;
  for (const canvasId of Object.keys(doc.canvases)) {
    const commands = await autoLayout(doc, canvasId);
    if (commands.length) doc = applyBatch(doc, commands).doc;
  }
  return doc;
}

/** The clean document with a lane, three kinds of notes, a tag and a status: every part a figure can have. */
function annotated() {
  const doc = cleanDoc();
  doc.catalog.statuses.sts_open = { name: "open", tone: "warning" };
  doc.canvases.cnv_m.nodes.nod_idle.tags = [{ text: "beta", tone: "info" }];
  doc.canvases.cnv_m.nodes.nod_idle.statuses = ["sts_open"];
  return applyBatch(doc, [
    { type: "lane.add", args: { lane: { canvas: "cnv_m", label: "Forward rail", nodes: ["nod_idle", "nod_busy"] } } },
    { type: "note.add", args: { note: { text: "watch this", canvas: "cnv_m", target: "nod_busy", tone: "defect" } } },
    { type: "note.add", args: { note: { text: "under the label", canvas: "cnv_m", target: "edg_idleBusy" } } },
    { type: "note.add", args: { note: { text: "floating", canvas: "cnv_m", tone: "warning" } } }
  ]).doc;
}

const PALETTE = new Set(
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
);

describe("figureOf", () => {
  it("stacks two cards behind a box with a level inside, and marks what kind of level it is", async () => {
    let doc = cleanDoc();
    for (const canvasId of ["cnv_root", "cnv_m"]) doc = applyBatch(doc, await autoLayout(doc, canvasId)).doc;
    const engine = figureOf(doc, "cnv_root").nodes.find(part => part.id === "nod_engine");
    const rects = [...engine.svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)"[^>]*stroke-opacity="([\d.]+)"/g)];
    expect(rects.map(match => [Number(match[1]) - engine.x, Number(match[2]) - engine.y, Number(match[3])])).toEqual([
      [8, 8, 0.3],
      [4, 4, 0.6]
    ]);
    // The stack is inside the box's bounds, so an edge never ends under a card: the front card is 8 px smaller.
    const cards = [
      ...engine.svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)" rx="8"/g)
    ];
    expect(cards.map(match => match.slice(1).map(Number))).toEqual([
      [engine.x + 8, engine.y + 8, engine.w - 8, engine.h - 8],
      [engine.x + 4, engine.y + 4, engine.w - 8, engine.h - 8],
      [engine.x, engine.y, engine.w - 8, engine.h - 8]
    ]);
    expect(engine.svg).toMatch(/<g class="interior-mark">.*↳ machine<\/text><\/g>/);
    const plain = figureOf(doc, "cnv_m").nodes.find(part => part.id === "nod_idle");
    expect(plain.svg).not.toContain("stroke-opacity");
    expect(plain.svg).not.toContain("interior-mark");
  });

  it("draws a choice's long question wrapped under its diamond", async () => {
    let doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_pick = { kind: "choice", label: "fila com link e dentro dos tetos de cada conta?" };
    doc = applyBatch(doc, await autoLayout(doc, "cnv_m")).doc;
    const node = figureOf(doc, "cnv_m").nodes.find(part => part.id === "nod_pick");
    const lines = [...node.svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]*)</g)];
    expect(lines.map(match => match[3])).toEqual(["fila com link e dentro dos tetos", "de cada conta?"]);
    expect(Number(lines[1][2]) - Number(lines[0][2])).toBe(13);
    expect(Number(lines[1][2])).toBeLessThanOrEqual(node.y + node.h);
  });

  it("draws a long summary wrapped and centred in its box, 8px clear of its edges", async () => {
    let doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_idle.summary =
      "Cadastro das contas bancarias (4 rotas: criar, listar, ver, alterar). Tabela contaBancaria.";
    doc = applyBatch(doc, await autoLayout(doc, "cnv_m")).doc;
    const node = figureOf(doc, "cnv_m").nodes.find(part => part.id === "nod_idle");
    const texts = [...node.svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"[^>]*>([^<]*)</g)].map(match => ({
      x: Number(match[1]),
      y: Number(match[2]),
      text: match[3]
    }));
    expect(texts.length).toBeGreaterThan(2);
    for (const line of texts) expect(line.x).toBe(node.x + node.w / 2);
    const top = texts[0].y - 11;
    const bottom = texts.at(-1).y + 2;
    expect(top - node.y).toBeGreaterThanOrEqual(8);
    expect(node.y + node.h - bottom).toBeGreaterThanOrEqual(8);
    expect(Math.abs(top - node.y - (node.y + node.h - bottom))).toBeLessThanOrEqual(1);
    expect(node.w / node.h).toBeLessThanOrEqual(1.5);
  });

  it.each(["get-paid-as-built", "payments"])("draws exactly the parts of the figure toSVG exports (%s)", async name => {
    const doc = await placed(name);
    for (const canvasId of Object.keys(doc.canvases)) {
      const figure = figureOf(doc, canvasId);
      expect(figure.unplaced, canvasId).toEqual([]);
      expect(await toSVG(doc, canvasId), canvasId).toContain(`">${drawn(figure)}</g>`);
    }
  });

  it("draws lanes and every kind of note, in canvas coordinates", async () => {
    const doc = annotated();
    const working = applyBatch(doc, await autoLayout(doc, "cnv_m")).doc;
    const figure = figureOf(working, "cnv_m");
    expect(figure.lanes.map(part => part.id)).toEqual([Object.keys(working.annotations.lanes)[0]]);
    expect(figure.notes).toHaveLength(3);
    expect(await toSVG(working, "cnv_m")).toContain(`">${drawn(figure)}</g>`);
    const idle = figure.nodes.find(part => part.id === "nod_idle");
    expect(idle).toMatchObject({ canvas: "cnv_m", within: [], title: "idle", shape: "box", interior: null });
    expect(idle).toMatchObject(working.layout.canvases.cnv_m.nodes.nod_idle);
    expect(figure.edges.find(part => part.id === "edg_idleBusy")).toMatchObject({ from: "nod_idle", label: "go" });
  });

  it("draws an edge's findings as a badge under its label, or under the middle of its route", () => {
    const doc = applyBatch(parse(readExample("bookings.sttw")).doc, [
      {
        type: "findings.replace",
        args: {
          source: "conformance",
          findings: [
            { code: "diverged", title: "Not seated", severity: "high", targets: ["edg_confirmedSeated"] },
            { code: "threw", title: "Not booked", severity: "medium", targets: ["edg_postBookingsRequested"] }
          ]
        }
      }
    ]).doc;
    const figure = figureOf(doc, "cnv_booking");
    // guest.arrived's label is 86 by 15 at (818, 117.5): the badge sits 2 below it, centred.
    expect(figure.labels.find(part => part.id === "edg_confirmedSeated").svg).toContain(
      `<rect x="835.5" y="134.5" width="51" height="15" rx="3" fill="${BADGE.fill}"/>`
    );
    expect(figure.labels.find(part => part.id === "edg_confirmedSeated").svg).toMatch(/>diverged<\/text><\/g>$/);
    // The entry's arrow has no label: the badge sits under the middle of its route, from (140, 40) to (212, 40).
    expect(figure.edges.find(part => part.id === "edg_postBookingsRequested").svg).toContain(
      `<rect x="158" y="49" width="36" height="15" rx="3" fill="${BADGE.fill}"/>`
    );
    expect(figure.edges.find(part => part.id === "edg_postBookingsRequested").svg).toMatch(/>threw<\/text><\/g>$/);
    expect(figure.bounds.h).toBe(149.5);
    expect(drawn(figureOf(parse(readExample("bookings.sttw")).doc, "cnv_booking"))).not.toContain(BADGE.fill);
  });

  it("marks each badge with its target and codes, and lists its findings' titles for a tooltip", () => {
    const doc = applyBatch(parse(readExample("bookings.sttw")).doc, [
      {
        type: "findings.replace",
        args: {
          source: "audit",
          findings: [
            { code: "AG1", title: "No timeout <yet>", severity: "high", targets: ["nod_confirmed"] },
            { code: "AG2", title: "Guard unclear", severity: "low", targets: ["nod_confirmed", "edg_confirmedSeated"] }
          ]
        }
      }
    ]).doc;
    const figure = figureOf(doc, "cnv_booking");
    const box = figure.nodes.find(part => part.id === "nod_confirmed").svg;
    expect(box).toMatch(
      /<g class="badge" data-target="nod_confirmed" data-codes="AG1 AG2"><title>AG1 · No timeout &lt;yet&gt;\nAG2 · Guard unclear<\/title><rect [^>]+\/><text [^>]+>AG1 · AG2<\/text><\/g>/
    );
    expect(figure.labels.find(part => part.id === "edg_confirmedSeated").svg).toMatch(
      /<g class="badge" data-target="edg_confirmedSeated" data-codes="AG2"><title>AG2 · Guard unclear<\/title><rect [^>]+\/><text [^>]+>AG2<\/text><\/g>$/
    );
    // Without tooltips (the Editor shows its own), the badge keeps its marks.
    const quiet = figureOf(doc, "cnv_booking", { tooltips: false }).nodes.find(part => part.id === "nod_confirmed").svg;
    expect(quiet).toContain('<g class="badge" data-target="nod_confirmed" data-codes="AG1 AG2"><rect ');
    expect(quiet).not.toContain("<title>");
  });

  it("leaves out nodes that have no stored position, and lists them", () => {
    const figure = figureOf(cleanDoc(), "cnv_m");
    expect(figure.nodes).toEqual([]);
    expect(figure.edges).toEqual([]);
    expect(figure.unplaced).toEqual(["nod_busy", "nod_done", "nod_idle", "nod_init"]);
  });

  it("lists the unplaced interior of a frame", () => {
    const doc = applyBatch(cleanDoc(), [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "frame" } }
    ]).doc;
    const figure = figureOf(doc, "cnv_root");
    expect(figure.frames.map(part => part.id)).toEqual(["nod_engine"]);
    expect(figure.unplaced).toEqual(["nod_busy", "nod_done", "nod_idle", "nod_init"]);
  });

  it("names the frames an interior is drawn inside", async () => {
    const doc = await placed("get-paid-as-built");
    const figure = figureOf(doc, "cnv_transaction");
    const [frame] = figure.frames;
    expect(frame).toMatchObject({ canvas: "cnv_transaction", within: [], interior: "cnv_open" });
    const inside = figure.nodes.filter(part => part.canvas === "cnv_open");
    expect(inside.length).toBeGreaterThan(0);
    for (const part of inside) expect(part.within).toEqual([frame.id]);
    expect(figure.edges.filter(part => part.canvas === "cnv_open").every(part => part.within[0] === frame.id)).toBe(
      true
    );
  });

  it("paints every colour, and only colours of the palette", async () => {
    const used = new Set();
    const paint = color => {
      used.add(color.toUpperCase());
      return `var(--c)`;
    };
    const docs = [await placed("payments"), await placed("get-paid-as-built")];
    const doc = annotated();
    docs.push(applyBatch(doc, await autoLayout(doc, "cnv_m")).doc);
    for (const each of docs) {
      for (const canvasId of Object.keys(each.canvases)) {
        expect(drawn(figureOf(each, canvasId, { paint }))).not.toMatch(/#[0-9a-f]{3,6}\b/i);
      }
    }
    expect([...used].filter(color => !PALETTE.has(color))).toEqual([]);
    expect(used.size).toBeGreaterThan(20);
  });

  it("refers edges to markers named by idPrefix, which edgeMarkers draws", async () => {
    const doc = await placed("get-paid-as-built");
    const figure = figureOf(doc, "cnv_open", { idPrefix: "canvas" });
    expect(figure.edges[0].svg).toContain(`marker-end="url(#canvas-m-${figure.edges[0].key.replace(".", "-")})"`);
    const markers = edgeMarkers(["edge.happy"], { idPrefix: "canvas", paint: () => "var(--happy)" });
    expect(markers).toBe(
      '<marker id="canvas-m-edge-happy" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto" ' +
        'markerUnits="userSpaceOnUse"><polygon points="0 0, 9 3.5, 0 7" fill="var(--happy)"/></marker>'
    );
  });

  it("refuses unknown canvases", () => {
    expect(() => figureOf(cleanDoc(), "cnv_none")).toThrow(/No canvas/);
  });
});

describe("figureHeading", () => {
  it("joins the code with the kicker, or with stage and subject, in capitals", () => {
    expect(
      figureHeading({ kind: "machine", name: "Open", code: "T2", stage: "as-built", subject: "transaction" })
    ).toEqual({ kicker: "T2 · AS-BUILT · TRANSACTION", title: "Open", caption: null });
    expect(
      figureHeading({ kind: "flow", name: "Pay", title: "How we pay", kicker: "Flow", caption: "Two steps." })
    ).toEqual({ kicker: "FLOW", title: "How we pay", caption: "Two steps." });
  });
});

describe("the main entry", () => {
  it("draws figures without loading the layout engine (ELK stays in statewright/layout)", () => {
    const seen = new Set();
    const visit = url => {
      if (seen.has(url.href)) return;
      seen.add(url.href);
      const source = readFileSync(url, "utf8");
      for (const [, specifier] of source.matchAll(/^(?:import|export)[^;]*?from "([^"]+)"/gms)) {
        expect(specifier, url.pathname).not.toMatch(/^elkjs/);
        if (specifier.startsWith(".")) visit(new URL(specifier, url));
      }
    };
    visit(new URL("../../src/index.js", import.meta.url));
    expect([...seen].some(href => href.endsWith("/render/figure.js"))).toBe(true);
    expect([...seen].some(href => href.endsWith("/layout/index.js"))).toBe(false);
  });
});
