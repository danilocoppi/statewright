import { guideSection, readGuide } from "../../mcp/guide.js";
import { CliError, printJson } from "../io.js";

/**
 * `statewright guide [section]` (spec §24; AI interface plan A5): the platform README shipped with the package, whole
 * or one section of it, by its ID or title — what `guide_read` answers an agent over MCP.
 */
export default {
  name: "guide",
  usage: "guide [section]",
  summary:
    "Print the Statewright guide (the platform README) for people and AI agents, or one of its sections by ID or " +
    "title (AI agents: statewright guide start-here).",
  args: [0, 1],
  options: {},
  async run({ args: [section], json, io }) {
    const guide = await readGuide();
    if (section === undefined) {
      if (json) printJson(io, { ok: true, guide });
      else io.stdout(guide);
      return 0;
    }
    const outcome = guideSection(guide, section);
    if (!outcome.ok) throw new CliError(outcome.error.message, { details: outcome.error.details });
    const { id, title, text } = outcome.result;
    if (json) printJson(io, { ok: true, id, title, text });
    else io.stdout(`${text}\n`);
    return 0;
  }
};
