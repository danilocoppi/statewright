import { buildIndex, hierarchy, pathTo, usagesOf } from "../../query/index.js";
import { formatTree } from "../format.js";
import { CliError, printJson, readDocument } from "../io.js";

/** Element counts of a document. */
function countsOf(doc) {
  const canvases = Object.values(doc.canvases);
  return {
    canvases: canvases.length,
    nodes: canvases.reduce((sum, canvas) => sum + Object.keys(canvas.nodes).length, 0),
    edges: canvases.reduce((sum, canvas) => sum + Object.keys(canvas.edges).length, 0),
    definitions: Object.keys(doc.definitions).length,
    catalog: Object.values(doc.catalog).reduce((sum, items) => sum + Object.keys(items).length, 0)
  };
}

/** `statewright inspect <file> [id]` (spec §24). */
export default {
  name: "inspect",
  usage: "inspect <file> [id]",
  summary: "Print the levels of a document, or one element with its location and usages.",
  args: [1, 2],
  options: {},
  async run({ args: [file, id], json, io }) {
    const { doc } = await readDocument(io, file);
    if (id === undefined) {
      const levels = hierarchy(doc);
      const counts = countsOf(doc);
      if (json) {
        printJson(io, { ok: true, project: doc.project, counts, hierarchy: levels });
        return 0;
      }
      io.stdout(`${doc.project.name} (${doc.project.id})\n`);
      io.stdout(
        `${counts.canvases} canvases · ${counts.nodes} nodes · ${counts.edges} edges · ` +
          `${counts.definitions} definitions · ${counts.catalog} catalog items\n\n`
      );
      io.stdout(formatTree(doc, levels.root));
      if (levels.catalog.length) {
        io.stdout("\nCatalog implementations\n");
        for (const tree of levels.catalog) io.stdout(formatTree(doc, tree, 1));
      }
      if (levels.definitions.length) {
        io.stdout("\nDefinitions\n");
        for (const tree of levels.definitions) io.stdout(formatTree(doc, tree, 1));
      }
      return 0;
    }

    const entry = buildIndex(doc).get(id);
    if (!entry) throw new CliError(`No element with ID "${id}" in ${file}`);
    const element = { id, type: entry.type };
    if (entry.collection) element.collection = entry.collection;
    if (entry.canvas) element.canvas = entry.canvas;
    element.value = entry.value;
    const path = pathTo(doc, id);
    const usages = usagesOf(doc, id).map(({ section, source, field }) => ({ section, source, field }));
    if (json) {
      printJson(io, { ok: true, element, path, usages });
      return 0;
    }
    io.stdout(`${id}  ${entry.type}${entry.collection ? ` (${entry.collection})` : ""}\n`);
    if (path) {
      const steps = path.flatMap(step => [step.via, step.definition, step.canvas].filter(Boolean));
      io.stdout(`level: ${steps.join(" › ")}\n`);
    }
    io.stdout(`${JSON.stringify(entry.value, null, 2)}\n`);
    if (!usages.length) io.stdout("used by: nothing\n");
    else io.stdout(`used by:\n${usages.map(usage => `  ${usage.source ?? "(document)"}  ${usage.field}\n`).join("")}`);
    return 0;
  }
};
