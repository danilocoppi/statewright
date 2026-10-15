import { describe, expect, it } from "vitest";
import { BOX, createGeometry, labelLines, labelSize, textWidth } from "../../src/layout/geometry.js";
import { measureOverlaps } from "../../src/layout/overlaps.js";
import { cleanDoc, targets } from "../rules/fixtures.js";

describe("textWidth", () => {
  it("measures monospace text at 0.6 em per character, with letter spacing", () => {
    expect(textWidth("abcd", { size: 10, mono: true })).toBe(24);
    expect(textWidth("WAITS", { size: 8, mono: true, spacing: 0.06 })).toBeCloseTo(26.4);
  });

  it("measures Inter with its own advance widths", () => {
    expect(textWidth("W", { size: 10 })).toBeGreaterThan(textWidth("i", { size: 10 }) * 3);
    expect(textWidth("idle", { size: 12, weight: 600 })).toBeGreaterThan(textWidth("idle", { size: 12 }));
    expect(textWidth("é", { size: 10 })).toBe(6);
  });
});

describe("edge labels", () => {
  it("put each trigger of a long label on its own line", () => {
    expect(labelLines("go | stop")).toEqual(["go | stop"]);
    expect(labelLines("psp.received | deposit.settles | admin.trigger")).toEqual([
      "psp.received",
      "deposit.settles",
      "admin.trigger"
    ]);
    expect(labelLines("")).toEqual([]);
    expect(labelSize("settled")).toEqual({ w: 50, h: 15, lines: ["settled"] });
    expect(labelSize("")).toBeNull();
  });

  it("wrap a long label at words, at most 32 characters wide, so its edge is not stretched", () => {
    const label = "aiWorker.provedor.respondeu [erro retentável e menos de maxRetentativas (padrão 3): redespacha]";
    const lines = labelLines(label);
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(32);
    expect(lines.join(" ")).toBe(label);
    expect(labelSize(label)).toEqual({
      w: Math.ceil(Math.max(...lines.map(line => textWidth(line, BOX.label))) + 8),
      h: 12 * lines.length + 3,
      lines
    });
    expect(labelLines("a.very.long.event.name.that.has.no.space.at.all")).toEqual([
      "a.very.long.event.name.that.has.no.space.at.all"
    ]);
    expect(labelLines("psp.received | a guard long enough to wrap onto two lines")).toEqual([
      "psp.received",
      "a guard long enough to wrap onto",
      "two lines"
    ]);
  });
});

