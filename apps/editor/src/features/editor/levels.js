// Levels and their addresses (spec §4.6, §6.3): the root level is /p/<project>, any other /p/<project>/<canvas>.
import { pathTo } from "statewright";

/** The address of a level. */
export const levelUrl = (doc, canvasId) =>
  canvasId === doc.root ? `/p/${doc.project.id}` : `/p/${doc.project.id}/${canvasId}`;

/** Whether a level is `inside` one, or somewhere below it. */
export function isWithin(doc, canvasId, inside) {
  for (let at = canvasId; at; at = parentLevel(doc, at)?.canvas) if (at === inside) return true;
  return false;
}

/**
 * The level above, and the box on it that holds this one; null at the top.
 * @returns {{ canvas: string, box: string } | null}
 */
export function parentLevel(doc, canvasId) {
  const path = pathTo(doc, canvasId);
  return path && path.length > 1 ? { canvas: path.at(-2).canvas, box: path.at(-1).via } : null;
}
