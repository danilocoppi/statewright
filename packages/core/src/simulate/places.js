// Where a run is, for a person watching it (simulator spec §4.3, §6.3): each step of a path as a node on its level, and
// the machine instances a run has — what the editor marks on each level and asks starting values for.
import { createModel, lastOf } from "./model.js";

/**
 * The levels a path goes through: for each of its node IDs, the canvas that holds it. Null when the document no longer
 * has the path (a recording made before a change).
 * @param {any} doc
 * @param {string} top The run's top canvas.
 * @param {string} path A state path or a flow token path.
 * @returns {Array<{ canvas: string, node: string }> | null}
 */
export function locate(doc, top, path) {
  const model = createModel(doc, top);
  const ids = path.split("/");
  try {
    return ids.map((_, index) => {
      const here = ids.slice(0, index + 1).join("/");
      model.nodeAt(here);
      return { canvas: model.canvasAt(here), node: lastOf(here) };
    });
  } catch {
    return null;
  }
}

/**
 * The machine instances a run of a top machine canvas has (spec §4.3): the top machine, keyed by its canvas, and each
 * state with a machine inside, keyed by its path — in the run's reading order, with the type of their context when
 * their canvas declares one. A flow has none: its context is its own.
 * @param {any} doc
 * @param {string} top
 * @returns {Array<{ key: string, path: string, canvas: string, name: string, context?: string }>}
 */
export function instancesOf(doc, top) {
  if (doc.canvases[top]?.kind !== "machine") return [];
  const model = createModel(doc, top);
  const of = (key, path, canvas, name) => ({
    key,
    path,
    canvas,
    name,
    ...(doc.canvases[canvas].context ? { context: doc.canvases[canvas].context } : {})
  });
  const found = [of(top, "", top, doc.canvases[top].name)];
  const visit = (owner, canvasId, seen) => {
    const states = Object.entries(doc.canvases[canvasId].nodes)
      .filter(([, node]) => node.kind === "state")
      .map(([id]) => (owner ? `${owner}/${id}` : id))
      .sort(model.compare);
    for (const path of states) {
      let inner = null;
      try {
        inner = model.interiorOf(model.nodeAt(path));
      } catch {
        // An interior the document no longer has: nothing runs there.
      }
      if (!inner || seen.has(inner)) continue;
      found.push(of(path, path, inner, model.nameAt(path)));
      visit(path, inner, new Set([...seen, inner]));
    }
  };
  visit("", top, new Set([top]));
  return found;
}
