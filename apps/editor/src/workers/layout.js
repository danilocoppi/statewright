// The layout worker's work: Core's auto-layout, its SVG renderer, scenario pages and the documentation page (ELK is loaded here, never in the
// page).
import { autoLayout } from "statewright/layout";
import { toDocumentPage, toScenarioPage, toSVG } from "statewright/render";

export const handlers = {
  /** @param {{ doc: object, canvasId: string, scope: "missing" | "all" }} payload */
  layout: ({ doc, canvasId, scope }) => autoLayout(doc, canvasId, { scope }),
  /** @param {{ doc: object, canvasId: string, options?: object }} payload */
  render: ({ doc, canvasId, options }) => toSVG(doc, canvasId, options),
  /** @param {{ doc: object, scenarioId: string, options?: object }} payload */
  scenarioPage: ({ doc, scenarioId, options }) => toScenarioPage(doc, scenarioId, options),
  /** @param {{ doc: object, options?: object }} payload */
  documentPage: ({ doc, options }) => toDocumentPage(doc, options)
};
