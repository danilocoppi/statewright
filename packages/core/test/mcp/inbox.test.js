import { afterEach, describe, expect, it, vi } from "vitest";

import { createInbox } from "../../src/mcp/inbox.js";

const at = () => new Date("2026-10-15T12:00:00Z");

afterEach(() => vi.useRealTimers());

describe("the pairing's inbox (collaboration spec §3.2)", () => {
  it("numbers messages in order and hands the unread out once", () => {
    const inbox = createInbox({ now: at });
    expect(inbox.add({ text: "first" })).toEqual({ id: "msg_1", at: "2026-10-15T12:00:00.000Z", text: "first" });
    inbox.add({ text: "second", context: { level: { id: "cnv_a" } } });
    expect(inbox.unread().map(message => message.id)).toEqual(["msg_1", "msg_2"]);
    expect(inbox.take().map(message => message.text)).toEqual(["first", "second"]);
    expect(inbox.take()).toEqual([]);
    expect(inbox.unread()).toEqual([]);
  });

  it("answers a wait at once when messages wait, on the next message otherwise, and empty when the time is up", async () => {
    vi.useFakeTimers();
    const inbox = createInbox({ now: at });
    inbox.add({ text: "ready" });
    expect((await inbox.wait(1000)).map(message => message.text)).toEqual(["ready"]);
    const next = inbox.wait(1000);
    inbox.add({ text: "later" });
    expect((await next).map(message => message.text)).toEqual(["later"]);
    const nothing = inbox.wait(1000);
    vi.advanceTimersByTime(1000);
    expect(await nothing).toEqual([]);
  });

  it("gives a message to one waiter only; the other keeps waiting for the next", async () => {
    const inbox = createInbox({ now: at });
    const first = inbox.wait(60000);
    const second = inbox.wait(60000);
    inbox.add({ text: "one" });
    expect((await first).map(message => message.text)).toEqual(["one"]);
    inbox.add({ text: "two" });
    expect((await second).map(message => message.text)).toEqual(["two"]);
  });

  it("ends a wait when its signal aborts, and every wait when it closes", async () => {
    const inbox = createInbox({ now: at });
    const stop = new AbortController();
    const aborted = inbox.wait(60000, stop.signal);
    stop.abort();
    expect(await aborted).toEqual([]);
    const pending = inbox.wait(60000);
    inbox.close();
    expect(await pending).toEqual([]);
    expect(await inbox.wait(60000)).toEqual([]);
  });

  it("is stopping from a stop message until it is taken", () => {
    const inbox = createInbox({ now: at });
    expect(inbox.stopping()).toBe(false);
    inbox.add({ stop: true });
    expect(inbox.stopping()).toBe(true);
    expect(inbox.take()).toEqual([{ id: "msg_1", at: "2026-10-15T12:00:00.000Z", stop: true }]);
    expect(inbox.stopping()).toBe(false);
  });

  it("tells who listens when a message arrives and when messages are read, once each", () => {
    const inbox = createInbox({ now: at });
    const added = [];
    const read = [];
    inbox.onAdd(message => added.push(message.id));
    const stop = inbox.onRead(ids => read.push(ids));
    inbox.add({ text: "a" });
    inbox.add({ text: "b" });
    expect(inbox.markRead("msg_1")).toBe(true);
    expect(inbox.markRead("msg_1")).toBe(true);
    expect(inbox.markRead("msg_9")).toBe(false);
    inbox.take();
    stop();
    inbox.add({ text: "c" });
    inbox.take();
    expect(added).toEqual(["msg_1", "msg_2", "msg_3"]);
    expect(read).toEqual([["msg_1"], ["msg_2"]]);
  });
});
