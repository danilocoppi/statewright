// Files kept in memory, for the file host where there is no disk: tests, and hosts that hold documents themselves.

/**
 * @typedef {object} Files What the file host reads and writes documents with.
 * @property {(path: string) => Promise<{ text: string, modified: number } | null>} read null when there is no file.
 * @property {(path: string, text: string) => Promise<void>} write Replaces the file whole (atomically on disk).
 * @property {(path: string) => Promise<{ modified: number } | null>} stat null when there is no file.
 * @property {(path: string) => string} [key] One key for every path that names the same file (on disk: the path
 *   resolved against the working directory); without it, a path is its own key.
 */

/**
 * Files in memory: each write makes a newer version, so the host sees a change made by someone else.
 * @param {Record<string, string>} [initial] Path → text.
 * @returns {Files & { text(path: string): string | undefined }}
 */
export function memoryFiles(initial = {}) {
  const files = new Map();
  let clock = 0;
  const put = (path, text) => files.set(path, { text, modified: ++clock });
  for (const [path, text] of Object.entries(initial)) put(path, text);
  return {
    read: async path => (files.has(path) ? { ...files.get(path) } : null),
    write: async (path, text) => void put(path, text),
    stat: async path => (files.has(path) ? { modified: files.get(path).modified } : null),
    text: path => files.get(path)?.text
  };
}
