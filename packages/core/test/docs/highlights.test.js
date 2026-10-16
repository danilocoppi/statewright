// Highlights in the documentation, the AI pack and the contract (highlights spec §5, §7).
import { describe, expect, it } from "vitest";
import { toContract } from "../../src/contract/index.js";
import { toAIPack, toMarkdown } from "../../src/docs/document.js";
import { cleanDoc } from "../rules/fixtures.js";

function highlighted() {
  const doc = cleanDoc();
  doc.catalog.highlights.hlt_critical = {
    name: "Critical",
    description: "The path that must not fail.",
    colour: "red",
    border: "bold",
    fill: "tint",
    chip: true
  };
  doc.catalog.highlights.hlt_brand = { name: "Brand", colour: "#7C3AED" };
  doc.canvases.cnv_m.nodes.nod_busy.highlights = ["hlt_critical"];
  doc.canvases.cnv_root.nodes.nod_engine.highlights = ["hlt_brand", "hlt_critical"];
  doc.canvases.cnv_m.edges.edg_idleBusy.highlights = ["hlt_critical"];
  return doc;
}

describe("highlights in what Statewright writes", () => {
  it("has a catalog table of highlights: name, colour, look and meaning", () => {
    const markdown = toMarkdown(highlighted());
    expect(markdown).toContain("| Highlight | Colour | Look | Meaning |");
    expect(markdown).toContain("| Critical | red | bold border · tint · tag | The path that must not fail. |");
    expect(markdown).toContain("| Brand | #7C3AED | bold border |  |");
  });

  it("names the highlights of each element in its level's table", () => {
    const markdown = toMarkdown(highlighted());
    expect(markdown).toMatch(/\| busy \|[^\n]*Critical \|/);
    expect(markdown).toMatch(/\| Engine \| service \|[^\n]*Brand, Critical \|/);
  });

  it("says the same in the AI pack", () => {
    const pack = toAIPack(highlighted());
    expect(pack).toContain("Critical");
    expect(pack).toContain("The path that must not fail.");
  });

  it("leaves documents without highlights as they were", () => {
    expect(toMarkdown(cleanDoc())).not.toContain("Highlight");
  });

  it("keeps highlights out of the contract: they are for people", () => {
    const withoutSource = contract => Object.fromEntries(Object.entries(contract).filter(([key]) => key !== "source"));
    const marked = withoutSource(toContract(highlighted()));
    expect(marked).toEqual(withoutSource(toContract(cleanDoc())));
    expect(JSON.stringify(marked)).not.toContain("hlt_");
  });
});
