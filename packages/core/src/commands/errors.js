/** Error codes of failed commands (spec §25). */
export const ERROR_CODES = Object.freeze([
  "INVALID_ARGS",
  "NOT_FOUND",
  "WRONG_KIND",
  "NOT_ALLOWED",
  "IN_USE",
  "ID_TAKEN",
  "INVALID_ID",
  "SCHEMA"
]);

/** A command that cannot be applied. In a batch, `index` is the position of the failing command. */
export class CommandError extends Error {
  /**
   * @param {string} code One of ERROR_CODES.
   * @param {string} message
   * @param {object} [details]
   */
  constructor(code, message, details = {}) {
    super(message);
    this.name = "CommandError";
    this.code = code;
    this.details = details;
    /** @type {number|undefined} */
    this.index = undefined;
  }
}

/**
 * Throw a CommandError.
 * @param {string} code
 * @param {string} message
 * @param {object} [details]
 * @returns {never}
 */
export function fail(code, message, details) {
  throw new CommandError(code, message, details);
}
