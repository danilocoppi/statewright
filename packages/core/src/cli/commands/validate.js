import { check } from "../../rules/index.js";
import { parse } from "../../serialize/parse.js";
import { formatProblems, formatSummary, summarize } from "../format.js";
import { printJson, readInput } from "../io.js";

/** `statewright validate <file>` (spec §24). */
export default {
  name: "validate",
  usage: "validate <file>",
  summary: "Parse, migrate and check a document; prints its Problems. Exit 1 when it has errors.",
  args: [1, 1],
  options: {},
  async run({ args: [file], json, io }) {
    const result = parse(await readInput(io, file));
    if (!result.ok) {
      if (json) {
        const summary = { error: result.errors.length, warning: 0, incomplete: 0 };
        printJson(io, { ok: false, file, migrations: result.migrations, errors: result.errors, problems: [], summary });
      } else {
        io.stdout(`${file}: not a valid Statewright document\n`);
        for (const error of result.errors) io.stdout(`  ${error.path || "/"}  ${error.message}\n`);
      }
      return 1;
    }
    const problems = check(result.doc);
    const summary = summarize(problems);
    if (json) {
      printJson(io, { ok: summary.error === 0, file, migrations: result.migrations, errors: [], problems, summary });
    } else {
      io.stdout(`${file}\n`);
      for (const step of result.migrations) io.stdout(`  migrated ${step} (in memory; run statewright migrate)\n`);
      io.stdout(formatProblems(problems));
      io.stdout(`${formatSummary(summary)}\n`);
    }
    return summary.error ? 1 : 0;
  }
};
