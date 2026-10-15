import { listCommands } from "../../commands/index.js";
import { argNames } from "../format.js";
import { CliError, printJson } from "../io.js";

/** `statewright commands [type]` (spec §24). */
export default {
  name: "commands",
  usage: "commands [type]",
  summary: "List the document commands with their arguments; with a type, print its args JSON Schema.",
  args: [0, 1],
  options: {},
  async run({ args: [type], json, io }) {
    const commands = listCommands();
    if (type !== undefined) {
      const command = commands.find(entry => entry.type === type);
      if (!command) throw new CliError(`Unknown command type "${type}" (statewright commands lists them)`);
      if (json) printJson(io, { ok: true, command });
      else io.stdout(`${command.type}\n${command.description}\n${JSON.stringify(command.args, null, 2)}\n`);
      return 0;
    }
    if (json) {
      printJson(io, { ok: true, commands });
      return 0;
    }
    for (const command of commands) {
      io.stdout(`${command.type}  ${argNames(command.args).join(", ")}\n    ${command.description}\n`);
    }
    return 0;
  }
};
