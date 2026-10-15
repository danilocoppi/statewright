import { documentSchema, toCamel } from "../../src/index.js";
import { start, step } from "../../src/simulate/index.js";
import { minimalDoc } from "../helpers.js";

/** When the runs of these tests start. */
export const AT = "2026-01-05T09:00:00Z";

/** Catalog events with these names: "leg.halted" is evt_legHalted. */
export const events = (...names) => Object.fromEntries(names.map(name => [`evt_${toCamel(name)}`, { name }]));

/** A machine canvas. */
export const machine = (name, nodes, edges = {}, extra = {}) => ({ kind: "machine", name, nodes, edges, ...extra });

/** A flow canvas. */
export const flow = (name, nodes, edges = {}, extra = {}) => ({ kind: "flow", name, nodes, edges, ...extra });

/**
 * A document with these canvases (the first is the root), catalog collections and definitions; it must be valid.
 * @param {Record<string, object>} canvases
 * @param {Record<string, object>} [catalog]
 * @param {Record<string, object>} [definitions]
 */
export function docOf(canvases, catalog = {}, definitions = {}) {
  const doc = minimalDoc();
  doc.root = Object.keys(canvases)[0];
  doc.canvases = canvases;
  doc.definitions = definitions;
  for (const [collection, items] of Object.entries(catalog)) doc.catalog[collection] = items;
  const result = documentSchema.safeParse(doc);
  if (!result.success) throw new Error(`invalid test document: ${JSON.stringify(result.error.issues.slice(0, 2))}`);
  return doc;
}

/** Start a run of the document's root at AT. */
export const begin = (doc, init = {}) => start(doc, { canvas: doc.root, at: AT, ...init });

/** Take steps one after the other (an event ID stands for that event); stops at the first that is not done. */
export function walk(doc, result, ...inputs) {
  let current = result;
  for (const input of inputs) {
    if (current.status !== "done") return current;
    current = step(doc, current.session, typeof input === "string" ? { do: { event: input } } : input);
  }
  return current;
}

/** The trace's entries of one type. */
export const of = (trace, type) => trace.filter(entry => entry.type === type);

/** The trace as its entries' types. */
export const types = trace => trace.map(entry => entry.type);
