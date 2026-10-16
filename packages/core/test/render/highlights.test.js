// Boxes and arrows drawn in their highlight, and the legend saying what each means (highlights spec §4).
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { autoLayout } from "../../src/layout/index.js";
import { figureOf } from "../../src/render/figure.js";
import { toSVG } from "../../src/render/index.js";
import { legendFor } from "../../src/style/index.js";
import { cleanDoc } from "../rules/fixtures.js";

const RED = "#DC2626";
const RED_TINT = "#FEF2F2";
const RED_TEXT = "#991B1B";
const BLUE = "#2563EB";

/** The clean document with highlights declared, `marks` applied ({ elementId: [hlt…] }), every canvas laid out. */
async function highlighted(marks, edit = doc => doc) {
  let doc = cleanDoc();
  doc.catalog.highlights = {
    hlt_critical: {
      name: "Critical",
      description: "The path that must not fail.",
      colour: "red",
      border: "bold",
      fill: "tint",
      chip: true
    },
    hlt_calm: { name: "Calm", colour: "blue", border: "heavy" },
    hlt_brand: { name: "Brand", colour: "#7C3AED" }
  };
  for (const [id, highlights] of Object.entries(marks)) {
    for (const canvas of Object.values(doc.canvases)) {
      if (canvas.nodes[id]) canvas.nodes[id].highlights = highlights;
      if (canvas.edges[id]) canvas.edges[id].highlights = highlights;
    }
  }
  doc = edit(doc);
  for (const canvasId of ["cnv_root", "cnv_m"]) doc = applyBatch(doc, await autoLayout(doc, canvasId)).doc;
  return doc;
}
const part = (figure, layer, id) => figure[layer].find(item => item.id === id).svg;
const mainRect = svg => svg.match(/<rect [^>]*rx="8"[^>]*\/>/g).at(-1);

