// Projects in this browser (spec §4.4): IndexedDB with three stores —
//   projects   summaries for the Projects screen: { id, name, stage, updatedAt, thumbnail }
//   documents  the signed, canonical document text: { id, json }
//   handles    the file each project was opened from or saved to (a FileSystemFileHandle), by project ID
// When IndexedDB is unavailable (some private windows) the same interface works in memory, with
// `persistent: false`, so the app still opens and edits files and asks the person to save them.
// Writes run one after another, and every read waits for the writes started before it: a project saved while leaving
// the editor is listed and loaded as saved.
import { wrap } from "idb";
import { parse, sign, stringify } from "statewright";

import { APP } from "@/config/app";
import { renderSVG } from "@/lib/render";

const DB_VERSION = 1;

/** Who signs documents saved by the Editor. */
export const GENERATOR = { channel: "editor", name: "statewright-editor", version: APP.version };

/** Why the browser refused to store a project, as a key of `editor:status.reasons`: its storage is full, or other. */
export const storageReason = errorName => (errorName === "QuotaExceededError" ? errorName : "other");

/**
 * @typedef {{ id: string, name: string, stage: string | null, updatedAt: number, thumbnail: string | null }} Summary
 * @typedef {{ summary: Summary, json: string, handle?: unknown }} ProjectRecord
 * @typedef {object} Repository
 * @property {boolean} persistent
 * @property {() => Promise<Summary[]>} list Newest first.
 * @property {(id: string) => Promise<boolean>} has
 * @property {(id: string) => Promise<object | null>} load
 * @property {(doc: object, options?: { thumbnail?: boolean, now?: number }) => Promise<{ doc: object, summary: Summary }>} save
 *   Signs and stores the document; the thumbnail is redrawn when asked or when there is none yet.
 * @property {(id: string) => Promise<ProjectRecord | null>} remove Returns what was removed, for undo.
 * @property {(record: ProjectRecord) => Promise<void>} restore
 * @property {(id: string) => Promise<unknown>} getHandle
 * @property {(id: string, handle: unknown) => Promise<void>} setHandle
 */

/**
 * The root canvas without header and legend, as a small preview. The figure's own card (its first, full-size rect) is
 * left out: the project card already frames it.
 */
export const thumbnailOf = async doc =>
  (await renderSVG(doc, doc.root, { header: false, legend: false, idPrefix: `thumb-${doc.project.id}` })).replace(
    /<\/defs><rect x="0\.5" y="0\.5"[^>]*\/>/,
    "</defs>"
  );

/** @returns {Summary} */
export function summarize(doc, { updatedAt, thumbnail }) {
  return {
    id: doc.project.id,
    name: doc.project.name,
    stage: doc.canvases[doc.root]?.stage ?? null,
    updatedAt,
    thumbnail
  };
}

/**
 * A key-value backend: IndexedDB through idb, or Maps. `write` makes several changes together — all of them or none.
 * @typedef {["put", string, object, string?] | ["delete", string, string]} Change
 */
function memoryBackend() {
  const stores = { projects: new Map(), documents: new Map(), handles: new Map() };
  return {
    get: async (store, key) => stores[store].get(key),
    getAll: async store => [...stores[store].values()],
    /** @param {Change[]} changes */
    write: async changes => {
      for (const [kind, store, value, key] of changes) {
        if (kind === "put") stores[store].set(key ?? value.id, value);
        else stores[store].delete(value);
      }
    }
  };
}

function repositoryOn(backend, persistent) {
  let writes = Promise.resolve();
  /** Run a write after the writes before it; a failed write fails its caller only. */
  const write = task => {
    const run = writes.then(task);
    writes = run.catch(() => {});
    return run;
  };
  /** Run a read once the writes started before it are done. */
  const read = task => writes.then(task);

  return {
    persistent,

    list: () =>
      read(async () => {
        const summaries = await backend.getAll("projects");
        return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
      }),

    has: id => read(async () => Boolean(await backend.get("projects", id))),

    load: id =>
      read(async () => {
        const stored = await backend.get("documents", id);
        if (!stored) return null;
        const result = parse(stored.json);
        if (!result.ok) throw new Error(`The stored copy of ${id} is damaged`);
        return result.doc;
      }),

    save: (doc, { thumbnail = false, now = Date.now() } = {}) =>
      write(async () => {
        const signed = await sign(doc, GENERATOR, { now: new Date(now) });
        const previous = await backend.get("projects", doc.project.id);
        const summary = summarize(signed, {
          updatedAt: now,
          thumbnail: thumbnail || !previous?.thumbnail ? await thumbnailOf(signed) : previous.thumbnail
        });
        // The document and its card together: a card never lists a document that was not stored, nor the reverse.
        await backend.write([
          ["put", "documents", { id: summary.id, json: stringify(signed) }],
          ["put", "projects", summary]
        ]);
        return { doc: signed, summary };
      }),

    remove: id =>
      write(async () => {
        const summary = await backend.get("projects", id);
        if (!summary) return null;
        const record = {
          summary,
          json: (await backend.get("documents", id))?.json,
          handle: await backend.get("handles", id)
        };
        await backend.write([
          ["delete", "projects", id],
          ["delete", "documents", id],
          ["delete", "handles", id]
        ]);
        return record;
      }),

    restore: ({ summary, json, handle }) =>
      write(async () => {
        await backend.write([
          ["put", "documents", { id: summary.id, json }],
          ["put", "projects", summary],
          ...(handle ? [["put", "handles", handle, summary.id]] : [])
        ]);
      }),

    getHandle: id => read(() => backend.get("handles", id)),
    setHandle: (id, handle) => write(() => backend.write([["put", "handles", handle, id]]))
  };
}

/** A repository that keeps projects only while the page is open. */
export const memoryRepository = () => repositoryOn(memoryBackend(), false);

/**
 * Open the browser's project storage, or fall back to memory when IndexedDB is missing or refuses to open.
 * @param {{ name?: string, indexedDB?: IDBFactory }} [options]
 * @returns {Promise<Repository>}
 */
export async function openRepository({ name = APP.storagePrefix, indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) return memoryRepository();
  try {
    const request = indexedDB.open(name, DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      database.createObjectStore("projects", { keyPath: "id" });
      database.createObjectStore("documents", { keyPath: "id" });
      database.createObjectStore("handles");
    });
    const db = await wrap(request);
    const backend = {
      get: (store, key) => db.get(store, key),
      getAll: store => db.getAll(store),
      // One transaction: if any change fails, none is kept.
      write: async changes => {
        const tx = db.transaction([...new Set(changes.map(([, store]) => store))], "readwrite");
        const requests = [];
        try {
          for (const [kind, store, value, key] of changes)
            requests.push(kind === "put" ? tx.objectStore(store).put(value, key) : tx.objectStore(store).delete(value));
        } catch (error) {
          tx.abort();
          await Promise.allSettled([...requests, tx.done]);
          throw error;
        }
        await Promise.all([...requests, tx.done]);
      }
    };
    return repositoryOn(backend, true);
  } catch {
    return memoryRepository();
  }
}
