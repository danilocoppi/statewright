// Renders every example under examples/rendered/<name>/: one SVG per canvas, one page per scenario (without fonts),
// README.md (Markdown for people), documentation.html (the same as a page, without fonts), ai-pack.md (for language
// models), audit.md (its audit) and contract.json (its contract). Run after changing the examples, the style, the layout or the renderer; a test keeps these files in sync.
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { parse, toAIPack, toMarkdown } from "statewright";
import { toAuditReport } from "statewright/audit";
import { stringifyContract, toContract } from "statewright/contract";
import { toDocumentPage, toScenarioPage, toSVG } from "statewright/render";

const examples = new URL("../examples/", import.meta.url);
const rendered = new URL("rendered/", examples);
await rm(rendered, { recursive: true, force: true });

for (const file of (await readdir(examples)).filter(name => name.endsWith(".sttw")).sort()) {
  const name = file.replace(/\.sttw$/, "");
  const result = parse(await readFile(new URL(file, examples), "utf8"));
  if (!result.ok) throw new Error(`${file} is not valid: ${result.errors[0].path} ${result.errors[0].message}`);
  const dir = new URL(`${name}/`, rendered);
  await mkdir(dir, { recursive: true });
  for (const canvasId of Object.keys(result.doc.canvases).sort()) {
    await writeFile(new URL(`${canvasId}.svg`, dir), await toSVG(result.doc, canvasId));
  }
  for (const scenarioId of Object.keys(result.doc.annotations?.scenarios ?? {}).sort()) {
    await writeFile(new URL(`${scenarioId}.html`, dir), await toScenarioPage(result.doc, scenarioId));
  }
  await writeFile(new URL("README.md", dir), toMarkdown(result.doc));
  await writeFile(new URL("documentation.html", dir), await toDocumentPage(result.doc));
  await writeFile(new URL("ai-pack.md", dir), toAIPack(result.doc));
  await writeFile(new URL("audit.md", dir), toAuditReport(result.doc));
  await writeFile(new URL("contract.json", dir), stringifyContract((await toContract(result.doc)).contract));
  console.log(`✓ ${name}`);
}
