import { CliError, printJson, readDocument, writeOutput } from "../io.js";

/** `statewright render <file> --canvas <id> [-o out.svg]` (spec §24). */
export default {
  name: "render",
  usage: "render <file> [--canvas <id>] [-o <out.svg>]",
  summary: "Draw a canvas (default: the root) as SVG, to a file or to stdout. Missing positions are computed.",
  args: [1, 1],
  options: { canvas: { type: "string" }, out: { type: "string", short: "o" } },
  async run({ args: [file], options, json, io }) {
    const { toSVG } = await import("../../render/index.js");
    const { doc } = await readDocument(io, file);
    const canvas = options.canvas ?? doc.root;
    if (!doc.canvases[canvas]) throw new CliError(`No canvas "${canvas}" in ${file}`);
    const svg = await toSVG(doc, canvas);
    if (options.out) await writeOutput(io, options.out, svg);
    if (json) printJson(io, options.out ? { ok: true, canvas, written: options.out } : { ok: true, canvas, svg });
    else if (options.out) io.stdout(`Rendered ${canvas} to ${options.out}\n`);
    else io.stdout(svg);
    return 0;
  }
};
