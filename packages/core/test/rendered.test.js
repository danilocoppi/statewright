import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBatch } from "../src/commands/index.js";
import { toAuditReport } from "../src/audit/index.js";
import { toAIPack, toMarkdown } from "../src/docs/document.js";
import { autoLayout, measureOverlaps } from "../src/layout/index.js";
import { toDocumentPage, toScenarioPage, toSVG } from "../src/render/index.js";
import { check } from "../src/rules/index.js";
import { parse } from "../src/serialize/parse.js";
import { readExample } from "./helpers.js";

const rendered = (name, file) =>
  readFileSync(new URL(`../../../examples/rendered/${name}/${file}`, import.meta.url), "utf8");

describe.each(["bookings", "get-paid-as-built", "payments"])("examples/%s", name => {
  const doc = parse(readExample(`${name}.statewright.json`)).doc;

  it("has no errors", () => {
    expect(check(doc).filter(problem => problem.severity === "error")).toEqual([]);
  });

  it("lays out every canvas without overlaps (spec §26)", async () => {
    let working = doc;
    for (const canvasId of Object.keys(doc.canvases)) {
      const commands = await autoLayout(working, canvasId);
      if (commands.length) working = applyBatch(working, commands).doc;
      expect(measureOverlaps(working, canvasId), canvasId).toEqual([]);
    }
  });

  it("matches its rendered files (run npm run examples:render after changes)", async () => {
    for (const canvasId of Object.keys(doc.canvases))
      expect(rendered(name, `${canvasId}.svg`), canvasId).toBe(await toSVG(doc, canvasId));
    for (const scenarioId of Object.keys(doc.annotations.scenarios))
      expect(rendered(name, `${scenarioId}.html`), scenarioId).toBe(await toScenarioPage(doc, scenarioId));
    expect(rendered(name, "README.md")).toBe(toMarkdown(doc));
    expect(rendered(name, "documentation.html")).toBe(await toDocumentPage(doc));
    expect(rendered(name, "ai-pack.md")).toBe(toAIPack(doc));
    expect(rendered(name, "audit.md")).toBe(toAuditReport(doc));
  });
});
