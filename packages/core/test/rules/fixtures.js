import { check } from "../../src/rules/index.js";
import { minimalDoc } from "../helpers.js";

/**
 * A document with no problems at all: the root system canvas has a service whose interior is the complete
 * machine cnv_m (initial → idle → busy → done), and the action act_work is implemented by the flow cnv_f.
 */
export function cleanDoc() {
  const doc = minimalDoc();
  doc.catalog.events.evt_go = { name: "go", payload: null };
  doc.catalog.events.evt_stop = { name: "stop", payload: null };
  doc.catalog.actions.act_work = { name: "Work", inner: { canvas: "cnv_f" } };
  doc.canvases.cnv_root.nodes.nod_engine = { kind: "service", name: "Engine", inner: { canvas: "cnv_m" } };
  doc.canvases.cnv_m = {
    kind: "machine",
    name: "Machine",
    transitions: "complete",
    nodes: {
      nod_init: { kind: "initial" },
      nod_idle: { kind: "state", name: "idle" },
      nod_busy: { kind: "state", name: "busy", onEntry: [{ action: "act_work" }] },
      nod_done: { kind: "state", name: "done", outcome: "success", terminal: true }
    },
    edges: {
      edg_initIdle: { from: "nod_init", to: "nod_idle" },
      edg_idleBusy: { from: "nod_idle", to: "nod_busy", on: ["evt_go"] },
      edg_busyDone: { from: "nod_busy", to: "nod_done", on: ["evt_stop"] }
    }
  };
  doc.canvases.cnv_f = {
    kind: "flow",
    name: "Work",
    nodes: {
      nod_start: { kind: "start" },
      nod_tell: { kind: "emit", event: "evt_stop" },
      nod_end: { kind: "end" }
    },
    edges: {
      edg_startTell: { from: "nod_start", to: "nod_tell" },
      edg_tellEnd: { from: "nod_tell", to: "nod_end" }
    }
  };
  return doc;
}

/** Problems of one rule code. */
export const problems = (doc, code) => check(doc).filter(problem => problem.code === code);

/** Targets of one rule code's problems. */
export const targets = (doc, code) => problems(doc, code).map(problem => problem.target);
