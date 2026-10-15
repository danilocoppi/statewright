// Checking calls against the agent contract (AI interface spec §4.1): an operation's name, its arguments, its result,
// and the JSON Schema an MCP client reads.
import { z } from "zod";
import { failure } from "./errors.js";
import { CALL_ERRORS, OPERATIONS } from "./operations.js";

const BY_NAME = new Map(OPERATIONS.map(operation => [operation.name, operation]));

/** An operation by its name, or undefined. */
export const operationNamed = name => BY_NAME.get(name);

/** The MCP tool name of an operation: `document.summary` → `document_summary` (some clients refuse dots). */
export const toolNameOf = name => name.replace(".", "_");

/** The operation an MCP tool name stands for, or undefined. */
export const operationOfTool = tool => BY_NAME.get(tool.replace("_", "."));

/** Every code a call of an operation can answer: its own, then those of any call. */
export const errorsOf = name => [...new Set([...(BY_NAME.get(name)?.errors ?? []), ...CALL_ERRORS])];

/** Zod's issues as `{ path, message }`, the path joined with dots. */
const issuesOf = error => error.issues.map(issue => ({ path: issue.path.join("."), message: issue.message }));

/**
 * Check a call before a host runs it: the operation exists and its arguments fit its schema (defaults filled in).
 * @param {string} name
 * @param {unknown} args
 * @returns {{ ok: true, operation: import("./operations.js").Operation, args: object } | { ok: false, error: object }}
 */
export function validateCall(name, args = {}) {
  const operation = BY_NAME.get(name);
  if (!operation) return failure("BAD_ARGUMENTS", `There is no operation "${name}"; the contract lists them all`);
  const parsed = operation.input.safeParse(args ?? {});
  if (!parsed.success) {
    const errors = issuesOf(parsed.error);
    const first = errors[0];
    return failure("BAD_ARGUMENTS", `Invalid arguments for ${name}: ${first.path || "(arguments)"} ${first.message}`, {
      path: first.path,
      errors
    });
  }
  return { ok: true, operation, args: parsed.data };
}

/**
 * Check what a host returned for an operation against the operation's result schema (the contract's own tests, and
 * hosts that want to be sure).
 * @returns {{ ok: true } | { ok: false, errors: Array<{ path: string, message: string }> }}
 */
export function checkResult(name, result) {
  const parsed = BY_NAME.get(name).result.safeParse(result);
  return parsed.success ? { ok: true } : { ok: false, errors: issuesOf(parsed.error) };
}

/**
 * The JSON Schema of an operation's arguments (draft 2020-12), as the MCP server publishes it.
 * @param {string} name
 */
export function inputSchemaOf(name) {
  const schema = z.toJSONSchema(BY_NAME.get(name).input, { io: "input", unrepresentable: "any" });
  delete schema.$schema;
  return schema;
}
