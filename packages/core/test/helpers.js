import { readFileSync } from "node:fs";
import { FORMAT_VERSION } from "../src/constants.js";

/** Raw text of an example under /examples. */
export function readExample(name) {
  return readFileSync(new URL(`../../../examples/${name}`, import.meta.url), "utf8");
}

/** A deep copy of the parsed payments example. */
export function paymentsDoc() {
  return JSON.parse(readExample("payments.sttw"));
}

/** The smallest valid document: one empty system canvas. */
export function minimalDoc() {
  return {
    statewright: FORMAT_VERSION,
    project: { id: "prj_demo", name: "Demo" },
    root: "cnv_root",
    catalog: {
      types: {},
      events: {},
      actions: {},
      guards: {},
      endpoints: {},
      webhooks: {},
      timers: {},
      statuses: {},
      parties: {},
      highlights: {}
    },
    definitions: {},
    canvases: { cnv_root: { kind: "system", name: "Root", nodes: {}, edges: {} } }
  };
}
