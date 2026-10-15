// The file host's editing operations (AI interface spec §4.2: edit): a batch is one change of the session, undone and
// redone as one.
import { applyBatch, applyPatches } from "../../commands/index.js";
import { check } from "../../rules/index.js";
import { AgentError } from "../errors.js";
import { canvasOf } from "./read.js";

/** A Problem's identity, to tell those a change added from those it removed: its rule, element and data, not its words. */
const keyOf = problem => `${problem.code}|${problem.target}|${JSON.stringify(problem.data ?? null)}`;

/** The Problems a change added and removed: those after it that were not before, and those before that are not after. */
export function problemsChange(before, after) {
  const was = new Set(before.map(keyOf));
  const is = new Set(after.map(keyOf));
  return {
    added: after.filter(problem => !was.has(keyOf(problem))),
    removed: before.filter(problem => !is.has(keyOf(problem)))
  };
}

/**
 * An agent's batch with its words signed as its own (collaboration spec §8.1): what it says in a comment is the
 * agent's, under its name, whatever author the command names.
 */
export const signedBy = (commands, agent) =>
  commands.map(command =>
    command.type === "comment.add" || command.type === "comment.reply" ?
      { ...command, args: { ...command.args, author: "agent", ...(agent ? { name: agent } : {}) } }
    : command
  );

/** Apply commands as one change of the session, kept for undo. */
export function change(session, commands, label) {
  const before = check(session.doc);
  const result = applyBatch(session.doc, commands);
  session.doc = result.doc;
  session.undo.push({ label, patches: result.patches, inversePatches: result.inversePatches });
  session.redo = [];
  return { result, problems: problemsChange(before, check(result.doc)) };
}

export const editOperations = {
  "batch.apply": (session, { commands, label, propose }, { agent } = {}) => {
    if (propose) {
      throw new AgentError(
        "NOT_ALLOWED",
        "proposals need the Editor, where the person accepts or rejects them: pair with it, or apply the batch"
      );
    }
    const { result, problems } = change(session, signedBy(commands, agent), label);
    return { created: result.created, problems };
  },
  "history.undo": session => {
    const entry = session.undo.pop();
    if (!entry) throw new AgentError("NOT_AI_CHANGE", "There is no change of yours to undo on this file");
    session.doc = applyPatches(session.doc, entry.inversePatches);
    session.redo.push(entry);
    return { label: entry.label };
  },
  "history.redo": session => {
    const entry = session.redo.pop();
    if (!entry) throw new AgentError("NOT_AI_CHANGE", "There is no change of yours to redo on this file");
    session.doc = applyPatches(session.doc, entry.patches);
    session.undo.push(entry);
    return { label: entry.label };
  },
  "layout.arrange": async (session, { canvas: id, scope }) => {
    const canvas = canvasOf(session.doc, id);
    // The layout engine (ELK) is loaded when a level is first arranged, as the renderer is (see export.js).
    const { autoLayout } = await import("../../layout/index.js");
    const commands = await autoLayout(session.doc, id, { scope });
    if (commands.length) change(session, commands, `Arrange ${canvas.name}`);
    return { placed: commands.filter(command => command.type === "layout.node.set").map(command => command.args.id) };
  }
};
