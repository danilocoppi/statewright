import { applyBatch } from "../../src/commands/index.js";
import { CommandError } from "../../src/commands/errors.js";

/** Apply commands and return the new document. */
export function run(doc, ...commands) {
  return applyBatch(doc, commands).doc;
}

/** Apply commands that must fail; return the CommandError. */
export function failure(doc, ...commands) {
  try {
    applyBatch(doc, commands);
  } catch (error) {
    if (error instanceof CommandError) return error;
    throw error;
  }
  throw new Error("Expected the batch to fail");
}

/** Shorthand for a command object. */
export const cmd = (type, args) => ({ type, args });

/** Minimal document plus a machine canvas cnv_m (owned by nothing) with states a and b. */
export function machineDoc(base) {
  const doc = structuredClone(base);
  doc.canvases.cnv_m = {
    kind: "machine",
    name: "M",
    nodes: { nod_a: { kind: "state", name: "a" }, nod_b: { kind: "state", name: "b" } },
    edges: { edg_ab: { from: "nod_a", to: "nod_b" } }
  };
  return doc;
}
