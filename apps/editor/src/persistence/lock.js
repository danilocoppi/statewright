// One editing tab per project (spec §4.7). The Web Locks API holds a per-project lock; a tab that finds it taken is
// read-only until the person chooses "Edit here", which asks the holder (over a BroadcastChannel) to save and step
// back. Browsers without Web Locks edit in every tab.

const CHANNEL = "statewright:locks";

/**
 * @param {string} projectId
 * @param {{ locks?: LockManager, channel?: BroadcastChannel,
 *   onChange: (mode: "editing" | "read-only" | "released") => void, beforeRelease?: () => Promise<void> }} options
 *   `beforeRelease` runs before handing the project to another tab (stop changes and store the last one there);
 *   "released" is said once it is handed over, "read-only" when the tab opens while another one edits.
 * @returns {{ takeOver: () => void, dispose: () => void }}
 */
/**
 * Run `task` holding the project's lock, so no tab edits the project meanwhile — or, when a tab has it open for
 * editing, leave it and resolve to false (spec §4.7: one editing tab per project; the change belongs there).
 * @param {string} projectId
 * @param {() => Promise<void>} task
 * @param {{ locks?: LockManager }} [options]
 * @returns {Promise<boolean>} Whether the task ran.
 */
export async function whileClosed(projectId, task, { locks = globalThis.navigator?.locks } = {}) {
  if (!locks) {
    await task();
    return true;
  }
  return locks.request(`statewright:project:${projectId}`, { ifAvailable: true }, async lock => {
    if (!lock) return false;
    await task();
    return true;
  });
}

export function lockProject(projectId, { locks = globalThis.navigator?.locks, channel, onChange, beforeRelease }) {
  if (!locks) {
    onChange("editing");
    return { takeOver: () => {}, dispose: () => {} };
  }
  const name = `statewright:project:${projectId}`;
  const messages = channel ?? new BroadcastChannel(CHANNEL);
  let release = null;
  let disposed = false;

  const hold = lock => {
    if (!lock || disposed) return null;
    onChange("editing");
    return new Promise(resolve => (release = resolve));
  };
  const letGo = () => {
    release?.();
    release = null;
  };

  messages.onmessage = async ({ data }) => {
    if (data?.type !== "take-over" || data.projectId !== projectId || !release) return;
    await beforeRelease?.();
    letGo();
    onChange("released");
  };

  locks
    .request(name, { ifAvailable: true }, lock => {
      if (!lock) onChange("read-only");
      return hold(lock);
    })
    .catch(() => onChange("editing"));

  return {
    takeOver() {
      messages.postMessage({ type: "take-over", projectId });
      locks.request(name, hold).catch(() => {});
    },
    dispose() {
      disposed = true;
      letGo();
      messages.onmessage = null;
      if (!channel) messages.close();
    }
  };
}
