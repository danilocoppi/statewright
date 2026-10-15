import { toAIPack, toMarkdown } from "../../docs/document.js";
import { toDocumentPage } from "../../render/index.js";
import { CliError, printJson, readDocument, writeOutput } from "../io.js";

/** md for people, ai for language models, html: the documentation as a page (without fonts: the CLI ships none). */
const FORMATS = { md: doc => toMarkdown(doc), ai: doc => toAIPack(doc), html: doc => toDocumentPage(doc) };

/** `statewright docs <file> --format md|ai|html [-o out.md]` (spec §24; documentation page spec §6). */
export default {
  name: "docs",
  usage: "docs <file> [--format md|ai|html] [-o <out>]",
  summary:
    "Write documentation: md for people (default), ai for language models, html as a page; to a file or to stdout.",
  args: [1, 1],
  options: { format: { type: "string" }, out: { type: "string", short: "o" } },
  async run({ args: [file], options, json, io }) {
    const format = options.format ?? "md";
    if (!FORMATS[format]) throw new CliError(`Unknown format "${format}"; use md, ai or html`);
    const { doc } = await readDocument(io, file);
    const markdown = await FORMATS[format](doc);
    if (options.out) await writeOutput(io, options.out, markdown);
    if (json) printJson(io, options.out ? { ok: true, format, written: options.out } : { ok: true, format, markdown });
    else if (options.out) io.stdout(`Wrote ${format} documentation to ${options.out}\n`);
    else io.stdout(markdown);
    return 0;
  }
};
