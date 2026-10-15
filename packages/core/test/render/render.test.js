import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { toSVG } from "../../src/render/index.js";
import { stringify } from "../../src/serialize/stringify.js";
import { paymentsDoc } from "../helpers.js";
import { cleanDoc } from "../rules/fixtures.js";

/** Visible texts of an SVG, in order. */
const texts = svg => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(match => match[1]);

describe("toSVG", () => {
  it("draws a standalone figure: header, boxes, chips, pills, labels and a legend", async () => {
    const svg = await toSVG(paymentsDoc(), "cnv_crossBorderSend");
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 \d+ \d+" width="\d+" height="\d+" role="img"/
    );
    expect(svg.endsWith("</svg>\n")).toBe(true);
    const shown = texts(svg);
    expect(shown.slice(0, 2)).toEqual(["PAYMENT TYPE", "Cross-border send (send · crossBorder)"]);
    for (const expected of ["awaiting_funds", "WAITS", "pending", "FINAL", "payin.confirmed", "LEGEND", "Happy path"]) {
      expect(shown).toContain(expected);
    }
    expect(svg).toContain('<marker id="sw-cnv_crossBorderSend-m-edge-happy"');
    expect(svg).toContain('stroke-dasharray="5,4"');
  });

  it("is deterministic and leaves the document unchanged", async () => {
    const doc = paymentsDoc();
    const before = stringify(doc);
    const svg = await toSVG(doc, "cnv_runtime");
    expect(await toSVG(doc, "cnv_runtime")).toBe(svg);
    expect(stringify(doc)).toBe(before);
  });

  it("leaves the caller's document mutable", async () => {
    const doc = paymentsDoc();
    await toSVG(doc, "cnv_runtime");
    expect(Object.isFrozen(doc.canvases.cnv_runtime)).toBe(false);
    doc.canvases.cnv_runtime.name = "Changed";
    expect(doc.canvases.cnv_runtime.name).toBe("Changed");
  });

  it("escapes text and can leave out the header and the legend", async () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_idle.name = "a < b & c";
    const svg = await toSVG(doc, "cnv_m", { header: false, legend: false, idPrefix: "x" });
    expect(svg).toContain(">a &lt; b &amp; c</text>");
    expect(svg).not.toContain("LEGEND");
    expect(svg).toContain('id="x-m-edge-default"');
    expect(texts(svg)).not.toContain("Machine");
  });

  it("draws a frame with its tab and its interior, and finding badges", async () => {
    let doc = cleanDoc();
    doc = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "frame" } },
      { type: "finding.upsert", args: { finding: { code: "H1", title: "t", severity: "high", targets: ["nod_busy"] } } }
    ]).doc;
    const svg = await toSVG(doc, "cnv_root");
    expect(svg).toContain('<g class="frame" data-id="nod_engine">');
    expect(texts(svg)).toEqual(
      expect.arrayContaining(["Engine", "idle", "busy", "done", "H1", "Finding", "Group (expanded interior)"])
    );
  });

  it("shows interiors as cards with their summary", async () => {
    const doc = applyBatch(cleanDoc(), [
      { type: "layout.node.set", args: { canvas: "cnv_root", id: "nod_engine", x: 0, y: 0, display: "card" } }
    ]).doc;
    expect(texts(await toSVG(doc, "cnv_root"))).toContain("idle → busy → done");
  });

  it("draws lanes and notes", async () => {
    const doc = applyBatch(cleanDoc(), [
      { type: "lane.add", args: { lane: { canvas: "cnv_m", label: "Forward rail", nodes: ["nod_idle", "nod_busy"] } } },
      {
        type: "note.add",
        args: { note: { text: "nobody watches this", canvas: "cnv_m", target: "nod_busy", tone: "defect" } }
      },
      { type: "note.add", args: { note: { text: "floating", canvas: "cnv_m" } } }
    ]).doc;
    const svg = await toSVG(doc, "cnv_m");
    expect(texts(svg)).toEqual(expect.arrayContaining(["FORWARD RAIL", "nobody watches this", "floating"]));
    expect(svg).toContain('stroke-dasharray="2,3"');
  });

  it("refuses unknown canvases", async () => {
    await expect(toSVG(cleanDoc(), "cnv_none")).rejects.toThrow(/No canvas/);
  });
});
