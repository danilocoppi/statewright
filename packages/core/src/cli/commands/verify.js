import { verify } from "../../signature.js";
import { CliError, printJson, readInput } from "../io.js";

const NOTES = {
  content: "The specification was changed outside Statewright.",
  annotations: "Annotations were changed outside Statewright.",
  layout: "The layout was changed outside Statewright."
};

/** `statewright verify <file>` (spec §17, §24). */
export default {
  name: "verify",
  usage: "verify <file> [--strict]",
  summary: "Check the signature per scope (content, annotations, layout). --strict: exit 1 when a scope changed.",
  args: [1, 1],
  options: { strict: { type: "boolean" } },
  async run({ args: [file], options, json, io }) {
    let raw;
    try {
      raw = JSON.parse((await readInput(io, file)).replace(/^\uFEFF/, ""));
    } catch (error) {
      if (error instanceof CliError) throw error;
      throw new CliError(`${file} is not JSON: ${error.message}`);
    }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new CliError(`${file} is not a Statewright document`);
    }
    const signature = await verify(raw);
    const changed = Object.values(signature).includes("changed");
    if (json) {
      printJson(io, { ok: !(options.strict && changed), file, signature });
    } else {
      for (const [scope, status] of Object.entries(signature)) io.stdout(`${scope.padEnd(12)}${status}\n`);
      if (!raw.signature) io.stdout("The document is not signed; it is signed on its next write.\n");
      for (const [scope, status] of Object.entries(signature)) if (status === "changed") io.stdout(`${NOTES[scope]}\n`);
    }
    return options.strict && changed ? 1 : 0;
  }
};
