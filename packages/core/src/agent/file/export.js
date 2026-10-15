// The file host's exports (AI interface spec §4.2: export): Core's own output, as text or written to `out`, named as
// the Editor names what it exports.
import { stringifyContract, toContract } from "../../contract/index.js";
import { toAIPack, toMarkdown } from "../../docs/index.js";
import { slug } from "../../names.js";
import { AgentError } from "../errors.js";
import { canvasOf } from "./read.js";

/**
 * The renderer, loaded when a figure is first drawn: it brings the layout engine (ELK, about 1.4 MB), which
 * `statewright/agent` must not bring to a page that only reads its contract (the Editor's).
 */
const renderer = () => import("../../render/index.js");

/** An export's result: its text, or where it was written. */
async function exported({ files }, out, name, text) {
  if (!out) return { name, text };
  try {
    await files.write(out, text);
  } catch (error) {
    throw new AgentError("FILE", `Cannot write ${out}: ${error?.message ?? error}`, { file: out });
  }
  return { name, written: out };
}

/** A scenario of the document, or NOT_FOUND. */
function scenarioOf(doc, id) {
  const scenario = doc.annotations?.scenarios?.[id];
  if (!scenario)
    throw new AgentError("NOT_FOUND", `There is no scenario "${id}"; document.summary counts them`, { id });
  return scenario;
}

export const exportOperations = {
  "export.document": async ({ doc }, { out, to = "text" }, context) => {
    if (to !== "text") {
      throw new AgentError("NEEDS_EDITOR", `export.document to "${to}" needs the Editor; on a file, give out instead`);
    }
    // The file as it is: the host writes every change at once, signed, so it holds the document.
    const read = await context.read(context.file, "read", () => context.files.read(context.file));
    if (!read) throw new AgentError("FILE", `Cannot read ${context.file}: no such file`, { file: context.file });
    const { text } = read;
    return exported(context, out, `${slug(doc.project.name)}.sttw`, text);
  },
  "export.svg": async ({ doc }, { canvas, out }, context) => {
    const level = canvasOf(doc, canvas);
    const name = `${slug(doc.project.name)}-${slug(level.name)}.svg`;
    return exported(context, out, name, await (await renderer()).toSVG(doc, canvas));
  },
  "export.markdown": ({ doc }, { out }, context) =>
    exported(context, out, `${slug(doc.project.name)}.md`, toMarkdown(doc)),
  "export.aiPack": ({ doc }, { out }, context) =>
    exported(context, out, `${slug(doc.project.name)}.ai.md`, toAIPack(doc)),
  "export.contract": async ({ doc }, { out }, context) => {
    const { contract, problems } = await toContract(doc);
    const name = `${slug(doc.project.name)}.contract.json`;
    return { ...(await exported(context, out, name, stringifyContract(contract))), problems };
  },
  "export.scenarioPage": async ({ doc }, { id, out }, context) => {
    const scenario = scenarioOf(doc, id);
    return exported(context, out, `${slug(scenario.name)}.html`, await (await renderer()).toScenarioPage(doc, id));
  }
};
