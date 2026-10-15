import { describe, expect, it } from "vitest";

import { inlineWorker } from "@/workers/inline";
import { connect } from "@/workers/protocol";

const worker = handlers => connect(inlineWorker(async () => handlers));

describe("worker requests", () => {
  it("answers each request with its handler's result, as a copy", async () => {
    const client = worker({ echo: payload => payload, double: ({ n }) => n * 2 });
    const sent = { list: [1, 2] };
    const [echoed, doubled] = await Promise.all([client.request("echo", sent), client.request("double", { n: 21 })]);
    expect(doubled).toBe(42);
    expect(echoed).toEqual(sent);
    expect(echoed).not.toBe(sent);
  });

  it("rejects with the handler's error, by name and message", async () => {
    const client = worker({
      fail: () => {
        throw new RangeError("too far");
      }
    });
    await expect(client.request("fail", {})).rejects.toMatchObject({ name: "RangeError", message: "too far" });
  });

  it("rejects what is still waiting when the worker stops", async () => {
    const client = worker({ never: () => new Promise(() => {}) });
    const waiting = client.request("never", {});
    client.terminate();
    await expect(waiting).rejects.toThrow("The worker stopped");
  });

  it("rejects what is waiting, and every later request, when the worker cannot run", async () => {
    const broken = Object.assign(new EventTarget(), { postMessage() {}, terminate() {} });
    const client = connect(broken);
    const waiting = client.request("layout", {});
    broken.dispatchEvent(new Event("error"));
    await expect(waiting).rejects.toThrow("The worker could not run");
    await expect(client.request("layout", {})).rejects.toThrow("The worker could not run");
    expect(client.failed).toBe(true);
  }, 1000);
});
