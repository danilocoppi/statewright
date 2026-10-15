import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "../serialize/parse.js";
import { verify } from "../signature.js";

/**
 * @typedef {object} Io Where the CLI reads and writes; the bin passes the process, tests pass fakes.
 * @property {string} cwd Directory that relative paths resolve against.
 * @property {(text: string) => void} stdout
 * @property {(text: string) => void} stderr
 * @property {() => Promise<string>} readStdin
 * @property {() => AsyncIterable<string>} lines Standard input, line by line (`statewright mcp`).
 */

/** A failure the CLI reports as one line on stderr (and as JSON with --json), exiting with `exitCode`. */
export class CliError extends Error {
  /**
   * @param {string} message
   * @param {{ exitCode?: number, details?: object }} [options] Exit code 2 = usage or I/O error (spec §24).
   */
  constructor(message, { exitCode = 2, details } = {}) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
    this.details = details;
  }
}

/** Print a value as indented JSON. */
export function printJson(io, value) {
  io.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

/** Text of a file, or of stdin when `file` is "-". */
export async function readInput(io, file) {
  if (file === "-") return io.readStdin();
  try {
    return await readFile(resolve(io.cwd, file), "utf8");
  } catch (error) {
    throw new CliError(`Cannot read ${file}: ${error.code === "ENOENT" ? "no such file" : error.message}`);
  }
}

/** Write a file relative to the working directory ("-" means stdin for reading, so it is never a target). */
export async function writeOutput(io, file, text) {
  if (file === "-") throw new CliError('Cannot write to "-": give a file path (with apply and migrate, --out <file>)');
  try {
    await writeFile(resolve(io.cwd, file), text);
  } catch (error) {
    throw new CliError(`Cannot write ${file}: ${error.message}`);
  }
}

/**
 * Read a valid document (migrated to the newest format). Fails with the first error when it is not valid;
 * `statewright validate` lists them all.
 * @returns {Promise<{ doc: any, raw: any, migrations: string[] }>} `raw` is the document as stored, before migration.
 */
export async function readDocument(io, file) {
  const text = await readInput(io, file);
  const result = parse(text);
  if (!result.ok) {
    const [first] = result.errors;
    throw new CliError(
      `${file} is not a valid Statewright document: ${first.path || "/"} ${first.message} ` +
        `(statewright validate ${file} lists every error)`,
      { details: { errors: result.errors } }
    );
  }
  const raw = result.migrations.length ? JSON.parse(text.replace(/^\uFEFF/, "")) : result.doc;
  return { doc: result.doc, raw, migrations: result.migrations };
}

/**
 * No silent laundering (spec §17): refuse to re-sign content changed outside Statewright unless accepted.
 * Unsigned documents and annotation or layout changes are fine.
 */
export async function guardSignature(raw, accept, file) {
  const status = await verify(raw);
  if (status.content === "changed" && !accept) {
    throw new CliError(
      `The content of ${file} was changed outside Statewright; review the change and pass --accept-changes to re-sign it`,
      { details: { signature: status } }
    );
  }
}

/** `generator` for documents written by the CLI. */
export function cliGenerator(options) {
  return options.agent ? { channel: "cli", agent: options.agent } : { channel: "cli" };
}
