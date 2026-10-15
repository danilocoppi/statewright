// window.statewright (AI interface spec §7.1), present in every tab of the Editor: `hello({ agent })` names the agent,
// `call(operation, args)` runs any operation of the contract, and each operation is also a method
// (`statewright.batch.apply({ commands, label })`); `operations` lists the catalogue, `state()` says what is shown.
import { OPERATIONS, inputSchemaOf } from "statewright/agent";

import { router } from "@/router";

import { createEditorHost } from "./host";
import { editorStateOf } from "./state";

/**
 * The object an agent in the browser talks to.
 * @param {ReturnType<typeof createEditorHost>} host
 */
export function statewrightOf(host) {
  const api = {
    hello({ agent } = {}) {
      host.hello(agent);
      return { agent: host.agent() ?? null, operations: OPERATIONS.length };
    },
    call: (name, args) => host.call(name, args),
    /** What the Editor shows now (spec §7.2), at once. */
    state: () => editorStateOf(),
    operations: OPERATIONS.map(operation => ({
      name: operation.name,
      summary: operation.summary,
      ...(operation.needs ? { needs: operation.needs } : {}),
      ...(operation.writes ? { writes: true } : {}),
      errors: [...operation.errors],
      input: inputSchemaOf(operation.name)
    }))
  };
  for (const { name } of OPERATIONS) {
    const [group, action] = name.split(".");
    api[group] ??= {};
    api[group][action] = args => host.call(name, args);
  }
  return api;
}

export const editorHost = createEditorHost({ navigate: path => router.navigate(path) });

globalThis.statewright = statewrightOf(editorHost);
