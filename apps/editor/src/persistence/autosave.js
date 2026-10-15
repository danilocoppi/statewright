// Autosave (spec §4.4): about a second after the last change, the open project is signed and stored. Saves run one
// after another, so an older version never overwrites a newer one; a failed save is reported on the store's status
// (as the error's name, for example "QuotaExceededError") and retried on the next change or by `flush()`.
// When the page goes away (the tab is closed, reloaded or hidden) the change is stored at once, and while a change a
// person made is not stored yet the browser asks before leaving (spec §10: no work is lost); what the editor did by
// itself (a level arranged as it opens) is stored as the page goes, without asking.

export const AUTOSAVE_MS = 1000;

/**
 * @param {{ store: import("zustand/vanilla").StoreApi<any>, repository: import("./repository").Repository,
 *   delay?: number, page?: Window }} options `page` is the window whose leaving is watched (none outside a browser).
 * @returns {{ flush: (options?: { force?: boolean }) => Promise<void>, stop: () => void }} `force` stores the last change
 *   of a tab that was just made read-only (it is handing the project to another tab).
 */
export function startAutosave({ store, repository, delay = AUTOSAVE_MS, page = globalThis.window }) {
  let timer = null;
  let queue = Promise.resolve();

  const save = async ({ force = false } = {}) => {
    const { doc, version, readOnly, status } = store.getState();
    if (!doc || (readOnly && !force) || (!status.dirty && !status.error)) return;
    try {
      await repository.save(doc);
      if (store.getState().doc?.project.id === doc.project.id) store.getState().markSaved(version);
    } catch (error) {
      store.getState().markSaveFailed(error?.name || "Error");
    }
  };

  const flush = options => {
    clearTimeout(timer);
    timer = null;
    queue = queue.then(() => save(options));
    return queue;
  };

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.doc && state.version !== previous.version && !state.readOnly) {
      clearTimeout(timer);
      timer = setTimeout(flush, delay);
    }
  });

  const onLeave = () => flush();
  const onVisibilityChange = () => {
    if (page.document.visibilityState === "hidden") flush();
  };
  const onBeforeUnload = event => {
    const { doc, status } = store.getState();
    // A read-only tab too, when it handed the project over with a change it could not store.
    if (doc && ((status.dirty && status.byHand) || status.error)) event.preventDefault();
  };
  page?.addEventListener("pagehide", onLeave);
  page?.addEventListener("beforeunload", onBeforeUnload);
  page?.document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    flush,
    stop() {
      unsubscribe();
      clearTimeout(timer);
      page?.removeEventListener("pagehide", onLeave);
      page?.removeEventListener("beforeunload", onBeforeUnload);
      page?.document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}
