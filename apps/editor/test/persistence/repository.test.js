import "fake-indexeddb/auto";

import { verify } from "statewright";
import { describe, expect, it } from "vitest";

import { memoryRepository, openRepository } from "@/persistence/repository";

import { demoDoc, readExample } from "../fixtures.js";

let counter = 0;
/** A fresh IndexedDB database per test. */
const fresh = () => openRepository({ name: `statewright-test-${++counter}` });

/** Make every write of one kind to one store fail, as a full disk would, while `run` runs. */
async function failing(method, store, run) {
  const original = IDBObjectStore.prototype[method];
  IDBObjectStore.prototype[method] = function fail(...args) {
    if (this.name === store) throw new DOMException("The disk is full", "QuotaExceededError");
    return original.apply(this, args);
  };
  try {
    return await run();
  } finally {
    IDBObjectStore.prototype[method] = original;
  }
}

describe("repository", () => {
  it("stores a project whole or not at all: its document and its card change together", async () => {
    const repository = await fresh();
    const { doc } = await repository.save(readExample("get-paid-as-built"), { now: 1000 });
    const renamed = { ...doc, project: { ...doc.project, name: "Renamed" } };
    await failing("put", "projects", () => expect(repository.save(renamed, { now: 2000 })).rejects.toThrow());
    expect((await repository.load("prj_getPaid")).project.name).toBe("Get paid (as built)");
    expect((await repository.list())[0]).toMatchObject({ name: "Get paid (as built)", updatedAt: 1000 });

    await failing("delete", "documents", () => expect(repository.remove("prj_getPaid")).rejects.toThrow());
    expect(await repository.has("prj_getPaid")).toBe(true);
    expect(await repository.load("prj_getPaid")).not.toBeNull();
  });

  it("stores a signed document and lists its summary with a thumbnail", async () => {
    const repository = await fresh();
    expect(repository.persistent).toBe(true);
    const { doc, summary } = await repository.save(readExample("get-paid-as-built"), { now: 1000 });
    expect(await verify(doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
    expect(doc.generator).toMatchObject({ channel: "editor", name: "statewright-editor" });
    expect(summary).toMatchObject({
      id: "prj_getPaid",
      name: "Get paid (as built)",
      stage: "as-built",
      updatedAt: 1000
    });
    expect(summary.thumbnail.startsWith("<svg")).toBe(true);
    expect(summary.thumbnail).not.toMatch(/<rect x="0\.5" y="0\.5"/);
    expect(await repository.list()).toEqual([summary]);
    expect(await repository.load("prj_getPaid")).toEqual(doc);
    expect(await repository.has("prj_getPaid")).toBe(true);
    expect(await repository.load("prj_none")).toBeNull();
  });

  it("lists the most recently changed project first", async () => {
    const repository = await fresh();
    await repository.save(readExample("payments"), { now: 1000 });
    await repository.save(demoDoc(), { now: 3000 });
    await repository.save(readExample("get-paid-as-built"), { now: 2000 });
    expect((await repository.list()).map(summary => summary.id)).toEqual(["prj_demo", "prj_getPaid", "prj_payments"]);
  });

  it("keeps the previous thumbnail unless asked to redraw it", async () => {
    const repository = await fresh();
    const first = await repository.save(demoDoc(), { now: 1 });
    const renamed = { ...first.doc, project: { ...first.doc.project, name: "Renamed" } };
    const second = await repository.save(renamed, { now: 2 });
    expect(second.summary.name).toBe("Renamed");
    expect(second.summary.thumbnail).toBe(first.summary.thumbnail);
    const withNode = structuredClone(renamed);
    withNode.canvases.cnv_demo.nodes.nod_db = { kind: "store", name: "Database" };
    const third = await repository.save(withNode, { thumbnail: true, now: 3 });
    expect(third.summary.thumbnail).not.toBe(first.summary.thumbnail);
  });

  it("removes a project with its file handle and restores it exactly", async () => {
    const repository = await fresh();
    const { summary } = await repository.save(demoDoc(), { now: 1 });
    await repository.setHandle("prj_demo", { name: "demo.sttw" });
    const record = await repository.remove("prj_demo");
    expect(await repository.list()).toEqual([]);
    expect(await repository.getHandle("prj_demo")).toBeUndefined();
    await repository.restore(record);
    expect(await repository.list()).toEqual([summary]);
    expect(await repository.getHandle("prj_demo")).toEqual({ name: "demo.sttw" });
    expect(await repository.remove("prj_none")).toBeNull();
  });

  it("falls back to memory when IndexedDB is missing or refuses to open", async () => {
    const missing = await openRepository({ indexedDB: null });
    expect(missing.persistent).toBe(false);
    const broken = await openRepository({
      indexedDB: {
        open() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        }
      }
    });
    expect(broken.persistent).toBe(false);
    const { summary } = await broken.save(demoDoc(), { now: 5 });
    expect(await broken.list()).toEqual([summary]);
  });

  it("works the same in memory", async () => {
    const repository = memoryRepository();
    await repository.save(demoDoc(), { now: 1 });
    expect((await repository.load("prj_demo")).project.name).toBe("Demo");
  });
});
