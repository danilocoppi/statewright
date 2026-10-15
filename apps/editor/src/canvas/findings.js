// A finding badge's details (Core draws the badge, marked with its element and codes): which findings it shows. What is
// shown lives in a store, so Esc can close it before it does anything else (hover.js).
import { createHoverStore } from "./hover";

/**
 * @typedef {{ target: string, codes: string[], rect: { left: number, top: number, right: number, bottom: number } }}
 *   ShownBadge The badge whose findings are shown: its element, its codes and where it is in the window.
 */

/** The finding badge whose findings are shown (`shown`: a ShownBadge, or null). */
export const findingStore = createHoverStore();

/**
 * The findings a badge shows: those about its element whose codes it lists, in the order Core lists them (by ID).
 * @param {any} doc
 * @param {string} target
 * @param {string[]} codes
 * @returns {Array<{ id: string, code: string, title: string, severity: string, description?: string,
 *   source?: string, evidence?: any[] }>}
 */
export function findingsOn(doc, target, codes) {
  const findings = doc.annotations?.findings ?? {};
  return Object.keys(findings)
    .sort()
    .filter(id => findings[id].targets.includes(target) && codes.includes(findings[id].code))
    .map(id => ({ id, ...findings[id] }));
}
