// The Editor's host of the agent contract (AI interface spec §7.1): every operation runs on the project open in this tab,
// through the same stores the person's actions use. Calls run one at a time, in the order they came, and never throw:
// each answers `{ ok: true, result }` or `{ ok: false, error }`.
import { documentOperations, failure, success, validateCall } from "statewright/agent";

import { editorStore } from "@/store/editor";

import { editOperations } from "./edit";
import { exportOperations } from "./exports";
import { projectOperations } from "./projects";
import { runOperations } from "./runs";
import { editorStateOf } from "./state";
import { viewOperations } from "./views";

/** The operations that need no project open in this tab. */
const WITHOUT_PROJECT = new Set([
  "editor.state",
  "projects.list",
  "projects.open",
  "projects.create",
  "projects.import"
]);

/** The operations that answer from the document alone, as on a file (`statewright/agent`'s `documentOperations`). */
const fromDocument = Object.fromEntries(
  Object.entries(documentOperations).map(([name, run]) => [name, (_context, args) => run(editorStore.getState(), args)])
);

/**
 * @param {{ navigate?: (path: string) => void, repository?: () => Promise<object>, fonts?: object[] }} [options]
 *   `navigate`: moves to another page of the app (the router's); `repository`: the projects in this browser; `fonts`:
 *   the fonts a scenario page embeds.
 */
export function createEditorHost(options = {}) {
  const handlers = {
    ...fromDocument,
    ...editOperations,
    ...runOperations,
    ...exportOperations,
    ...projectOperations,
    ...viewOperations,
    "editor.state": () => editorStateOf()
  };
  let agent;

  async function run(name, args) {
    const checked = validateCall(name, args);
    if (!checked.ok) return checked;
    const handler = handlers[name];
    if (!handler) return failure("INTERNAL", `${name} is not available in the Editor yet`);
    if (!WITHOUT_PROJECT.has(name) && !editorStore.getState().doc) {
      return failure(
        "NOT_ALLOWED",
        "No project is open in this tab: projects.list lists them, projects.open opens one"
      );
    }
    try {
      return success(await handler({ ...options, agent }, checked.args));
    } catch (error) {
      return failure(error);
    }
  }

  let queue = Promise.resolve();
  return {
    /** Name the agent: its changes carry the name. */
    hello: name => {
      agent = typeof name === "string" && name.trim() ? name.trim() : undefined;
    },
    agent: () => agent,
    /**
     * Run an operation of the contract.
     * @param {string} name
     * @param {object} [args]
     * @returns {Promise<{ ok: true, result: any } | { ok: false, error: object }>}
     */
    call(name, args = {}) {
      const answered = queue.then(() => run(name, args));
      queue = answered.catch(() => {});
      return answered;
    }
  };
}
