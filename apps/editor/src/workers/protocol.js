// Requests to a worker (spec §4.3: Problems and layout run off the main thread). Each message carries an ID; the worker
// answers with the result or the error of the named handler.

/**
 * Answer requests on `scope` (a worker's `self`, or one end of an inline worker) with `handlers[type](payload)`.
 * @param {Record<string, (payload: any) => any>} handlers
 * @param {{ addEventListener: Function, postMessage: Function }} scope
 */
export function serve(handlers, scope) {
  scope.addEventListener("message", async ({ data: { id, type, payload } }) => {
    try {
      scope.postMessage({ id, result: await handlers[type](payload) });
    } catch (error) {
      scope.postMessage({ id, error: { name: error?.name ?? "Error", message: error?.message ?? String(error) } });
    }
  });
}

/**
 * A client of a worker: `request(type, payload)` resolves with the handler's result or rejects with its error. A
 * worker that cannot run (its script failed to load, or a message could not be read) rejects what is waiting and
 * every later request, and the client says so with `failed`.
 * @param {{ addEventListener: Function, postMessage: Function, terminate?: Function }} worker
 * @returns {{ request: (type: string, payload: any) => Promise<any>, terminate: () => void, readonly failed: boolean }}
 */
export function connect(worker) {
  const pending = new Map();
  let next = 0;
  let failed = false;
  const rejectAll = message => {
    for (const waiting of pending.values()) waiting.reject(new Error(message));
    pending.clear();
  };
  const fail = () => {
    failed = true;
    rejectAll("The worker could not run");
  };
  worker.addEventListener("error", fail);
  worker.addEventListener("messageerror", fail);
  worker.addEventListener("message", ({ data: { id, result, error } }) => {
    const waiting = pending.get(id);
    if (!waiting) return;
    pending.delete(id);
    if (error) waiting.reject(Object.assign(new Error(error.message), { name: error.name }));
    else waiting.resolve(result);
  });
  return {
    request(type, payload) {
      if (failed) return Promise.reject(new Error("The worker could not run"));
      const id = ++next;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, type, payload });
      });
    },
    terminate() {
      worker.terminate?.();
      rejectAll("The worker stopped");
    },
    get failed() {
      return failed;
    }
  };
}
