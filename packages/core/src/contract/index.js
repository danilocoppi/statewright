// statewright/contract (source-of-truth spec §5): a design as a language-neutral contract — its machines, its flows and
// its scenarios as test vectors — for code to be built from and checked against; and what changed between two.
import { check } from "../rules/index.js";
import { canonicalize } from "../serialize/canonical.js";
import { computeHashes } from "../signature.js";
import { flowsOf } from "./flows.js";
import { machinesOf } from "./machines.js";
import { vectorsOf } from "./vectors.js";
import { typedView } from "../roles/typed.js";

export { diffContracts, toChangesMarkdown } from "./diff.js";
export { namePath } from "./vectors.js";

/** The contract format this version writes. */
export const CONTRACT_VERSION = "1";

/** The Problems that make a contract ambiguous for code: two states a field cannot tell apart. */
const CONTRACT_RULES = new Set(["machine.sameName"]);

/**
 * A design's contract, and the Problems that make it ambiguous.
 * @param {any} doc A schema-valid document.
 * @returns {Promise<{ contract: object, problems: object[] }>}
 */
export async function toContract(doc) {
  // Hashed and checked as written; mixed levels read as the typed levels they run as (mixed levels spec §4.5).
  const { content } = await computeHashes(doc);
  const problems = check(doc).filter(problem => CONTRACT_RULES.has(problem.code));
  doc = typedView(doc);
  const { vectors, stale } = vectorsOf(doc);
  const contract = {
    contract: CONTRACT_VERSION,
    source: { project: doc.project.id, name: doc.project.name, format: doc.statewright, content },
    machines: machinesOf(doc),
    flows: flowsOf(doc),
    vectors,
    stale
  };
  return { contract, problems };
}

/**
 * A contract as its file holds it: keys sorted, two-space indent, a final newline — the same design, the same bytes.
 * @param {object} contract
 * @returns {string}
 */
export function stringifyContract(contract) {
  return `${JSON.stringify(JSON.parse(canonicalize(contract)), null, 2)}\n`;
}

/**
 * Read a contract's text, or say why it is not one.
 * @param {string} text
 * @returns {{ ok: true, contract: object } | { ok: false, message: string }}
 */
export function parseContract(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: `is not JSON (${error.message})` };
  }
  if (value?.contract !== CONTRACT_VERSION) {
    return {
      ok: false,
      message: `is not a contract of format ${CONTRACT_VERSION}${value?.contract ? ` (format ${value.contract})` : ""}`
    };
  }
  return { ok: true, contract: value };
}
