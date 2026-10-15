// Live Problems (spec §4.3): `check(doc)` runs in the Problems worker 150 ms after the last change. A result is kept
// only if the document is still the one it was computed on; older results are dropped.

export const CHECK_DELAY_MS = 150;

/**
 * @param {{ editor: import("zustand/vanilla").StoreApi<any>, problems: ReturnType<
 *   typeof import("./store").createProblemsStore>, client: { request: Function }, delay?: number }} options
 * @returns {() => void} stop
 */
export function watchProblems({ editor, problems, client, delay = CHECK_DELAY_MS }) {
  let timer = null;
  // Whatever was found before belongs to another project, or to a page that is gone.
  problems.getState().clear();

  const run = async () => {
    const { doc, version } = editor.getState();
    if (!doc) return;
    try {
      const list = await client.request("check", { doc });
      if (editor.getState().doc === doc) problems.getState().set(version, list);
    } catch {
      // A failed check leaves the last Problems in place; the next change checks again.
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };

  const unsubscribe = editor.subscribe((state, previous) => {
    if (state.doc === previous.doc) return;
    if (state.doc?.project.id !== previous.doc?.project.id) problems.getState().clear();
    if (!state.doc) return clearTimeout(timer);
    schedule();
  });
  if (editor.getState().doc) schedule();

  return () => {
    unsubscribe();
    clearTimeout(timer);
  };
}
