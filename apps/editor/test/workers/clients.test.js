import { afterEach, describe, expect, it, vi } from "vitest";

import { demoDoc } from "../fixtures.js";

/** A module worker whose script cannot be loaded (its chunk is gone after a new release): it only reports an error. */
class MissingWorker extends EventTarget {
  static started = 0;

  constructor() {
    super();
    MissingWorker.started += 1;
    setTimeout(() => this.dispatchEvent(new Event("error")));
  }

  postMessage() {}

  terminate() {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("the workers' clients", () => {
  it("does the work in the page when a worker cannot start", async () => {
    vi.stubGlobal("Worker", MissingWorker);
    vi.resetModules();
    const { problemsClient } = await import("@/workers");
    const problems = await problemsClient().request("check", { doc: demoDoc() });
    expect(Array.isArray(problems)).toBe(true);
    expect(await problemsClient().request("check", { doc: demoDoc() })).toEqual(problems);
    expect(MissingWorker.started).toBe(1);
  }, 3000);
});
