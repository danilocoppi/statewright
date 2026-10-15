// Documents for tests: the repository's examples and a small hand-made project.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { applyBatch, createDocument, parse } from "statewright";
import { autoLayout } from "statewright/layout";

/** The repository's examples; tests run from apps/editor (npm test -w @statewright/editor). */
const EXAMPLES = resolve(process.cwd(), "../../examples");

/** The text of examples/<name>.sttw. */
export const exampleText = name => readFileSync(resolve(EXAMPLES, `${name}.sttw`), "utf8");

/** A parsed example document. */
export function readExample(name) {
  const result = parse(exampleText(name));
  if (!result.ok) throw new Error(`examples/${name} does not parse`);
  return result.doc;
}

/** A new project "Demo" (root canvas cnv_demo, a system canvas) with one service, nod_api. */
export function demoDoc() {
  const doc = createDocument({ name: "Demo" });
  doc.canvases.cnv_demo.nodes.nod_api = { kind: "service", name: "API" };
  return doc;
}

/** The command that adds a service to the demo's root canvas. */
export const addService = (id, name) => ({
  type: "node.add",
  args: { canvas: "cnv_demo", id, node: { kind: "service", name } }
});

/** A parsed example with every level laid out, as the Editor stores it once each level has been shown. */
export async function placedExample(name) {
  let doc = readExample(name);
  for (const canvasId of Object.keys(doc.canvases)) {
    const commands = await autoLayout(doc, canvasId);
    if (commands.length) doc = applyBatch(doc, commands).doc;
  }
  return doc;
}