describe("createGeometry", () => {
  it("sizes boxes to their content, with a minimum", () => {
    const doc = cleanDoc();
    const geometry = createGeometry(doc);
    expect(geometry.size("cnv_m", "nod_idle")).toEqual({ w: BOX.minWidth, h: BOX.minHeight });
    expect(geometry.size("cnv_m", "nod_init")).toEqual({ w: 12, h: 12 });
    doc.canvases.cnv_m.nodes.nod_idle = {
      kind: "state",
      name: "requires_payment_method_and_confirmation",
      summary: "one\ntwo\nthree",
      category: "waiting"
    };
    const grown = createGeometry(doc).size("cnv_m", "nod_idle");
    expect(grown.w).toBe(Math.ceil(textWidth("requires_payment_method_and_confirmation", BOX.name) + 2 * BOX.pad));
    expect(grown.h).toBe(22 + 14 + 4 + 3 * BOX.lineHeight + BOX.pad);
  });

  it("keeps a box with a long summary at most 3:2, wrapping the summary within an 8px margin", () => {
    const summary =
      "Contas a pagar (7 rotas: criar, listar, ver, alterar, buscar de novo pelos links, dar e desfazer a baixa) e " +
      "as 3 rotas internas dos retornos (leitura, busca, triagem). Tabela contaPagar.";
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_busy = { kind: "state", name: "contaPagar", summary };
    const geometry = createGeometry(doc);
    const { w, h } = geometry.size("cnv_m", "nod_busy");
    expect(BOX.pad).toBe(8);
    expect(w / h).toBeLessThanOrEqual(1.5);
    expect(w / h).toBeGreaterThan(1.3);
    const lines = geometry.summaryLines("cnv_m", "nod_busy", w);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, BOX.summary)).toBeLessThanOrEqual(w - 2 * BOX.pad);
    expect(lines.join(" ")).toBe(summary);
    expect(h).toBe(BOX.pad + 14 + 4 + lines.length * BOX.lineHeight + BOX.pad);
  });

  it("leaves a box with nothing to wrap as it was, and keeps the line breaks a summary has", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_busy = { kind: "state", name: "busy", summary: "one\ntwo" };
    const geometry = createGeometry(doc);
    expect(geometry.size("cnv_m", "nod_idle")).toEqual({ w: BOX.minWidth, h: BOX.minHeight });
    expect(geometry.summaryLines("cnv_m", "nod_busy", BOX.minWidth)).toEqual(["one", "two"]);
    expect(geometry.size("cnv_m", "nod_busy")).toEqual({
      w: BOX.minWidth,
      h: BOX.pad + 14 + 4 + 2 * BOX.lineHeight + BOX.pad
    });
  });

  it("keeps a separator at the end of a line, never at the start of the next", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_busy = { kind: "state", name: "busy", summary: "Streams → WS · hooks · mail" };
    const geometry = createGeometry(doc);
    for (const width of [80, 100, 120, 140]) {
      const lines = geometry.summaryLines("cnv_m", "nod_busy", width);
      for (const line of lines) expect(line, `${width}: ${lines.join(" / ")}`).not.toMatch(/^[·→]/);
      expect(lines.join(" ")).toBe("Streams → WS · hooks · mail");
    }
  });

  it("wraps a choice's question under its diamond at 32 characters, growing the diamond's box down", () => {
    const doc = cleanDoc();
    const question = "fila com link e dentro dos tetos de cada conta?";
    doc.canvases.cnv_m.nodes.nod_pick = { kind: "choice", label: question };
    const geometry = createGeometry(doc);
    const lines = geometry.diamondLines("cnv_m", "nod_pick");
    expect(lines.length).toBe(2);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(32);
    expect(lines.join(" ")).toBe(question);
    expect(geometry.size("cnv_m", "nod_pick")).toEqual({
      w: Math.ceil(Math.max(...lines.map(line => textWidth(line, BOX.summary)))) + 8,
      h: 50 + BOX.lineHeight
    });
    doc.canvases.cnv_m.nodes.nod_pick = { kind: "choice", label: "paid?" };
    expect(createGeometry(doc).size("cnv_m", "nod_pick")).toEqual({ w: 38, h: 50 });
  });

  it("never wraps a box narrower than its longest word", () => {
    const doc = cleanDoc();
    const word = "contaBancaria.registroDeRetornoDoBancoComTodasAsLinhasDoArquivo";
    doc.canvases.cnv_m.nodes.nod_busy = { kind: "state", name: "busy", summary: `${word} ${"a ".repeat(60)}` };
    const { w } = createGeometry(doc).size("cnv_m", "nod_busy");
    expect(w).toBe(Math.ceil(textWidth(word, BOX.summary) + 2 * BOX.pad));
  });

  it("uses stored sizes and wraps frames around their interior", () => {
    const doc = cleanDoc();
    doc.layout = {
      canvases: {
        cnv_root: { nodes: { nod_engine: { x: 0, y: 0, display: "frame" } } },
        cnv_m: { nodes: { nod_idle: { x: 100, y: 50, w: 200, h: 60 }, nod_done: { x: 400, y: 50 } } }
      }
    };
    const geometry = createGeometry(doc);
    expect(geometry.size("cnv_m", "nod_idle")).toEqual({ w: 200, h: 60 });
    doc.canvases.cnv_m.nodes.nod_idle.summary = "a summary that wraps once in this box";
    const lines = createGeometry(doc).summaryLines("cnv_m", "nod_idle", 200);
    expect(lines.length).toBe(2);
    for (const line of lines) expect(textWidth(line, BOX.summary)).toBeLessThanOrEqual(200 - 2 * BOX.pad);
    expect(geometry.interiorBox("cnv_m")).toEqual({ x: 100, y: 50, w: 440, h: 60 });
    expect(geometry.size("cnv_root", "nod_engine")).toEqual({
      w: 440 + 2 * BOX.framePad,
      h: 60 + BOX.framePad + BOX.frameTab
    });
  });

  it("titles unnamed flow steps after what they do", () => {
    expect(createGeometry(cleanDoc()).title("cnv_f", "nod_tell")).toBe("stop");
  });
});

describe("measureOverlaps", () => {
  const placed = (nodes, edges = {}) => {
    const doc = cleanDoc();
    doc.layout = { canvases: { cnv_m: { nodes, edges } } };
    return doc;
  };

  it("finds overlapping boxes and labels in the stored layout", () => {
    const doc = placed(
      { nod_idle: { x: 0, y: 0 }, nod_busy: { x: 100, y: 10 }, nod_done: { x: 600, y: 0 } },
      { edg_busyDone: { labelAt: [620, 20] } }
    );
    expect(measureOverlaps(doc, "cnv_m")).toEqual([
      { a: "nod_busy", b: "nod_idle", kind: "node" },
      { a: "edg_busyDone", b: "nod_done", kind: "label" }
    ]);
  });

  it("ignores elements without a position and canvases without layout", () => {
    expect(measureOverlaps(placed({ nod_idle: { x: 0, y: 0 } }), "cnv_m")).toEqual([]);
    expect(measureOverlaps(cleanDoc(), "cnv_m")).toEqual([]);
  });

  it("is the layout.overlap rule", () => {
    const doc = placed({ nod_idle: { x: 0, y: 0 }, nod_busy: { x: 100, y: 10 } });
    expect(targets(doc, "layout.overlap")).toEqual(["nod_busy"]);
    expect(targets(placed({ nod_idle: { x: 0, y: 0 }, nod_busy: { x: 300, y: 0 } }), "layout.overlap")).toEqual([]);
  });
});
