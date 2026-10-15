import { parseArgs } from "node:util";
import { PACKAGE_VERSION } from "../constants.js";
import { CliError, printJson } from "./io.js";

/**
 * CLI commands in help order (spec §24), each a module of `./commands/` loaded when it is needed: a command starts with
 * what it uses only (`mcp` answers its client sooner without the renderer and the layout engine).
 */
const COMMANDS = [
  "new",
  "validate",
  "audit",
  "verify",
  "apply",
  "inspect",
  "layout",
  "render",
  "docs",
  "contract",
  "conform",
  "migrate",
  "schema",
  "commands",
  "mcp",
  "guide"
];

/** A command's module. */
const load = async name => (await import(`./commands/${name}.js`)).default;

const GLOBAL_OPTIONS = { json: { type: "boolean" }, help: { type: "boolean", short: "h" } };

async function usage() {
  const commands = await Promise.all(COMMANDS.map(load));
  const width = Math.max(...commands.map(command => command.usage.length));
  return [
    "Usage: statewright <command> [options]",
    "",
    ...commands.map(command => `  ${command.usage.padEnd(width)}  ${command.summary}`),
    "",
    "Every command accepts --json (machine-readable output on stdout) and --help.",
    "Exit codes: 0 success, 1 errors found (or a changed signature with verify --strict), 2 usage or I/O error.",
    "The guide (statewright guide) explains documents, commands and the rules for AI agents.",
    "AI agents start with statewright guide start-here.",
    ""
  ].join("\n");
}

/** Report a failure: one line on stderr, plus a JSON object on stdout with --json (spec §25). */
function failure(io, json, error) {
  const known = error instanceof CliError;
  const message = known ? error.message : `Unexpected error: ${error.message}`;
  io.stderr(`statewright: ${message}\n`);
  if (json) printJson(io, { ok: false, error: { message, ...(known ? error.details : {}) } });
  return known ? error.exitCode : 2;
}

/**
 * Run the CLI. Never throws; resolves to the exit code: 0 success, 1 problems of severity error (or a changed
 * signature with verify --strict), 2 usage or I/O error (spec §24).
 * @param {string[]} argv Arguments after the executable, e.g. ["validate", "doc.json", "--json"].
 * @param {import("./io.js").Io} io
 * @returns {Promise<number>}
 */
export async function main(argv, io) {
  const [name, ...rest] = argv;
  if (name === undefined || ["help", "--help", "-h"].includes(name)) {
    (name === undefined ? io.stderr : io.stdout)(await usage());
    return name === undefined ? 2 : 0;
  }
  if (name === "--version" || name === "-v") {
    io.stdout(`${PACKAGE_VERSION}\n`);
    return 0;
  }
  const json = rest.includes("--json");
  if (!COMMANDS.includes(name)) {
    return failure(io, json, new CliError(`Unknown command "${name}". Run statewright --help.`));
  }
  const command = await load(name);

  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      options: { ...GLOBAL_OPTIONS, ...command.options },
      allowPositionals: true,
      strict: true
    });
  } catch (error) {
    return failure(io, json, new CliError(`${error.message} (usage: statewright ${command.usage})`));
  }
  if (parsed.values.help) {
    io.stdout(`Usage: statewright ${command.usage}\n\n${command.summary}\n`);
    return 0;
  }
  const [min, max] = command.args;
  if (parsed.positionals.length < min || parsed.positionals.length > max) {
    return failure(io, json, new CliError(`Wrong number of arguments (usage: statewright ${command.usage})`));
  }
  try {
    return await command.run({ args: parsed.positionals, options: parsed.values, json, io });
  } catch (error) {
    return failure(io, json, error);
  }
}
