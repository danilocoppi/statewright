import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { createDocument } from "../../create.js";
import { stringify } from "../../serialize/stringify.js";
import { sign } from "../../signature.js";
import { CliError, cliGenerator, printJson, writeOutput } from "../io.js";

/** True when the path exists. */
const exists = path =>
  access(path).then(
    () => true,
    () => false
  );

/** `statewright new <file> --name <project>` (spec §24). */
export default {
  name: "new",
  usage: "new <file> --name <project> [--agent <name>] [--force]",
  summary: "Create an empty signed document with a root system canvas.",
  args: [1, 1],
  options: { name: { type: "string" }, agent: { type: "string" }, force: { type: "boolean" } },
  async run({ args: [file], options, json, io }) {
    if (!options.name?.trim()) throw new CliError("--name <project> is required");
    if (!options.force && (await exists(resolve(io.cwd, file)))) {
      throw new CliError(`${file} already exists; pass --force to overwrite it`);
    }
    const doc = await sign(createDocument({ name: options.name.trim() }), cliGenerator(options));
    await writeOutput(io, file, stringify(doc));
    if (json) printJson(io, { ok: true, written: file, project: doc.project.id, root: doc.root });
    else io.stdout(`Created ${file}: project ${doc.project.id}, root canvas ${doc.root}\n`);
    return 0;
  }
};
