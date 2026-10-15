import { CATALOG_COLLECTIONS, FORMAT_VERSION } from "./constants.js";
import { makeId } from "./ids.js";
import { Project } from "./schema/document.js";

const NOTHING_TAKEN = { has: () => false };

/** The kinds of root level a new document can have. */
export const DOCUMENT_KINDS = ["system", "machine", "flow", "mixed"];

/**
 * A root level's starting elements, without errors (editor spec §6.2): a machine's initial node leading to a first
 * state, a flow's start leading to an end; a system starts empty.
 */
function skeleton(kind, names) {
  if (kind === "machine") {
    return {
      nodes: { nod_initial: { kind: "initial" }, nod_firstState: { kind: "state", name: names.state } },
      edges: { edg_initialFirstState: { from: "nod_initial", to: "nod_firstState" } }
    };
  }
  if (kind === "flow") {
    return {
      nodes: { nod_start: { kind: "start" }, nod_end: { kind: "end", name: names.end, outcome: "success" } },
      edges: { edg_startEnd: { from: "nod_start", to: "nod_end" } }
    };
  }
  return { nodes: {}, edges: {} };
}

/**
 * A new, valid document: the project and a root level named after it — an empty system, or a machine or a flow with
 * its starting elements. Unsigned; `sign` it before writing.
 * @param {{ name: string, id?: string, kind?: "system" | "machine" | "flow", names?: { state?: string, end?: string } }}
 *   project `id` defaults to one generated from the name (`prj_payments`); `names`: the starting elements' names
 *   (default "First state" and "Done").
 * @returns {object}
 */
export function createDocument({ name, id, kind = "system", names = {} }) {
  const project = { id: id ?? makeId("prj", name, NOTHING_TAKEN), name };
  const result = Project.safeParse(project);
  if (!result.success) {
    throw new TypeError(`Invalid project: ${result.error.issues.map(issue => issue.message).join("; ")}`);
  }
  if (!DOCUMENT_KINDS.includes(kind)) throw new TypeError(`Invalid kind: ${kind} (system, machine, flow or mixed)`);
  const root = makeId("cnv", name, NOTHING_TAKEN);
  const starting = skeleton(kind, { state: "First state", end: "Done", ...names });
  return {
    statewright: FORMAT_VERSION,
    project,
    root,
    catalog: Object.fromEntries(Object.keys(CATALOG_COLLECTIONS).map(collection => [collection, {}])),
    definitions: {},
    canvases: { [root]: { kind, name, ...starting } }
  };
}
