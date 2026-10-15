// The results a system's tests write after running a contract's vectors (source-of-truth spec §6, Results): for each
// vector, the active states the code reached at its start and after each step, the message of a step that threw, or
// why it was not run.
import { stringifyContract } from "../contract/index.js";
import { sha256Hex } from "../signature.js";

/** The results format this version reads and writes. */
export const RESULTS_VERSION = "1";

/**
 * What results name the contract they ran by: the SHA-256 of the contract as its file holds it (`statewright contract
 * -o`), so results are compared only with the design and the scenarios they ran — not just its specification.
 * @param {object} contract
 * @returns {Promise<string>}
 */
export const contractDigest = contract => sha256Hex(stringifyContract(contract));

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = value => typeof value === "string" && value.length > 0;

/** Why a step is not one: it needs `active` (a list of names) or `error` (a message). */
function stepProblem(step, where) {
  if (!isObject(step)) return `${where} is not an object`;
  if ("error" in step) return typeof step.error === "string" ? null : `${where}.error is not a message (a string)`;
  if (!Array.isArray(step.active) || !step.active.every(name => typeof name === "string"))
    return `${where} needs active (a list of state names) or error (a message)`;
  return null;
}

/** Why a vector's result is not one. */
function vectorProblem(vector, where) {
  if (!isObject(vector)) return `${where} is not an object`;
  if (!isText(vector.id)) return `${where}.id is not a vector's ID`;
  if ("skipped" in vector)
    return typeof vector.skipped === "string" ? null : `${where}.skipped is not a reason (a string)`;
  if (!Array.isArray(vector.steps)) return `${where} needs steps (a list) or skipped (a reason)`;
  for (const [index, step] of vector.steps.entries()) {
    const problem = stepProblem(step, `${where}.steps[${index}]`);
    if (problem) return problem;
  }
  return null;
}

/**
 * Say whether a value is a results object, and why not, naming the field.
 * @param {unknown} value
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function checkResults(value) {
  if (!isObject(value)) return { ok: false, message: "is not a results object" };
  if (value.results !== RESULTS_VERSION) {
    const found = value.results === undefined ? "" : ` (format ${JSON.stringify(value.results)})`;
    return { ok: false, message: `is not a results file of format ${RESULTS_VERSION}${found}` };
  }
  if (!isText(value.contract)) return { ok: false, message: "needs contract, the SHA-256 of the contract run" };
  if ("runner" in value && typeof value.runner !== "string") return { ok: false, message: "runner is not a name" };
  if (!Array.isArray(value.vectors)) return { ok: false, message: "needs vectors, a list" };
  const seen = new Map();
  for (const [index, vector] of value.vectors.entries()) {
    const problem = vectorProblem(vector, `vectors[${index}]`);
    if (problem) return { ok: false, message: problem };
    // Two results for one vector would hide one of them: results of several drivers are one entry per vector.
    if (seen.has(vector.id))
      return { ok: false, message: `vectors[${index}].id repeats vectors[${seen.get(vector.id)}].id` };
    seen.set(vector.id, index);
  }
  return { ok: true };
}

/**
 * Read a results file's text, or say why it is not one.
 * @param {string} text
 * @returns {{ ok: true, results: object } | { ok: false, message: string }}
 */
export function parseResults(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: `is not JSON (${error.message})` };
  }
  const checked = checkResults(value);
  return checked.ok ? { ok: true, results: value } : checked;
}
