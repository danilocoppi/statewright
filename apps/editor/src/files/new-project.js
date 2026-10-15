// New projects (spec §6.2): a root canvas of the chosen kind with Core's skeleton, which has no errors — machines start
// with an initial node leading to a first state, flows with a start step leading to an end.
import { DOCUMENT_KINDS, createDocument, makeId } from "statewright";

/** Kinds of root canvas the Projects screen offers. */
export const PROJECT_KINDS = DOCUMENT_KINDS;

/**
 * @param {{ name: string, kind: "system" | "machine" | "flow", names: { state: string, end: string } }} project
 *   `names` are the starting elements' names in the person's language ("First state", "Done").
 * @param {{ has(id: string): boolean }} taken Project IDs already in this browser.
 * @returns {object} A valid, unsigned document.
 */
export function newProject({ name, kind, names }, taken) {
  return createDocument({ name, id: makeId("prj", name, taken), kind, names });
}
