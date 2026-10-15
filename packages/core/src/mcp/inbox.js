// The pairing's inbox (collaboration spec §3.2): what the person writes from the Editor, kept until the agent reads it —
// by editor_wait, editor_inbox, or a reply to it. A stop message bars the agent's next actions until it is read. Pure:
// the bridge keeps one per paired session and closes it when the session ends.

/** @typedef {{ id: string, at: string, text?: string, action?: string, context?: object, stop?: true }} Message */

/**
 * @param {{ now?: () => Date, number?: () => number }} [options] `number`: the next message's number — the bridge
 *   counts across pairings, so an answer to an old message never reads a new one.
 */
export function createInbox({ now = () => new Date(), number } = {}) {
  /** @type {Message[]} */
  const unread = [];
  const read = new Set();
  /** Waits for a message: `{ resolve }`, the oldest first. */
  const waiters = [];
  const added = new Set();
  const reads = new Set();
  let next = 0;
  let closed = false;

  const tellRead = ids => {
    if (!ids.length) return;
    for (const listener of reads) listener(ids);
  };

  /** The unread messages, now read. */
  function take() {
    const taken = unread.splice(0);
    for (const message of taken) read.add(message.id);
    tellRead(taken.map(message => message.id));
    return taken;
  }

  return {
    /** Put a message in: `{ text?, action?, context?, stop? }`. */
    add(body) {
      next += 1;
      const { text, action, context, stop } = body;
      /** @type {Message} */
      const message = {
        id: `msg_${number ? number() : next}`,
        at: now().toISOString(),
        ...(text !== undefined ? { text } : {}),
        ...(action !== undefined ? { action } : {}),
        ...(context !== undefined ? { context } : {}),
        ...(stop ? { stop: true } : {})
      };
      unread.push(message);
      for (const listener of added) listener(message);
      const waiter = waiters.shift();
      if (waiter) waiter.resolve(take());
      return message;
    },

    unread: () => [...unread],

    take,

    /** A message answered by the agent: read, whether or not it was handed out. False when there is no such message. */
    markRead(id) {
      if (read.has(id)) return true;
      const at = unread.findIndex(message => message.id === id);
      if (at < 0) return false;
      unread.splice(at, 1);
      read.add(id);
      tellRead([id]);
      return true;
    },

    stopping: () => unread.some(message => message.stop),

    /**
     * The unread messages as soon as there are some (at once when some wait), or none after `ms` or when `signal`
     * aborts.
     * @returns {Promise<Message[]>}
     */
    wait(ms, signal) {
      if (closed) return Promise.resolve([]);
      if (unread.length) return Promise.resolve(take());
      return new Promise(resolve => {
        const waiter = {
          resolve: messages => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
            resolve(messages);
          }
        };
        const leave = () => {
          const at = waiters.indexOf(waiter);
          if (at >= 0) waiters.splice(at, 1);
          waiter.resolve([]);
        };
        const abort = () => leave();
        const timer = setTimeout(leave, ms);
        signal?.addEventListener("abort", abort, { once: true });
        waiters.push(waiter);
      });
    },

    /** No more waiting: every wait answers none, now and later. */
    close() {
      closed = true;
      for (const waiter of waiters.splice(0)) waiter.resolve([]);
    },

    onAdd(listener) {
      added.add(listener);
      return () => added.delete(listener);
    },

    onRead(listener) {
      reads.add(listener);
      return () => reads.delete(listener);
    }
  };
}
