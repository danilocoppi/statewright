import { auditOf, toAuditReport } from "../../audit/report.js";
import { CliError, printJson, readDocument, writeOutput } from "../io.js";

/** `statewright audit <file>` (AI interface spec §8). */
export default {
  name: "audit",
  usage: "audit <file> [--format md|json] [--canvas <id>] [-o <out>]",
  summary: "Audit a document: its Problems, its scenarios run again, and their coverage. Exit 1 when it has errors.",
  args: [1, 1],
  options: { format: { type: "string" }, canvas: { type: "string" }, out: { type: "string", short: "o" } },
  async run({ args: [file], options, json, io }) {
    const format = json ? "json" : (options.format ?? "md");
    if (!["md", "json"].includes(format)) throw new CliError(`Unknown format "${format}"; use md or json`);
    const { doc } = await readDocument(io, file);
    if (options.canvas && !doc.canvases[options.canvas])
      throw new CliError(`${file} has no canvas "${options.canvas}"`);
    const scope = options.canvas ? { canvas: options.canvas } : {};
    const audit = auditOf(doc, scope);
    const text =
      format === "json" ?
        `${JSON.stringify({ ok: audit.summary.error === 0, file, ...audit }, null, 2)}\n`
      : toAuditReport(doc, scope);
    if (options.out) {
      await writeOutput(io, options.out, text);
      if (json) printJson(io, { ok: audit.summary.error === 0, file, written: options.out, summary: audit.summary });
      else io.stdout(`Wrote the audit of ${file} to ${options.out}\n`);
    } else {
      io.stdout(text);
    }
    return audit.summary.error ? 1 : 0;
  }
};
