import { applyBatch } from "../../commands/engine.js";
import { stringify } from "../../serialize/stringify.js";
import { sign } from "../../signature.js";
import { CliError, cliGenerator, guardSignature, printJson, readDocument, writeOutput } from "../io.js";

/** `statewright layout <file> [--canvas <id>] [--all]` (spec §24). */
export default {
  name: "layout",
  usage: "layout <file> [--canvas <id>] [--all] [--out <file>] [--dry-run] [--agent <name>] [--accept-changes]",
  summary: "Place nodes that have no position (or recompute every position with --all), re-sign and write.",
  args: [1, 1],
  options: {
    canvas: { type: "string" },
    all: { type: "boolean" },
    out: { type: "string" },
    "dry-run": { type: "boolean" },
    agent: { type: "string" },
    "accept-changes": { type: "boolean" }
  },
  async run({ args: [file], options, json, io }) {
    // Auto-layout pulls in ELK; load it only for the commands that draw.
    const { autoLayout } = await import("../../layout/index.js");
    const { doc, raw } = await readDocument(io, file);
    await guardSignature(raw, options["accept-changes"], file);
    if (options.canvas !== undefined && !doc.canvases[options.canvas]) {
      throw new CliError(`No canvas "${options.canvas}" in ${file}`);
    }
    const canvases = options.canvas ? [options.canvas] : Object.keys(doc.canvases).sort();
    let working = doc;
    let placed = 0;
    let routed = 0;
    for (const canvasId of canvases) {
      const commands = await autoLayout(working, canvasId, { scope: options.all ? "all" : "missing" });
      if (!commands.length) continue;
      working = applyBatch(working, commands).doc;
      placed += commands.filter(command => command.type === "layout.node.set").length;
      routed += commands.filter(command => command.type === "layout.edge.set").length;
    }
    const changed = working !== doc;
    const written = changed && !options["dry-run"] ? (options.out ?? file) : null;
    if (written) await writeOutput(io, written, stringify(await sign(working, cliGenerator(options))));
    if (json) {
      printJson(io, { ok: true, file, written, canvases: canvases.length, placed, routed });
    } else if (!changed) {
      io.stdout(`${file}: every node already has a position; nothing to do (--all recomputes them)\n`);
    } else {
      io.stdout(
        `Laid out ${file}: placed ${placed} node(s), routed ${routed} edge(s); ${written ? `wrote ${written}` : "dry run, nothing written"}\n`
      );
    }
    return 0;
  }
};
