// The file host (AI interface spec §4.3): the agent contract run on document files. A file is read once and kept in
// memory with its changes, read again when it changed on disk; every change is written at once, signed, whole.
import { createDocument } from "../create.js";
import { parse } from "../serialize/parse.js";
import { stringify } from "../serialize/stringify.js";
import { sign, verify } from "../signature.js";
import { documentOperations } from "./documents.js";
import { AgentError, failure, success } from "./errors.js";
import { editOperations } from "./file/edit.js";
import { exportOperations } from "./file/export.js";
import { runOperations } from "./file/run.js";
import { validateCall } from "./contract.js";

/**
 * @typedef {object} Session A file the host has open.
 * @property {any} doc The document as it is now.
 * @property {number} modified The file's version when the host last read or wrote it.
 * @property {boolean} changed Its content was changed outside Statewright (its signature does not match).
 * @property {Array<{ label: string, patches: any[], inversePatches: any[] }>} undo The session's changes.
 * @property {Array<{ label: string, patches: any[], inversePatches: any[] }>} redo
 * @property {object | null} [run] The file's run (`run.start`), lost when the file is read again.
 */

/**
 * The file host: `call(name, args, { file, acceptChanges })` runs an operation of the contract on a document file and
 * resolves to its result — never throws. A call without `file` runs on the file opened last (`projects.open`,
 * `projects.create`, else `file`). Operations that need the Editor answer `NEEDS_EDITOR`.
 * @param {{ files: import("./memory-files.js").Files, agent?: string, file?: string,
 *   operations?: Record<string, Function> }} options `files`: where documents are read and written (`memoryFiles`, or
 *   the Node adapter); `agent`: the name written in the documents it signs; `file`: the file of calls without one.
 */
export function createFileHost({ files, agent, file: initial, operations = {} }) {
  let current = initial ?? null;
  const generator = { channel: "api", ...(agent ? { agent } : {}) };
  /** Opening and creating projects: they choose the file later calls run on. */
  const projectOperations = {
    "projects.open": async (_session, { id, path }) => {
      if (id) throw new AgentError("NEEDS_EDITOR", "projects.open by id needs the Editor; on a file, give its path");
      const { doc } = await open(path);
      current = path;
      return { project: { id: doc.project.id, name: doc.project.name }, file: path };
    },
    "projects.create": async (_session, { name, kind, path }) => {
      if (!path) throw new AgentError("FILE", "Give the path to write the new .sttw at (path)");
      if (await touching(path, "read", () => files.stat(path))) {
        throw new AgentError("FILE", `${path} already exists`, { file: path });
      }
      const doc = createDocument({ name, kind });
      const text = stringify(await sign(doc, generator));
      await touching(path, "write", () => files.write(path, text));
      current = path;
      return { project: { id: doc.project.id, name: doc.project.name }, written: path };
    }
  };
  for (const handler of Object.values(projectOperations)) handler.withoutFile = true;
  const handlers = {
    ...documentOperations,
    ...editOperations,
    ...runOperations,
    ...exportOperations,
    ...projectOperations,
    ...operations
  };
  /** @type {Map<string, Session>} */
  const sessions = new Map();
  /** The key of a file's session: the same for every path that names the file (`files.key`), else the path. */
  const keyOf = file => (files.key ? files.key(file) : file);

  /** Read or write a file, or say why it cannot be done. */
  async function touching(file, verb, action) {
    try {
      return await action();
    } catch (error) {
      throw new AgentError("FILE", `Cannot ${verb} ${file}: ${error?.message ?? error}`, { file });
    }
  }

  /** The session of a file: kept while the file is as the host left it, read again otherwise. */
  async function open(file) {
    const kept = sessions.get(keyOf(file));
    const now = await touching(file, "read", () => files.stat(file));
    if (!now) throw new AgentError("FILE", `Cannot read ${file}: no such file`, { file });
    if (kept && kept.modified === now.modified) return kept;
    const read = await touching(file, "read", () => files.read(file));
    const parsed = parse(read.text);
    if (!parsed.ok) {
      const [first] = parsed.errors;
      throw new AgentError(
        "FILE",
        `${file} is not a valid Statewright document: ${first.path || "/"} ${first.message}`,
        {
          file,
          errors: parsed.errors
        }
      );
    }
    const raw = parsed.migrations.length ? JSON.parse(read.text.replace(/^\uFEFF/, "")) : parsed.doc;
    const session = {
      doc: parsed.doc,
      modified: read.modified,
      changed: (await verify(raw)).content === "changed",
      undo: [],
      redo: []
    };
    sessions.set(keyOf(file), session);
    return session;
  }

  /** Write a session's document, signed by the agent. */
  async function save(file, session) {
    const text = stringify(await sign(session.doc, generator));
    await touching(file, "write", () => files.write(file, text));
    session.modified = (await touching(file, "read", () => files.stat(file))).modified;
    session.changed = false;
  }

  /** Run one call; never throws. */
  async function run(name, args, { file, acceptChanges = false } = {}) {
    const checked = validateCall(name, args);
    if (!checked.ok) return checked;
    const { operation } = checked;
    if (operation.needs === "editor") {
      return failure(
        "NEEDS_EDITOR",
        `${name} needs the Editor: pair one (Connect an AI… in the Editor) and call it without a file`
      );
    }
    const handler = handlers[name];
    if (!handler) return failure("INTERNAL", `${name} is not available on a file`);
    const target = file ?? current;
    let session = null;
    let before = null;
    try {
      session = !handler.withoutFile && target ? await open(target) : null;
      if (!session && !handler.withoutFile) {
        throw new AgentError("FILE", "Give the path of a .sttw (file), or open one (projects.open)");
      }
      if (operation.writes && session.changed && !acceptChanges) {
        throw new AgentError(
          "FILE",
          `${target} was changed outside Statewright; review it, then call again with acceptChanges to write it`,
          { file: target, review: true }
        );
      }
      if (operation.writes && session.run && name !== "scenario.save") {
        throw new AgentError("SIMULATING", "The document is not edited while a run is on: stop it first (run.stop)");
      }
      before = session && {
        doc: session.doc,
        undo: [...session.undo],
        redo: [...session.redo],
        run: session.run && { ...session.run }
      };
      const result = await handler(session, checked.args, { file: target, files, agent, read: touching });
      if (session && session.doc !== before.doc) await save(target, session);
      return success(result);
    } catch (error) {
      // A call that fails keeps nothing of what it did: the file and the session say the same.
      if (session && before) Object.assign(session, before);
      return failure(error);
    }
  }

  let queue = Promise.resolve();
  return {
    /** The session of a file the host has open, if any (for the hosts built on this one). */
    session: file => sessions.get(keyOf(file)),
    /** The file of calls without one, if any. */
    current: () => current,
    /** Whether an operation runs without a file (it opens or creates one). */
    runsWithoutFile: name => Boolean(handlers[name]?.withoutFile),
    /**
     * Run an operation of the contract on a file. Calls run one at a time, in the order they came, so calls made at
     * once on a file each see the one before.
     * @param {string} name
     * @param {object} [args]
     * @param {{ file?: string, acceptChanges?: boolean }} [target]
     * @returns {Promise<{ ok: true, result: any } | { ok: false, error: object }>}
     */
    call(name, args = {}, target = {}) {
      const result = queue.then(() => run(name, args, target ?? {}));
      queue = result.catch(() => {});
      return result;
    }
  };
}
