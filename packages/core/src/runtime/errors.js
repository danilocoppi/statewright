// What createRuntime refuses (source-of-truth spec §7): the only place the runtime throws.

/** A design the runtime cannot run: `code` says why, `problems` lists what is wrong. */
export class RuntimeError extends Error {
  /**
   * @param {"design" | "expect" | "guards" | "machine"} code
   * @param {string} message
   * @param {object[]} [problems]
   */
  constructor(code, message, problems = []) {
    super(message);
    this.name = "RuntimeError";
    this.code = code;
    this.problems = problems;
  }
}
