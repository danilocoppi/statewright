import { FORMAT_VERSION } from "../../constants.js";
import { stringify } from "../../serialize/stringify.js";
import { sign } from "../../signature.js";
import { cliGenerator, guardSignature, printJson, readDocument, writeOutput } from "../io.js";

/** `statewright migrate <file>` (spec §18, §24). */
export default {
  name: "migrate",
  usage: "migrate <file> [--out <file>] [--dry-run] [--agent <name>] [--accept-changes]",
  summary: `Migrate a document to format ${FORMAT_VERSION}, re-sign and write it.`,
  args: [1, 1],
  options: {
    out: { type: "string" },
    "dry-run": { type: "boolean" },
    agent: { type: "string" },
    "accept-changes": { type: "boolean" }
  },
  async run({ args: [file], options, json, io }) {
    const { doc, raw, migrations } = await readDocument(io, file);
    if (!migrations.length) {
      if (json) printJson(io, { ok: true, file, migrations, written: null });
      else io.stdout(`${file} already uses format ${FORMAT_VERSION}; nothing to do\n`);
      return 0;
    }
    await guardSignature(raw, options["accept-changes"], file);
    const written = options["dry-run"] ? null : (options.out ?? file);
    if (written) await writeOutput(io, written, stringify(await sign(doc, cliGenerator(options))));
    if (json) printJson(io, { ok: true, file, migrations, written });
    else
      io.stdout(
        `Migrated ${file}: ${migrations.join(", ")}; ${written ? `wrote ${written}` : "dry run, nothing written"}\n`
      );
    return 0;
  }
};
