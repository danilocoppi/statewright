// The Editor host's editing (AI interface spec §4.2: edit; §7.3): an agent's batch is one history entry of its own,
// `origin: "ai"`, made visible on the canvas and in a toast; an agent undoes and redoes only its own entries.
import { AgentError, problemsChange, signedBy } from "statewright/agent";
import { applyPatches } from "statewright";

import { isSimulating } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { layoutClient, problemsClient } from "@/workers";

import { conversationStore } from "@/conversation/store";
import { problemsStore } from "@/problems/store";
import { indexOf } from "@/lib/derived";
import { lockedBy } from "@/locks/locked";
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
 * The Problems of a document, from the Problems worker (performance spec §3 P3): those the page shows when they are of
 * this very document, else checked there — never on the page.
 */
function problemsOf(doc, version) {
  const known = problemsStore.getState();
  if (known.version === version && known.doc === doc) return known.list;
  return problemsClient().request("check", { doc });
}

/**
 * Apply commands as the agent's change: one history entry, announced. Throws what Core or the Editor refused; the
 * Problems it added and removed are answered once the Problems worker has checked the document.
 * @returns {Promise<{ created: string[], problems: { added: object[], removed: object[] } }>}
 */
export async function changeAsAgent(commands, label, { agent }) {
  const { doc: before, version } = editorStore.getState();
  const was = problemsOf(before, version);
  const result = editorStore.getState().dispatch(commands, { label, origin: "ai", agent });
  if (!result.ok) {
    const { code, message, details, index } = result.error;
    throw new AgentError(code, message, { ...details, ...(index === undefined ? {} : { index }) });
  }
  const { doc, history } = editorStore.getState();
  announce(history.past.at(-1));
  const [then, now] = await Promise.all([was, problemsClient().request("check", { doc })]);
  return { created: result.created, problems: problemsChange(then, now) };
}

/** The entry an agent may undo or redo: an agent's (the same agent's, when it gave its name). */
function ownEntry(entry, agent, word) {
  const own = entry?.origin === "ai" && (!agent || !entry.agent || entry.agent === agent);
  if (!own)
    throw new AgentError("NOT_AI_CHANGE", `The last change to ${word} is not yours: only the person can ${word} it`);
}

/** Names as the person reads them, a few and then how many more. */
const namesOf = items =>
  items.length > 4 ?
    `${items
      .slice(0, 4)
      .map(item => item.name)
      .join(", ")} and ${items.length - 4} more`
  : items.map(item => item.name).join(", ");

const paired = () => connection.store.getState().status === "connected";

/** What redoing an entry would remove: the IDs there now and gone after. */
function removedBy(entry) {
  const { doc } = editorStore.getState();
  const after = applyPatches(doc, entry.patches);
  const before = indexOf(doc);
  const next = indexOf(after);
  return [...before.entries.keys()].filter(id => before.get(id)?.type !== "project" && !next.has(id));
}

/**
 * An agent's batch while it is paired (collaboration spec §7): kept as a proposal when it asks, or when it removes
 * anything and the person has not let it delete without asking; applied otherwise.
 */
function applyOrPropose(context, { commands: asked, label, propose, title, why }) {
  const commands = signedBy(asked, context.agent);
  const isPaired = paired();
  if (!isPaired) {
    if (propose) {
      throw new AgentError("NOT_ALLOWED", "proposals need the person's conversation: pair with the Editor first");
    }
    return changeAsAgent(commands, label, context);
  }
  const diff = diffOf(editorStore.getState().doc, commands);
  if (!diff.ok) {
    const { code, message, details, index } = diff.error;
    throw new AgentError(code, message, { ...details, ...(index === undefined ? {} : { index }) });
  }
  // What is locked is only ever proposed; a removal, unless the person lets the agent delete (spec §7, §8.2).
  const held = lockedBy(editorStore.getState().doc, diff);
  const forced =
    held.length ? "locked"
    : removes(diff) && !proposalsStore.getState().allowDeletes ? "deletes"
    : null;
  if (!propose && !forced) return changeAsAgent(commands, label, context);
  // A tab that only reads cannot accept anything: no proposal is kept there.
  if (editorStore.getState().readOnly) throw refusal();
  const id = proposalsStore.getState().propose({
    project: editorStore.getState().doc.project.id,
    title: title ?? label,
    ...(why ? { why } : {}),
    label,
    agent: context.agent ?? null,
    commands,
    diff,
    ...(forced ? { forced } : {})
  });
  // A line of the conversation keeps it in the history (collaboration spec §7).
  conversationStore.getState().add({ kind: "proposal", id });
  if (!forced) return { proposed: id };
  if (forced === "locked") {
    return {
      proposed: id,
      forced,
      reason: `It changes ${namesOf(held)}, which the person locked: it is only proposed`
    };
  }
  const names = diff.removed.map(item => item.name).join(", ");
  return {
    proposed: id,
    forced,
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
    // Redoing a removal the person undid needs their yes again (collaboration spec §7).
    const removed = paired() && !proposalsStore.getState().allowDeletes ? removedBy(entry) : [];
    if (removed.length) {
      throw new AgentError(
        "NOT_ALLOWED",
        `That change removes ${removed.join(", ")}, and the person undid it: propose it again (batch_apply with propose)`
      );
    }
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
    // Moving what the person locked is theirs to do (collaboration spec §8.2).
    const held = paired() && commands.length ? lockedBy(doc, diffOf(doc, commands)) : [];
    if (held.length) {
      throw new AgentError(
        "NOT_ALLOWED",
        `Arranging ${level.name} moves ${namesOf(held)}, which the person locked: move the others with batch_apply, or propose it`
      );
    }
    if (commands.length) await changeAsAgent(commands, `Arrange ${level.name}`, context);
    return { placed: commands.filter(command => command.type === "layout.node.set").map(command => command.args.id) };
  }
};
