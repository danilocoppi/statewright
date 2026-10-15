import { describe, expect, it, vi } from "vitest";

import { lockProject, whileClosed } from "@/persistence/lock";

/** A LockManager for one page: exclusive locks, `ifAvailable`, and queued requests; each resolves to its callback's result. */
function fakeLocks() {
  const held = new Map();
  const queues = new Map();
  const grant = (name, callback) => {
    held.set(name, true);
    const result = Promise.resolve(callback({ name }));
    result.finally(() => {
      held.delete(name);
      const next = queues.get(name)?.shift();
      if (next) grant(name, next);
    });
    return result;
  };
  return {
    request(name, options, callback) {
      if (typeof options === "function") [callback, options] = [options, {}];
      if (!held.has(name)) return grant(name, callback);
      if (options.ifAvailable) return Promise.resolve(callback(null));
      queues.set(name, [...(queues.get(name) ?? []), callback]);
      return Promise.resolve();
    }
  };
}

/** Two tabs' BroadcastChannels connected to each other. */
function channelPair() {
  const a = { postMessage: data => b.onmessage?.({ data }) };
  const b = { postMessage: data => a.onmessage?.({ data }) };
  return [a, b];
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe("lockProject", () => {
  it("lets the first tab edit and makes the second read-only", async () => {
    const locks = fakeLocks();
    const [first, second] = channelPair();
    const one = vi.fn();
    const two = vi.fn();
    lockProject("prj_demo", { locks, channel: first, onChange: one });
    lockProject("prj_demo", { locks, channel: second, onChange: two });
    await settle();
    expect(one.mock.calls).toEqual([["editing"]]);
    expect(two.mock.calls).toEqual([["read-only"]]);
  });

  it("hands the project over when the other tab chooses to edit, saving first", async () => {
    const locks = fakeLocks();
    const [first, second] = channelPair();
    const one = vi.fn();
    const two = vi.fn();
    const beforeRelease = vi.fn(async () => {});
    lockProject("prj_demo", { locks, channel: first, onChange: one, beforeRelease });
    const reader = lockProject("prj_demo", { locks, channel: second, onChange: two });
    await settle();
    reader.takeOver();
    await settle();
    await settle();
    expect(beforeRelease).toHaveBeenCalledOnce();
    // Handed over, which is not the same as opened read-only: the tab shows what is stored now.
    expect(one.mock.calls).toEqual([["editing"], ["released"]]);
    expect(two.mock.calls).toEqual([["read-only"], ["editing"]]);
  });

  it("does not interfere between different projects", async () => {
    const locks = fakeLocks();
    const [first, second] = channelPair();
    const one = vi.fn();
    const two = vi.fn();
    lockProject("prj_a", { locks, channel: first, onChange: one });
    lockProject("prj_b", { locks, channel: second, onChange: two });
    await settle();
    expect(two.mock.calls).toEqual([["editing"]]);
  });

  it("frees the project when disposed", async () => {
    const locks = fakeLocks();
    const [first, second] = channelPair();
    const holder = lockProject("prj_demo", { locks, channel: first, onChange: () => {} });
    await settle();
    holder.dispose();
    await settle();
    const later = vi.fn();
    lockProject("prj_demo", { locks, channel: second, onChange: later });
    await settle();
    expect(later.mock.calls).toEqual([["editing"]]);
  });

  it("changes a project from elsewhere only while no tab edits it", async () => {
    const locks = fakeLocks();
    const task = vi.fn(async () => {});
    expect(await whileClosed("prj_demo", task, { locks })).toBe(true);
    const [first] = channelPair();
    const editing = lockProject("prj_demo", { locks, channel: first, onChange: () => {} });
    await settle();
    expect(await whileClosed("prj_demo", task, { locks })).toBe(false);
    expect(task).toHaveBeenCalledOnce();
    editing.dispose();
    await settle();
    expect(await whileClosed("prj_demo", task, { locks })).toBe(true);
  });

  it("edits in every tab where the browser has no Web Locks", () => {
    const onChange = vi.fn();
    lockProject("prj_demo", { locks: null, onChange });
    expect(onChange.mock.calls).toEqual([["editing"]]);
  });
});
