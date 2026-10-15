import { applyBatch } from "../../commands/engine.js";
import { CommandError } from "../../commands/errors.js";
import { check } from "../../rules/index.js";
import { stringify } from "../../serialize/stringify.js";
import { sign } from "../../signature.js";
import { formatSummary, summarize } from "../format.js";
import { CliError, cliGenerator, guardSignature, printJson, readDocument, readInput, writeOutput } from "../io.js";

/** The commands of a batch file: an array of commands, or a single command. */
function parseBatch(text, source) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new CliError(`${source === "-" ? "stdin" : source} is not JSON: ${error.message}`);
  }
  return Array.isArray(value) ? value : [value];
}

/** `statewright apply <file> <commands.json | ->` (spec §24). */
export default {
  name: "apply",
  usage: "apply <file> <commands.json | -> [--out <file>] [--dry-run] [--agent <name>] [--accept-changes]",
  summary: "Apply a batch of commands atomically, re-sign and write the document.",
  args: [2, 2],
  options: {
    out: { type: "string" },
    "dry-run": { type: "boolean" },
    agent: { type: "string" },
    "accept-changes": { type: "boolean" }
  },
  async run({ args: [file, source], options, json, io }) {
    const { doc, raw } = await readDocument(io, file);
    await guardSignature(raw, options["accept-changes"], file);
    const commands = parseBatch(await readInput(io, source), source);
    let result;
    try {
      result = applyBatch(doc, commands);
    } catch (error) {
      if (!(error instanceof CommandError)) throw error;
      const which = error.index === undefined ? "The batch" : `Command ${error.index} (${commands[error.index]?.type})`;
      throw new CliError(`${which} failed — ${error.code}: ${error.message}`, {
        details: { code: error.code, index: error.index, details: error.details }
      });
    }
    const target = options.out ?? file;
    const written = options["dry-run"] ? null : target;
    if (written) await writeOutput(io, written, stringify(await sign(result.doc, cliGenerator(options))));
    const summary = summarize(check(result.doc));
    if (json) {
      printJson(io, { ok: true, file, written, applied: commands.length, created: result.created, summary });
      return 0;
    }
    io.stdout(
      `Applied ${commands.length} command(s) to ${file}; ${written ? `wrote ${written}` : "dry run, nothing written"}\n`
    );
    if (result.created.length) io.stdout(`created: ${result.created.join(", ")}\n`);
    io.stdout(`problems: ${formatSummary(summary)} (statewright validate ${target} lists them)\n`);
    return 0;
  }
};
