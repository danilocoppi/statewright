import { applyPatches as applyImmerPatches, enablePatches, produceWithPatches } from "immer";
import { z } from "zod";
import { documentSchema } from "../schema/document.js";
import { flattenIssues } from "../serialize/parse.js";
import annotationCommands from "./annotation.js";
import canvasCommands from "./canvas.js";
import catalogCommands from "./catalog.js";
import { createContext } from "./context.js";
import definitionCommands from "./definition.js";
import edgeCommands from "./edge.js";
import { CommandError, fail } from "./errors.js";
import layoutCommands from "./layout.js";
import nodeCommands from "./node.js";
import projectCommands from "./project.js";
import regionCommands from "./region.js";

enablePatches();

/** Every command, by type. */
const COMMANDS = new Map(
  [
    ...projectCommands,
    ...catalogCommands,
    ...canvasCommands,
    ...regionCommands,
    ...nodeCommands,
    ...edgeCommands,
    ...definitionCommands,
    ...annotationCommands,
    ...layoutCommands
  ].map(command => [command.type, command])
);

/**
 * Every command with a one-line description and the JSON Schema of its args (for the CLI, the README and AIs).
 * @returns {Array<{ type: string, description: string, args: object }>}
 */
export function listCommands() {
  return [...COMMANDS.values()].map(({ type, description, args }) => ({
    type,
    description,
    args: z.toJSONSchema(args, { unrepresentable: "any" })
  }));
}

function run(draft, command, created) {
  if (command === null || typeof command !== "object" || Array.isArray(command)) {
    fail("INVALID_ARGS", 'A command is an object { "type": "…", "args": { … } }');
  }
  const definition = COMMANDS.get(command.type);
  if (!definition) fail("INVALID_ARGS", `Unknown command type "${command.type}"`, { type: command.type });
  const parsed = definition.args.safeParse(command.args ?? {});
  if (!parsed.success) {
    const errors = flattenIssues(parsed.error.issues, ["args"]);
    fail("INVALID_ARGS", `Invalid args for ${command.type}: ${errors[0].path} ${errors[0].message}`, { errors });
  }
  definition.run(createContext(draft, created), parsed.data);
}

/**
 * Apply commands atomically: either all succeed or the document is left untouched and the CommandError names
 * the failing command (`error.index`). The result is a new, frozen document plus the patches that turn the old
 * document into the new one and back (undo), and the IDs the batch created.
 * @param {object} doc A valid document (it is not modified; after a successful batch it shares frozen parts
 *   with the result).
 * @param {Array<{ type: string, args?: object }>} commands
 * @returns {{ doc: object, patches: import("immer").Patch[], inversePatches: import("immer").Patch[], created: string[] }}
 */
export function applyBatch(doc, commands) {
  if (!Array.isArray(commands)) fail("INVALID_ARGS", "A batch is an array of commands");
  const created = [];
  let position = 0;
  let result;
  try {
    result = produceWithPatches(doc, draft => {
      for (position = 0; position < commands.length; position++) run(draft, commands[position], created);
    });
  } catch (error) {
    if (error instanceof CommandError) error.index = position;
    throw error;
  }
  const [next, patches, inversePatches] = result;
  const check = documentSchema.safeParse(next);
  if (!check.success) {
    fail("SCHEMA", "The batch would leave the document invalid", { errors: flattenIssues(check.error.issues) });
  }
  return { doc: next, patches, inversePatches, created };
}

/**
 * Apply one command (a batch of one).
 * @param {object} doc
 * @param {{ type: string, args?: object }} command
 */
export function apply(doc, command) {
  return applyBatch(doc, [command]);
}

/**
 * Replay patches from applyBatch — `applyPatches(next, inversePatches)` undoes a batch, `applyPatches(prev,
 * patches)` redoes it.
 * @param {object} doc
 * @param {import("immer").Patch[]} patches
 */
export function applyPatches(doc, patches) {
  return applyImmerPatches(doc, patches);
}
