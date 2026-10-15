import { check } from "statewright";
import { toDocumentPage, toScenarioPage, toSVG } from "statewright/render";
import { describe, expect, it } from "vitest";

import { handlers as layout } from "@/workers/layout";
import { handlers as problems } from "@/workers/problems";

import { readExample } from "../fixtures.js";

describe("the workers' work", () => {
  it("places every node of a level that has no positions", async () => {
    const doc = readExample("payments");
    const commands = await layout.layout({ doc, canvasId: "cnv_runtime", scope: "missing" });
    const placed = commands.filter(command => command.type === "layout.node.set").map(command => command.args.id);
    expect(placed.sort()).toEqual(Object.keys(doc.canvases.cnv_runtime.nodes).sort());
  });

  it("leaves a laid-out level as it is", async () => {
    expect(
      await layout.layout({ doc: readExample("get-paid-as-built"), canvasId: "cnv_open", scope: "missing" })
    ).toEqual([]);
  });

  it("draws a level as Core's SVG, for exports and thumbnails", async () => {
    const doc = readExample("get-paid-as-built");
    const options = { header: false, idPrefix: "x" };
    expect(await layout.render({ doc, canvasId: "cnv_open", options })).toBe(await toSVG(doc, "cnv_open", options));
  });

  it("makes a scenario's page as Core does: its figures may need arranging", async () => {
    const doc = readExample("payments");
    const options = { fonts: [{ family: "Inter", weight: "400", data: "AQID" }] };
    expect(await layout.scenarioPage({ doc, scenarioId: "scn_paysInTime", options })).toBe(
      await toScenarioPage(doc, "scn_paysInTime", options)
    );
  });

  it("makes the documentation page as Core does: its levels may need arranging", async () => {
    const doc = readExample("payments");
    const options = { fonts: [{ family: "Inter", weight: "400", data: "AQID" }] };
    expect(await layout.documentPage({ doc, options })).toBe(await toDocumentPage(doc, options));
  });

  it("finds exactly Core's Problems", () => {
    const doc = readExample("payments");
    expect(problems.check({ doc })).toEqual(check(doc));
  });
});
