import { applyPatches as applyImmerPatches, enablePatches, produceWithPatches } from "immer";
import { z } from "zod";
import { validateChanged } from "../schema/narrow.js";
import { flattenIssues } from "../serialize/parse.js";
import annotationCommands from "./annotation.js";
import canvasCommands from "./canvas.js";
import catalogCommands from "./catalog.js";
import { createContext, draftIndex } from "./context.js";
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

/**
 * Commands that never add, remove or move an element: after them, the batch's index still holds (performance spec
 * §3 P1). Every other command makes the next one index the draft again.
 */
/**
 * Commands that only add elements, each of them claimed (ctx.claim): after them, the batch's index takes in what they
 * made instead of indexing the draft again.
 */
const ADDS = new Set([
  "catalog.add",
  "canvas.create",
  "region.add",
  "node.add",
  "edge.add",
  "definition.create",
  "note.add",
  "lane.add",
  "scenario.add",
  "comment.add",
  "lock.add"
]);

/** Commands that only remove (through removeElements, which takes what it removed out of the batch's index). */
const REMOVES = new Set([
  "canvas.remove",
  "catalog.remove",
  "region.remove",
  "node.remove",
  "edge.remove",
  "definition.remove",
  "finding.remove",
  "note.remove",
  "lane.remove",
  "scenario.remove",
  "comment.remove",
  "lock.remove"
]);

const KEEPS_INDEX = new Set([
  "project.update",
  "catalog.update",
  "canvas.update",
  "region.update",
  "node.update",
  "edge.update",
  "definition.update",
  "note.update",
  "lane.update",
  "scenario.update",
  "comment.reply",
  "comment.resolve",
  "comment.reopen",
  "focus.set",
  "layout.node.set",
  "layout.edge.set",
  "layout.note.set",
  "layout.canvas.clear",
  "legend.labels.set"
]);

function run(draft, command, created, index) {
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
  definition.run(createContext(draft, created, index), parsed.data);
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
      let index = null;
      for (position = 0; position < commands.length; position++) {
        const command = commands[position];
        // The first index is the starting document's (kept with it); later ones are read from the draft.
        index ??= draftIndex(draft, position === 0 ? doc : undefined);
        const made = created.length;
        run(draft, command, created, index);
        if (ADDS.has(command?.type)) {
          if (!index.added(created.slice(made))) index = null;
        } else if (!KEEPS_INDEX.has(command?.type) && !REMOVES.has(command?.type)) index = null;
      }
    });
  } catch (error) {
    if (error instanceof CommandError) error.index = position;
    throw error;
  }
  const [next, patches, inversePatches] = result;
  // Only what the batch touched (performance spec §3 P1): the rest was valid and did not change.
  const errors = validateChanged(next, patches);
  if (errors.length) fail("SCHEMA", "The batch would leave the document invalid", { errors });
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
