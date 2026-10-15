import { applyBatch } from "../../commands/engine.js";
import { conformOf, parseResults, toConformReport } from "../../conform/index.js";
import { stringify } from "../../serialize/stringify.js";
import { sign } from "../../signature.js";
import { CliError, cliGenerator, guardSignature, printJson, readDocument, readInput, writeOutput } from "../io.js";

/** The source of the findings conformance writes (source-of-truth spec §6). */
const SOURCE = "conformance";

/**
 * `statewright conform <file> <results>` (source-of-truth spec §6): the results a system's tests wrote after running the
 * contract's vectors, compared with the design; with `--write`, the divergences become the design's findings.
 */
export default {
  name: "conform",
  usage: "conform <file> <results> [--write] [--format md|json]",
  summary:
    "Compare the results a system's tests wrote after running the contract's vectors with the design; --write keeps " +
    "the divergences as findings (source conformance). Exit 1 when a step diverged or threw, or the results are for " +
    "another version of the design.",
  args: [2, 2],
  options: {
    write: { type: "boolean" },
    format: { type: "string" },
    agent: { type: "string" },
    "accept-changes": { type: "boolean" }
  },
  async run({ args: [file, resultsFile], options, json, io }) {
    const format = json ? "json" : (options.format ?? "md");
    if (!["md", "json"].includes(format)) throw new CliError(`Unknown format "${format}"; use md or json`);
    const { doc, raw } = await readDocument(io, file);
    const parsed = parseResults(await readInput(io, resultsFile));
    if (!parsed.ok) throw new CliError(`${resultsFile} ${parsed.message}`);
    const report = await conformOf(doc, parsed.results);

    let written = null;
    if (options.write) {
      await guardSignature(raw, options["accept-changes"], file);
      const commands = [{ type: "findings.replace", args: { source: SOURCE, findings: report.findings } }];
      await writeOutput(io, file, stringify(await sign(applyBatch(doc, commands).doc, cliGenerator(options))));
      written = file;
    }

    if (format === "json") {
      printJson(io, { ...report, file, results: { file: resultsFile, ...report.results }, written });
    } else {
      io.stdout(toConformReport(report));
      if (written) {
        io.stdout(
          `\nWrote ${report.findings.length} finding(s) to ${file}, source ${SOURCE}: the Editor shows them.\n`
        );
      }
    }
    return report.ok ? 0 : 1;
  }
};
