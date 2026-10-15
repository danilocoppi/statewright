import {
  diffContracts,
  parseContract,
  stringifyContract,
  toChangesMarkdown,
  toContract
} from "../../contract/index.js";
import { CliError, printJson, readDocument, readInput, writeOutput } from "../io.js";

/** A contract file, or a usage error that says why it is not one. */
async function readContract(io, file) {
  const parsed = parseContract(await readInput(io, file));
  if (!parsed.ok) throw new CliError(`${file} ${parsed.message}`);
  return parsed.contract;
}

/**
 * `statewright contract <file>` (source-of-truth spec §5): the design's contract, written or printed; with `--since`, what
 * changed since a contract; with `--check`, whether a committed contract is still the design's (exit 1 when not).
 */
export default {
  name: "contract",
  usage: "contract <file> [-o <out>] [--since <contract>] [--check <contract>]",
  summary:
    "Write the design's contract (machines, flows, scenarios as test vectors) for code; --since lists what changed " +
    "since a contract, --check exits 1 when a committed contract is no longer the design's.",
  args: [1, 1],
  options: { out: { type: "string", short: "o" }, since: { type: "string" }, check: { type: "string" } },
  async run({ args: [file], options, json, io }) {
    if (options.since && options.check) throw new CliError("Give --since or --check, not both");
    if (options.out && (options.since || options.check))
      throw new CliError("-o writes the contract: drop --since and --check");
    const { doc } = await readDocument(io, file);
    const { contract, problems } = await toContract(doc);
    // A clash of names is reported, and the contract is still written: the person decides which state to rename.
    for (const problem of problems) io.stderr(`statewright: ${problem.message}\n`);
    const failed = problems.length ? 1 : 0;

    const against = options.since ?? options.check;
    if (against) {
      const diff = diffContracts(await readContract(io, against), contract);
      const code = options.check && !diff.same ? 1 : failed;
      if (json) printJson(io, { ok: !code, file, against, ...diff, problems });
      else if (options.check && diff.same) io.stdout(`${against} is the contract of ${file}\n`);
      else io.stdout(toChangesMarkdown(diff));
      return code;
    }

    const text = stringifyContract(contract);
    if (options.out) {
      await writeOutput(io, options.out, text);
      if (json) printJson(io, { ok: !failed, file, written: options.out, problems });
      else io.stdout(`Wrote the contract of ${file} to ${options.out}\n`);
    } else if (json) {
      printJson(io, { ok: !failed, file, contract, problems });
    } else {
      io.stdout(text);
    }
    return failed;
  }
};
