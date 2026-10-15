// Importing a file (spec §4.5): parse with migrations, check the signature, compare with the local copy, and decide
// whether the person must review it first.
import { canonicalize, makeId, parse, verify } from "statewright";

import { diffDocuments } from "./diff";

/**
 * @typedef {{ content: string, layout: string, annotations: string }} Sections `ok`, `changed` or `missing` each.
 * @typedef {{ status: "invalid", fileName: string, errors: Array<{ path: string, message: string }> }} InvalidImport
 * @typedef {{ status: "open", fileName: string, doc: object, migrations: string[], existing: boolean }} DirectImport
 *   Intact and new (`existing: false`), or the same document as the local copy (`existing: true`, `doc` is the local
 *   copy): open without asking.
 * @typedef {{ status: "review", fileName: string, doc: object, migrations: string[], sections: Sections,
 *   local: object | null, diff: import("./diff").DocumentDiff | null }} ReviewImport
 * @typedef {InvalidImport | DirectImport | ReviewImport} ImportPlan
 */

/** Two documents with the same content, layout and annotations, whoever signed them. */
export function sameDocument(a, b) {
  const unsigned = ({ signature: _signature, generator: _generator, ...rest }) => canonicalize(rest);
  return unsigned(a) === unsigned(b);
}

/**
 * @param {string} text The file's text.
 * @param {{ fileName: string, loadLocal: (projectId: string) => Promise<object | null> }} options
 * @returns {Promise<ImportPlan>}
 */
export async function readImport(text, { fileName, loadLocal }) {
  const parsed = parse(text);
  if (!parsed.ok) return { status: "invalid", fileName, errors: parsed.errors };
  const { doc, migrations } = parsed;
  // A copy in this browser that cannot be read is no copy: the file replaces it (`damaged` says so).
  let local = null;
  let damaged = false;
  try {
    local = await loadLocal(doc.project.id);
  } catch {
    damaged = true;
  }
  if (local && sameDocument(local, doc)) return { status: "open", fileName, doc: local, migrations, existing: true };
  // The signature is judged on the file as it was written: a migration changes the format version it covers.
  const sections = await verify(migrations.length ? JSON.parse(text.replace(/^\uFEFF/, "")) : doc);
  const intact = Object.values(sections).every(state => state === "ok");
  if (intact && !local) return { status: "open", fileName, doc, migrations, existing: false, damaged };
  return {
    status: "review",
    fileName,
    doc,
    migrations,
    sections,
    local,
    damaged,
    diff: local ? diffDocuments(local, doc) : null
  };
}

/**
 * The document to store when importing as a copy: a new project ID and "(copy)" after the name.
 * @param {object} doc
 * @param {{ has(id: string): boolean }} taken Project IDs already in this browser.
 * @param {string} copyName The translated name, for example "Get paid (copy)".
 */
export function copyOf(doc, taken, copyName) {
  return { ...doc, project: { ...doc.project, id: makeId("prj", copyName, taken), name: copyName } };
}
