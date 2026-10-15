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

  it("says the agent works within 5 s of a call, listens while it waits or by the Channel, and is away otherwise", () => {
    const base = { listening: false, channel: false, lastCall: 0 };
    expect(statusOf(base, 10_000)).toBe("away");
    expect(statusOf({ ...base, listening: true }, 10_000)).toBe("listening");
    expect(statusOf({ ...base, channel: true }, 10_000)).toBe("listening");
    expect(statusOf({ ...base, listening: true, lastCall: 6_000 }, 10_000)).toBe("working");
    expect(statusOf({ ...base, lastCall: 4_000 }, 10_000)).toBe("away");
  });

  it("forgets everything when cleared, as when the pairing ends", () => {
    const store = createConversationStore();
    store.getState().add({ kind: "person", text: "hi", chips: [], state: "sent" });
    store.getState().setDraft("half");
    store.getState().toggleHistory();
    store.getState().setListening({ listening: true, channel: true });
    store.getState().called(5);
    store.getState().clear();
    expect(store.getState()).toMatchObject({
      lines: [],
      draft: "",
      historyOpen: false,
      listening: false,
      channel: false,
      lastCall: 0
    });
  });
});
