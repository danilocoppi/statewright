import { describe, expect, it } from "vitest";

import { COALESCE_MS, emptyHistory, HISTORY_LIMIT, record, seal, takeRedo, takeUndo } from "@/store/history";

const entry = (label, extra = {}) => ({
  label,
  canvasId: "cnv_demo",
  commands: [{ type: label }],
  patches: [`${label}+`],
  inversePatches: [`${label}-`],
  origin: "user",
  at: 0,
  ...extra
});

describe("history", () => {
  it("records entries and clears the redo stack on a new change", () => {
    let history = record(emptyHistory(), entry("a"));
    history = record(history, entry("b"));
    const undone = takeUndo(history);
    expect(undone.entry.label).toBe("b");
    expect(undone.history.future.map(item => item.label)).toEqual(["b"]);
    const after = record(undone.history, entry("c"));
    expect(after.past.map(item => item.label)).toEqual(["a", "c"]);
    expect(after.future).toEqual([]);
  });

  it("merges changes with the same key within the window, keeping the inverse patches in undo order", () => {
    let history = record(emptyHistory(), entry("type", { coalesceKey: "nod_api.name", at: 0 }));
    history = record(history, { ...entry("type2", { coalesceKey: "nod_api.name", at: COALESCE_MS - 1 }) });
    expect(history.past).toHaveLength(1);
    expect(history.past[0].patches).toEqual(["type+", "type2+"]);
    expect(history.past[0].inversePatches).toEqual(["type2-", "type-"]);
    expect(history.past[0].at).toBe(COALESCE_MS - 1);
  });

  it("starts a new entry when the window passed, the key differs or the entry was sealed", () => {
    const first = record(emptyHistory(), entry("a", { coalesceKey: "k", at: 0 }));
    expect(record(first, entry("b", { coalesceKey: "k", at: COALESCE_MS })).past).toHaveLength(2);
    expect(record(first, entry("b", { coalesceKey: "other", at: 1 })).past).toHaveLength(2);
    expect(record(seal(first), entry("b", { coalesceKey: "k", at: 1 })).past).toHaveLength(2);
  });

  it("keeps at most HISTORY_LIMIT entries", () => {
    let history = emptyHistory();
    for (let index = 0; index < HISTORY_LIMIT + 5; index++) history = record(history, entry(`e${index}`));
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0].label).toBe("e5");
  });

  it("redoes what was undone, in order", () => {
    let history = record(record(emptyHistory(), entry("a")), entry("b"));
    history = takeUndo(takeUndo(history).history).history;
    const redone = takeRedo(history);
    expect(redone.entry.label).toBe("a");
    expect(takeRedo(redone.history).entry.label).toBe("b");
    expect(takeUndo(emptyHistory())).toBeNull();
    expect(takeRedo(emptyHistory())).toBeNull();
  });
});
