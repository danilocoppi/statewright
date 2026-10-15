import { toAIPack, toMarkdown } from "statewright";
import { stringifyContract, toContract } from "statewright/contract";
import { toDocumentPage, toScenarioPage, toSVG } from "statewright/render";
import { describe, expect, it, vi } from "vitest";

import {
  exportAIPack,
  exportContract,
  exportDocumentPage,
  exportMarkdown,
  exportScenarioPage,
  exportSVG,
  guideUrl,
  svgWithFonts
} from "@/files/export";

import { readExample } from "../fixtures.js";

describe("exports", () => {
  it("exports the current level as exactly the SVG Core renders", async () => {
    const doc = readExample("get-paid-as-built");
    const file = await exportSVG(doc, "cnv_open");
    expect(file).toEqual({
      name: "get-paid-as-built-open.svg",
      type: "image/svg+xml",
      data: await toSVG(doc, "cnv_open")
    });
  });

  it("exports the project's documentation for people and for AI agents", () => {
    const doc = readExample("payments");
    expect(exportMarkdown(doc)).toEqual({ name: "payments.md", type: "text/markdown", data: toMarkdown(doc) });
    const pack = exportAIPack(doc, { guideUrl: "https://statewright.example/README.md" });
    expect(pack.name).toBe("payments.ai.md");
    expect(pack.data).toBe(toAIPack(doc, { guideUrl: "https://statewright.example/README.md" }));
  });

  it("exports the contract Core writes, with the Problems that make it ambiguous (source-of-truth spec §5)", async () => {
    const doc = readExample("payments");
    expect(await exportContract(doc)).toEqual({
      name: "payments.contract.json",
      type: "application/json",
      data: stringifyContract((await toContract(doc)).contract),
      problems: []
    });
  });

  it("exports a scenario as the page Core makes, named after it, with the fonts it is given", async () => {
    const doc = readExample("payments");
    const fetch = vi.fn(async () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));
    const file = await exportScenarioPage(
      doc,
      "scn_verificationPausesTheClock",
      [{ family: "Inter", weight: "100 900", url: "/inter.woff2" }],
      { fetch }
    );
    expect(fetch).toHaveBeenCalledWith("/inter.woff2");
    expect(file).toEqual({
      name: "verification-pauses-the-clock.html",
      type: "text/html",
      data: await toScenarioPage(doc, "scn_verificationPausesTheClock", {
        fonts: [{ family: "Inter", weight: "100 900", data: "AQID" }]
      })
    });
  });

  it("exports the documentation as the page Core makes, named after the project, with the fonts it is given", async () => {
    const doc = readExample("payments");
    const fetch = vi.fn(async () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));
    const file = await exportDocumentPage(doc, [{ family: "Inter", weight: "100 900", url: "/inter.woff2" }], {
      fetch
    });
    expect(fetch).toHaveBeenCalledWith("/inter.woff2");
    expect(file).toEqual({
      name: "payments.html",
      type: "text/html",
      data: await toDocumentPage(doc, { fonts: [{ family: "Inter", weight: "100 900", data: "AQID" }] })
    });
  });

  it("points AI agents to the platform's README", () => {
    expect(guideUrl("https://statewright.example")).toBe("https://statewright.example/README.md");
  });
});

describe("svgWithFonts", () => {
  it("embeds each font as a data URL right after the opening tag and leaves the drawing unchanged", async () => {
    const fetch = vi.fn(async () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/></svg>';
    const result = await svgWithFonts(svg, [{ family: "Inter", weight: "100 900", url: "/inter.woff2" }], { fetch });
    expect(fetch).toHaveBeenCalledWith("/inter.woff2");
    expect(result).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><style>@font-face{font-family:\'Inter\';' +
        "font-weight:100 900;font-style:normal;src:url(data:font/woff2;base64,AQID) format('woff2')}</style><rect/></svg>"
    );
  });
});
