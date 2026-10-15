// The errors of the agent contract (AI interface spec §4.1): stable codes, an English message that says what to do,
// and details that name the field, the element or the step.
import { ERROR_CODES } from "../commands/errors.js";

/** Every code an operation can fail with: the commands' own, then the contract's. */
export const AGENT_ERROR_CODES = Object.freeze([
  ...ERROR_CODES,
  "BAD_ARGUMENTS",
  "NEEDS_EDITOR",
  "EDITOR_GONE",
  "READ_ONLY",
  "SIMULATING",
  "NOT_AI_CHANGE",
  "BUSY",
  "TIMEOUT",
  "NOT_PAIRED",
  "STOPPED",
  "FILE",
  "INTERNAL"
]);

/** A failure a host reports as the operation's result. */
export class AgentError extends Error {
  /**
   * @param {string} code One of AGENT_ERROR_CODES.
   * @param {string} message What happened, and what to do.
   * @param {object} [details]
   */
  constructor(code, message, details) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.details = details;
  }
}

/** A successful result. */
export const success = result => ({ ok: true, result });

/**
 * A failed result, from a code and a message or from what was thrown: an AgentError, a CommandError (its code and,
 * in a batch, the failing command's index), or anything else (`INTERNAL`).
 * @returns {{ ok: false, error: { code: string, message: string, details?: object } }}
 */
export function failure(error, message, details) {
  if (typeof error === "string") return { ok: false, error: { code: error, message, ...(details ? { details } : {}) } };
  if (error instanceof AgentError) return failure(error.code, error.message, error.details);
  if (error?.name === "CommandError") {
    const where = error.index === undefined ? {} : { index: error.index };
    const extra = { ...where, ...(Object.keys(error.details ?? {}).length ? error.details : {}) };
    return failure(error.code, error.message, Object.keys(extra).length ? extra : undefined);
  }
  return failure("INTERNAL", String(error?.message ?? error));
}