describe("drawing highlights", () => {
  it("draws a box in its highlight: the border's colour and width, the tint, and its chip after the tags", async () => {
    const doc = await highlighted({ nod_idle: ["hlt_critical"] }, doc => {
      doc.canvases.cnv_m.nodes.nod_idle.tags = [{ text: "beta" }];
      return doc;
    });
    const box = part(figureOf(doc, "cnv_m"), "nodes", "nod_idle");
    expect(mainRect(box)).toContain(`fill="${RED_TINT}"`);
    expect(mainRect(box)).toContain(`stroke="${RED}"`);
    expect(mainRect(box)).toContain('stroke-width="2"');
    expect(box.indexOf(">BETA<")).toBeLessThan(box.indexOf(">CRITICAL<"));
    expect(box).toMatch(new RegExp(`fill="${RED}"[^>]*>|fill="${RED_TEXT}"[^>]*>CRITICAL<`));
  });

  it("keeps a plain box's border at 1", async () => {
    const doc = await highlighted({});
    expect(mainRect(part(figureOf(doc, "cnv_m"), "nodes", "nod_idle"))).toContain('stroke-width="1"');
  });

  it("keeps what provenance says: a defect stays dashed and keeps its chip", async () => {
    const doc = await highlighted({ nod_idle: ["hlt_critical"] }, doc => {
      doc.canvases.cnv_m.nodes.nod_idle.provenance = "defect";
      return doc;
    });
    const box = part(figureOf(doc, "cnv_m"), "nodes", "nod_idle");
    expect(mainRect(box)).toContain("stroke-dasharray=");
    expect(mainRect(box)).toContain(`stroke="${RED}"`);
    expect(box).toContain(">DEFECT<");
    expect(box).toContain(">CRITICAL<");
  });

  it("takes the look of the first highlight and the chips of those that show one", async () => {
    const doc = await highlighted({ nod_idle: ["hlt_calm", "hlt_critical"] });
    const box = part(figureOf(doc, "cnv_m"), "nodes", "nod_idle");
    expect(mainRect(box)).toContain(`stroke="${BLUE}"`);
    expect(mainRect(box)).toContain('stroke-width="3"');
    expect(mainRect(box)).not.toContain(RED_TINT);
    expect(box).toContain(">CRITICAL<");
    expect(box).not.toContain(">CALM<");
  });

  it("draws an arrow in its highlight, keeping its dash, with an arrowhead of its colour", async () => {
    const doc = await highlighted({ edg_idleBusy: ["hlt_critical"] }, doc => {
      doc.canvases.cnv_m.edges.edg_idleBusy.intent = "failure";
      doc.canvases.cnv_m.edges.edg_busyDone.intent = "failure";
      return doc;
    });
    const figure = figureOf(doc, "cnv_m", { idPrefix: "t" });
    const marked = part(figure, "edges", "edg_idleBusy");
    const plain = part(figure, "edges", "edg_busyDone");
    expect(marked).toContain(`stroke="${RED}"`);
    expect(marked).toContain('stroke-width="2"');
    expect(marked).toContain("stroke-dasharray=");
    expect(marked).toContain('marker-end="url(#t-m-highlight-DC2626)"');
    expect(plain).toContain('marker-end="url(#t-m-edge-failure)"');
    const svg = await toSVG(doc, "cnv_m", { idPrefix: "t" });
    expect(svg).toMatch(/<marker id="t-m-highlight-DC2626"[^>]*><polygon [^>]*fill="#DC2626"/);
    expect(svg).toContain('<marker id="t-m-edge-failure"');
  });

  it("shows an arrow's chip by its label", async () => {
    const doc = await highlighted({ edg_idleBusy: ["hlt_critical"] });
    expect(part(figureOf(doc, "cnv_m"), "labels", "edg_idleBusy")).toContain(">CRITICAL<");
  });

  it("colours the start dot, and a frame's border", async () => {
    const doc = await highlighted({ nod_init: ["hlt_critical"], nod_engine: ["hlt_critical"] });
    expect(part(figureOf(doc, "cnv_m"), "nodes", "nod_init")).toContain(`<circle cx=`);
    expect(part(figureOf(doc, "cnv_m"), "nodes", "nod_init")).toContain(`fill="${RED}"`);
    const framed = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "frame" } }
    ]).doc;
    const frame = part(figureOf(framed, "cnv_root"), "frames", "nod_engine");
    expect(frame).toContain(`stroke="${RED}"`);
  });

  it("colours a choice's diamond", async () => {
    const doc = await highlighted({ nod_pick: ["hlt_critical"] }, doc => {
      doc.canvases.cnv_m.nodes.nod_pick = { kind: "choice", highlights: ["hlt_critical"] };
      doc.canvases.cnv_m.edges.edg_busyPick = { from: "nod_busy", to: "nod_pick" };
      doc.canvases.cnv_m.edges.edg_pickDone = { from: "nod_pick", to: "nod_done", else: true };
      return doc;
    });
    expect(part(figureOf(doc, "cnv_m"), "nodes", "nod_pick")).toMatch(new RegExp(`<polygon [^>]*stroke="${RED}"`));
  });

  it("draws an element whose highlight is missing as plain", async () => {
    const doc = await highlighted({ nod_idle: ["hlt_gone"] });
    expect(mainRect(part(figureOf(doc, "cnv_m"), "nodes", "nod_idle"))).toContain('stroke-width="1"');
  });

  it("lists the level's highlights in the legend with their meaning, and none when the level uses none", async () => {
    const doc = await highlighted({ nod_idle: ["hlt_critical"], edg_busyDone: ["hlt_brand"] });
    expect(legendFor(doc, "cnv_m").highlights.map(item => [item.id, item.name, item.description])).toEqual([
      ["hlt_critical", "Critical", "The path that must not fail."],
      ["hlt_brand", "Brand", undefined]
    ]);
    expect(legendFor(doc, "cnv_root").highlights).toEqual([]);
    const svg = await toSVG(doc, "cnv_m");
    expect(svg).toContain("Critical: The path that must not fail.");
    expect(svg).toContain(">Brand<");
  });
});
