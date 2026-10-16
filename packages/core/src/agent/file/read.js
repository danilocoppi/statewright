// The file host's reading operations (AI interface spec §4.2: read and query).
import { CATALOG_COLLECTIONS } from "../../constants.js";
import { buildIndex, hierarchy, pathTo, usagesOf } from "../../query/index.js";
import { check } from "../../rules/index.js";
import { AgentError } from "../errors.js";

/** The levels as a list in reading order, each with its depth: the root's tree, then catalog flows, then definitions. */
function levelsOf(doc) {
  const trees = hierarchy(doc);
  const out = [];
  const seen = new Set();
  const visit = (tree, depth) => {
    const canvas = doc.canvases[tree.canvas];
    if (!canvas || seen.has(tree.canvas)) return;
    seen.add(tree.canvas);
    out.push({ id: tree.canvas, name: canvas.name, kind: canvas.kind, depth, ...(tree.via ? { via: tree.via } : {}) });
    for (const child of tree.children) visit(child, depth + 1);
  };
  for (const tree of [trees.root, ...trees.catalog, ...trees.definitions]) visit(tree, 0);
  return out;
}

/** A level's canvas, or NOT_FOUND. */
export function canvasOf(doc, id) {
  const canvas = doc.canvases[id];
  if (!canvas) throw new AgentError("NOT_FOUND", `There is no level "${id}"; document.summary lists them`, { id });
  return canvas;
}

/** The names of the levels from the root to a level, as the Editor's path shows them: "Runtime › Lifecycle engine". */
function levelPathOf(doc, canvasId) {
  const steps = pathTo(doc, canvasId) ?? [{ canvas: canvasId }];
  return steps.map(step => doc.canvases[step.canvas].name).join(" › ");
}

/** An element's entry in the index, or NOT_FOUND. */
function entryOf(doc, id) {
  const entry = buildIndex(doc).get(id);
  if (!entry)
    throw new AgentError("NOT_FOUND", `There is no element "${id}"; query.find looks for one by name`, { id });
  return entry;
}

/** A catalog item's kind: its collection's name in the singular. */
const ITEM = {
  types: "type",
  events: "event",
  actions: "action",
  guards: "guard",
  endpoints: "endpoint",
  webhooks: "webhook",
  timers: "timer",
  statuses: "status",
  parties: "party",
  highlights: "highlight"
};

/** The kind of an indexed element as query.find reports it: a node's kind, a catalog item's kind, else its type. */
const kindOf = entry =>
  entry.type === "node" ? entry.value.kind
  : entry.type === "catalog" ? ITEM[entry.collection]
  : entry.type;

export const readOperations = {
  "document.summary": ({ doc }) => {
    const counts = { canvases: 0, nodes: 0, edges: 0, definitions: Object.keys(doc.definitions).length };
    for (const canvas of Object.values(doc.canvases)) {
      counts.canvases += 1;
      counts.nodes += Object.keys(canvas.nodes).length;
      counts.edges += Object.keys(canvas.edges).length;
    }
    for (const collection of Object.keys(CATALOG_COLLECTIONS)) {
      counts[collection] = Object.keys(doc.catalog[collection] ?? {}).length;
    }
    counts.scenarios = Object.keys(doc.annotations?.scenarios ?? {}).length;
    return {
      project: {
        id: doc.project.id,
        name: doc.project.name,
        ...(doc.project.stage ? { stage: doc.project.stage } : {})
      },
      format: doc.statewright,
      root: doc.root,
      levels: levelsOf(doc),
      counts
    };
  },
  "document.get": ({ doc }) => ({ document: doc }),
  "level.get": ({ doc }, { canvas: id }) => {
    const canvas = canvasOf(doc, id);
    const list = map => Object.entries(map ?? {}).map(([key, value]) => ({ id: key, ...value }));
    return {
      canvas: id,
      name: canvas.name,
      kind: canvas.kind,
      nodes: list(canvas.nodes),
      edges: list(canvas.edges),
      regions: list(canvas.regions)
    };
  },
  "query.find": ({ doc }, { text, kind }) => {
    const wanted = text.toLowerCase();
    const found = [];
    for (const entry of buildIndex(doc).entries.values()) {
      const name = entry.value?.name ?? entry.value?.label;
      if (typeof name !== "string" || !name.toLowerCase().includes(wanted)) continue;
      const what = kindOf(entry);
      if (kind && what !== kind && entry.type !== kind) continue;
      const where = entry.canvas ? { canvas: entry.canvas, path: levelPathOf(doc, entry.canvas) } : {};
      found.push({ id: entry.id, kind: what, name, ...where });
    }
    return { found };
  },
  "query.usages": ({ doc }, { id }) => {
    entryOf(doc, id);
    return { usages: usagesOf(doc, id) };
  },
  "query.path": ({ doc }, { id }) => {
    entryOf(doc, id);
    return { path: pathTo(doc, id) ?? [] };
  },
  "problems.list": ({ doc }, { severity, canvas }) => ({
    problems: check(doc).filter(
      problem => (!severity || problem.severity === severity) && (!canvas || problem.canvas === canvas)
    )
  })
};
