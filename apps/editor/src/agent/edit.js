// The Editor host's editing (AI interface spec §4.2: edit; §7.3): an agent's batch is one history entry of its own,
// `origin: "ai"`, made visible on the canvas and in a toast; an agent undoes and redoes only its own entries.
import { AgentError, problemsChange } from "statewright/agent";
import { check } from "statewright";

import { isSimulating } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { layoutClient } from "@/workers";

import { diffOf, removes } from "@/proposals/diff";
import { proposalsStore } from "@/proposals/store";

import { connection } from "./connection";
import { announce } from "./notice";

/** Why a change cannot be made now: the tab is read-only, or a simulation holds the document. */
function refusal() {
  if (editorStore.getState().readOnly) {
    return new AgentError("READ_ONLY", "This tab shows the project read-only: another tab is editing it");
  }
  if (isSimulating()) {
    return new AgentError("SIMULATING", "The document is not edited while simulating: stop the run first (run.stop)");
  }
  return null;
}

/**
 * Apply commands as the agent's change: one history entry, announced. Throws what Core or the Editor refused.
 * @returns {{ created: string[], problems: { added: object[], removed: object[] } }}
 */
export function changeAsAgent(commands, label, { agent }) {
  const before = editorStore.getState().doc;
  const result = editorStore.getState().dispatch(commands, { label, origin: "ai", agent });
  if (!result.ok) {
    const { code, message, details, index } = result.error;
    throw new AgentError(code, message, { ...details, ...(index === undefined ? {} : { index }) });
  }
  const { doc, history } = editorStore.getState();
  announce(history.past.at(-1));
  return { created: result.created, problems: problemsChange(check(before), check(doc)) };
}

/** The entry an agent may undo or redo: an agent's (the same agent's, when it gave its name). */
function ownEntry(entry, agent, word) {
  const own = entry?.origin === "ai" && (!agent || !entry.agent || entry.agent === agent);
  if (!own)
    throw new AgentError("NOT_AI_CHANGE", `The last change to ${word} is not yours: only the person can ${word} it`);
}

/**
 * An agent's batch while it is paired (collaboration spec §7): kept as a proposal when it asks, or when it removes
 * anything and the person has not let it delete without asking; applied otherwise.
 */
function applyOrPropose(context, { commands, label, propose, title, why }) {
  const paired = connection.store.getState().status === "connected";
  if (!paired) {
    if (propose) {
      throw new AgentError("NOT_ALLOWED", "proposals need the person's conversation: pair with the Editor first");
    }
    return changeAsAgent(commands, label, context);
  }
  const diff = diffOf(editorStore.getState().doc, commands);
  if (!diff.ok) {
    const { code, message, index } = diff.error;
    throw new AgentError(code, message, index === undefined ? undefined : { index });
  }
  const forced = removes(diff) && !proposalsStore.getState().allowDeletes;
  if (!propose && !forced) return changeAsAgent(commands, label, context);
  const id = proposalsStore.getState().propose({
    title: title ?? label,
    ...(why ? { why } : {}),
    label,
    agent: context.agent ?? null,
    commands,
    diff,
    ...(forced ? { forced: "deletes" } : {})
  });
  if (!forced) return { proposed: id };
  const names = diff.removed.map(item => item.name).join(", ");
  return {
    proposed: id,
    forced: "deletes",
    reason: `It removes ${names}: whatever removes is proposed, and the person accepts or rejects it`
  };
}

export const editOperations = {
  "batch.apply": (context, args) => applyOrPropose(context, args),
  "history.undo": ({ agent }) => {
    const entry = editorStore.getState().history.past.at(-1);
    ownEntry(entry, agent, "undo");
    const refused = refusal();
    if (refused) throw refused;
    editorStore.getState().undo();
    return { label: entry.label };
  },
  "history.redo": ({ agent }) => {
    const entry = editorStore.getState().history.future[0];
    ownEntry(entry, agent, "redo");
    const refused = refusal();
    if (refused) throw refused;
    editorStore.getState().redo();
    return { label: entry.label };
  },
  "layout.arrange": async (context, { canvas: id, scope }) => {
    const level = editorStore.getState().doc.canvases[id];
    if (!level) throw new AgentError("NOT_FOUND", `There is no level "${id}"; document.summary lists them`, { id });
    const refused = refusal();
    if (refused) throw refused;
    // Arranged in the layout worker; a document changed meanwhile is arranged again.
    let commands;
    let doc;
    do {
      doc = editorStore.getState().doc;
      commands = await layoutClient().request("layout", { doc, canvasId: id, scope });
    } while (editorStore.getState().doc !== doc);
    if (commands.length) changeAsAgent(commands, `Arrange ${level.name}`, context);
    return { placed: commands.filter(command => command.type === "layout.node.set").map(command => command.args.id) };
  }
};
