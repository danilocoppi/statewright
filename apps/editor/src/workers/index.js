// The app's two workers, started on first use. Vite bundles each `new Worker(new URL(…))` as its own chunk, so ELK
// is downloaded only when something needs placing. Where module workers are missing, or a worker cannot start (its
// chunk is gone after a new release), the same handlers run in the page.
import { inlineWorker } from "./inline";
import { connect } from "./protocol";

const hasWorkers = typeof Worker === "function";

/**
 * A client that starts its worker on first use and falls back to the page for good when the worker cannot run.
 * @param {() => Worker} start
 * @param {() => Promise<Record<string, (payload: any) => any>>} loadHandlers
 */
function client(start, loadHandlers) {
  const inPage = () => connect(inlineWorker(loadHandlers));
  let current = null;
  return {
    async request(type, payload) {
      current ??= hasWorkers ? connect(start()) : inPage();
      const used = current;
      try {
        return await used.request(type, payload);
      } catch (error) {
        if (!used.failed) throw error;
        if (current === used) current = inPage();
        return current.request(type, payload);
      }
    }
  };
}

let layout = null;
let problems = null;

/** The layout worker's client: `request("layout", { doc, canvasId, scope })` → Core commands. */
export function layoutClient() {
  layout ??= client(
    () => new Worker(new URL("./layout.worker.js", import.meta.url), { type: "module", name: "layout" }),
    async () => (await import("./layout")).handlers
  );
  return layout;
}

/** The Problems worker's client: `request("check", { doc })` → Core Problems. */
export function problemsClient() {
  problems ??= client(
    () => new Worker(new URL("./problems.worker.js", import.meta.url), { type: "module", name: "problems" }),
    async () => (await import("./problems")).handlers
  );
  return problems;
}
