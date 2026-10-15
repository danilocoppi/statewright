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

/** A link (a `ref` box) to add to a level. */
const link = (canvas, id, target) => ({ type: "node.add", args: { canvas, id, node: { kind: "ref", target } } });

/**
 * Payments with links, placed: on the expiry clock (inside the lifecycle engine), to a state of the level above, to one
 * of its own states, to a level, to a reusable part, to a catalog item, to the project, and one whose target is gone (as
 * a file edited by hand could leave it); on the top level, one back to the expiry clock.
 */
export async function linkedPayments() {
  let doc = applyBatch(await placedExample("payments"), [
    link("cnv_expiryClock", "nod_toHold", "nod_complianceHold"),
    link("cnv_expiryClock", "nod_toPaused", "nod_paused"),
    link("cnv_expiryClock", "nod_toRuntime", "cnv_runtime"),
    link("cnv_expiryClock", "nod_toPart", "def_crossBorderSend"),
    link("cnv_expiryClock", "nod_toEvent", "evt_holdOpened"),
    link("cnv_expiryClock", "nod_toProject", "prj_payments"),
    link("cnv_expiryClock", "nod_toGone", "nod_complianceHold"),
    link("cnv_runtime", "nod_toClock", "cnv_expiryClock")
  ]).doc;
  for (const canvasId of ["cnv_expiryClock", "cnv_runtime"]) {
    const commands = await autoLayout(doc, canvasId);
    if (commands.length) doc = applyBatch(doc, commands).doc;
  }
  const edited = structuredClone(doc);
  edited.canvases.cnv_expiryClock.nodes.nod_toGone.target = "nod_removedLongAgo";
  return edited;
}
