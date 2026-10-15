import { describe, expect, it } from "vitest";

import { createConversationStore, statusOf } from "@/conversation/store";

describe("the conversation with the agent (collaboration spec §4)", () => {
  it("keeps the person's lines until they are sent and read, and the agent's replies", () => {
    const store = createConversationStore();
    const key = store.getState().add({ kind: "person", text: "hi", chips: [], state: "sending" });
    store.getState().update(key, { id: "msg_1", state: "sent" });
    store.getState().add({ kind: "agent", id: "rpl_1", text: "Done", point: ["nod_a"] });
    store.getState().markRead(["msg_1", "msg_9"]);
    expect(store.getState().lines).toEqual([
      { key, kind: "person", text: "hi", chips: [], state: "read", id: "msg_1" },
      { key: key + 1, kind: "agent", id: "rpl_1", text: "Done", point: ["nod_a"] }
    ]);
  });

  it("knows a message read before its own number came back from the bridge", () => {
    const store = createConversationStore();
    const key = store.getState().add({ kind: "person", text: "hi", chips: [], state: "sending" });
    store.getState().markRead(["msg_1"]);
    store.getState().update(key, { id: "msg_1", state: "sent" });
    expect(store.getState().lines[0].state).toBe("read");
  });

  it("says the agent listens while it waits, works for 30 s after a call otherwise, and is away after that", () => {
    const base = { listening: false, channel: false, lastCall: 0 };
    expect(statusOf(base, 100_000)).toBe("away");
    expect(statusOf({ ...base, listening: true, lastCall: 99_000 }, 100_000)).toBe("listening");
    expect(statusOf({ ...base, lastCall: 75_000 }, 100_000)).toBe("working");
    expect(statusOf({ ...base, lastCall: 60_000 }, 100_000)).toBe("away");
    expect(statusOf({ ...base, channel: true, lastCall: 60_000 }, 100_000)).toBe("listening");
  });

  it("forgets everything when cleared, as when the pairing ends", () => {
    const store = createConversationStore();
    store.getState().add({ kind: "person", text: "hi", chips: [], state: "sent" });
    store.getState().setDraft("half");
    store.getState().toggleHistory();
    store.getState().setListening({ listening: true, channel: true });
    store.getState().called(5);
    store.getState().request("review", "Review this.");
    store.getState().clear();
    expect(store.getState()).toMatchObject({
      lines: [],
      draft: "",
      historyOpen: false,
      listening: false,
      channel: false,
      lastCall: 0,
      action: null
    });
  });
});
