// A worker that runs in the page: the same protocol and handlers, without a thread. Used where module workers are
// missing (the test environment).
import { serve } from "./protocol";

/** One end of an in-page channel: messages posted here arrive, a task later and as a copy, at the other end. */
function end() {
  const target = new EventTarget();
  // The event of the same realm as its target: a message posted just before a test's environment is torn down is
  // dispatched after it, when the global MessageEvent may be another realm's.
  const Message = globalThis.MessageEvent;
  return {
    target,
    Message,
    other: null,
    addEventListener: (type, listener) => target.addEventListener(type, listener),
    postMessage(data) {
      const copy = structuredClone(data);
      const other = this.other;
      setTimeout(() => other.target.dispatchEvent(new other.Message("message", { data: copy })));
    }
  };
}

/**
 * @param {() => Promise<Record<string, (payload: any) => any>>} loadHandlers
 * @returns {{ addEventListener: Function, postMessage: Function, terminate: () => void }}
 */
export function inlineWorker(loadHandlers) {
  const page = end();
  const worker = end();
  page.other = worker;
  worker.other = page;
  const ready = loadHandlers().then(handlers => serve(handlers, worker));
  return {
    addEventListener: page.addEventListener,
    postMessage: data => ready.then(() => page.postMessage(data)),
    terminate() {}
  };
}
