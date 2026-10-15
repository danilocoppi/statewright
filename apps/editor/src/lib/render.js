import { layoutClient } from "@/workers";

/**
 * Core's SVG renderer (`toSVG` from `statewright/render`), run in the layout worker: it needs ELK (about 1.4 MB),
 * which the page itself never loads (spec §9). Same arguments and result as `toSVG`.
 * @param {object} doc
 * @param {string} canvasId
 * @param {{ header?: boolean, legend?: boolean, idPrefix?: string }} [options]
 * @returns {Promise<string>}
 */
export const renderSVG = (doc, canvasId, options = {}) => layoutClient().request("render", { doc, canvasId, options });

/**
 * Core's scenario page (`toScenarioPage` from `statewright/render`), made in the layout worker too: its figures may
 * need arranging. Same arguments and result as `toScenarioPage`.
 * @param {object} doc
 * @param {string} scenarioId
 * @param {{ fonts?: Array<{ family: string, weight: string, data: string }> }} [options]
 * @returns {Promise<string>}
 */
export const renderScenarioPage = (doc, scenarioId, options = {}) =>
  layoutClient().request("scenarioPage", { doc, scenarioId, options });

/**
 * Core's documentation page (`toDocumentPage` from `statewright/render`), made in the layout worker: its levels may
 * need arranging. Same arguments and result as `toDocumentPage`.
 * @param {object} doc
 * @param {{ fonts?: Array<{ family: string, weight: string, data: string }> }} [options]
 * @returns {Promise<string>}
 */
export const renderDocumentPage = (doc, options = {}) => layoutClient().request("documentPage", { doc, options });
