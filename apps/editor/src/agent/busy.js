// An agent does not take the focus from a field the person is typing in, and does not close a dialog of theirs (AI
// interface spec §7.3): while one is open, what would move the view under it answers BUSY. Reads always work.
import { AgentError } from "statewright/agent";

/** Whether the person is typing in a field: moving the view would take it away, and their keys with it. */
export const typing = (page = globalThis.document) => {
  const field = page?.activeElement;
  return Boolean(field?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(field?.tagName));
};

/** Throw BUSY while a dialog is open in the page, or the person is typing in a field. */
export function busy(page = globalThis.document) {
  // Connect an AI… is open only until the agent it pairs with has connected: the agent's first calls go on.
  if (page?.querySelector('dialog[open]:not([data-testid="connect-dialog"])')) {
    throw new AgentError("BUSY", "A dialog is open in the Editor: try again once the person has closed it");
  }
  if (typing(page)) {
    throw new AgentError("BUSY", "The person is typing in a field of the Editor: try again once they have left it");
  }
}
