// Files on disk for the agent contract's file host (Node only: the CLI and the MCP server use it; `statewright/agent`
// does not export it, so the contract stays usable in a browser).
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/**
 * Files on disk, paths resolved against `cwd`. A write makes the folders it needs, goes to a temporary file beside the
 * target, then replaces it (a rename), so a reader never sees half a document; a link is followed, so the file it
 * points to is the one replaced, and the file keeps its permissions.
 * @param {{ cwd?: string }} [options]
 * @returns {import("../agent/memory-files.js").Files}
 */
export function nodeFiles({ cwd = process.cwd() } = {}) {
  const where = path => resolve(cwd, path);
  const missing = error => error?.code === "ENOENT";
  return {
    async read(path) {
      try {
        const [text, info] = await Promise.all([readFile(where(path), "utf8"), stat(where(path))]);
        return { text, modified: info.mtimeMs };
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    },
    async write(path, text) {
      const target = await realpath(where(path)).catch(error => {
        if (missing(error)) return where(path);
        throw error;
      });
      const mode = await stat(target).then(
        info => info.mode & 0o7777,
        () => null
      );
      const temporary = join(dirname(target), `.${randomBytes(6).toString("hex")}.statewright.tmp`);
      await mkdir(dirname(target), { recursive: true });
      try {
        await writeFile(temporary, text);
        if (mode !== null) await chmod(temporary, mode);
        await rename(temporary, target);
      } catch (error) {
        await rm(temporary, { force: true });
        throw error;
      }
    },
    key: where,
    async stat(path) {
      try {
        return { modified: (await stat(where(path))).mtimeMs };
      } catch (error) {
        if (missing(error)) return null;
        throw error;
      }
    }
  };
}
