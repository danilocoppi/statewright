import { ERROR_CODES } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { refusalKey } from "@/editing/refusals";
import { change, editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { addService, demoDoc } from "../fixtures.js";

afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("changes from the canvas", () => {
  it("makes a change as one undoable entry", () => {
    editorStore.getState().open(demoDoc());
    const result = change([addService("nod_db", "DB"), addService("nod_queue", "Queue")], {
      label: "Add",
      at: { x: 0, y: 0 }
    });
    expect(result.ok).toBe(true);
    expect(editorStore.getState().history.past).toHaveLength(1);
    expect(editingStore.getState().refusal).toBeNull();
  });

  it("keeps the document and says why, where the gesture was, when Core refuses", () => {
    editorStore.getState().open(demoDoc());
    const before = editorStore.getState().doc;
    change([{ type: "node.remove", args: { id: "nod_nowhere" } }], { label: "Remove", at: { x: 40, y: 60 } });
    expect(editorStore.getState().doc).toBe(before);
    expect(editingStore.getState().refusal).toMatchObject({
      reason: "NOT_FOUND",
      message: expect.stringContaining("nod_nowhere"),
      at: { x: 40, y: 60 }
    });
  });

  it("says a read-only tab changes nothing", () => {
    editorStore.getState().open(demoDoc(), { readOnly: true });
    change([addService("nod_db", "DB")], { label: "Add", at: { x: 0, y: 0 } });
    expect(editingStore.getState().refusal.reason).toBe("READ_ONLY");
  });

  it("puts the tool down and closes what was open when reset", () => {
    editingStore.getState().setTool("state");
    editingStore.getState().open({ type: "name", id: "nod_api" });
    editingStore.getState().reset();
    expect(editingStore.getState()).toMatchObject({ tool: "select", editor: null, refusal: null });
  });
});

describe("refusals in plain words", () => {
  it("has a sentence for every refusal of the canvas and every Core error code, and one for the rest", () => {
    for (const reason of [
      ...ERROR_CODES,
      "READ_ONLY",
      "intoStart",
      "secondInitial",
      "wrongKind",
      "missingLevel",
      "arrangeFailed"
    ]) {
      expect(refusalKey(reason)).toBe(`refusals.${reason}`);
    }
    expect(refusalKey("SOMETHING_NEW")).toBe("refusals.other");
  });
});
