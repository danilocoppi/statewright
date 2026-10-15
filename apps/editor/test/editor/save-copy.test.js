// @vitest-environment jsdom
import "../dom.js";

import { afterEach, describe, expect, it, vi } from "vitest";

import { saveProjectToFile } from "@/features/editor/actions";
import { memoryRepository } from "@/persistence/repository";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { readExample } from "../fixtures.js";

/** A file the system picker hands back, keeping what is written to it. */
function fileHandle(name) {
  const handle = {
    name,
    text: null,
    queryPermission: async () => "granted",
    createWritable: async () => ({ write: async text => (handle.text = text), close: async () => {} })
  };
  return handle;
}

const t = (key, values) => `${key} ${JSON.stringify(values)}`;
const toasts = () => useToastStore.getState().items.map(item => item.message);

afterEach(() => {
  delete window.showSaveFilePicker;
  editorStore.getState().close();
  useToastStore.setState({ items: [] });
});

describe("Save a copy", () => {
  it("writes the copy where the person chose and keeps the project on its own file", async () => {
    const repository = memoryRepository();
    const own = fileHandle("get-paid.statewright.json");
    await repository.setHandle("prj_getPaid", own);
    editorStore.getState().open(readExample("get-paid-as-built"));
    const copy = fileHandle("get-paid copy.statewright.json");
    window.showSaveFilePicker = vi.fn(async () => copy);
    await saveProjectToFile(repository, t, { askLocation: true });
    expect(copy.text).toContain('"prj_getPaid"');
    expect(own.text).toBeNull();
    expect(await repository.getHandle("prj_getPaid")).toBe(own);
    expect(toasts()).toEqual(['files:save.copied {"file":"get-paid copy.statewright.json"}']);
  });

  it("takes the copy's file as the project's own when the project has none yet", async () => {
    const repository = memoryRepository();
    editorStore.getState().open(readExample("get-paid-as-built"));
    const first = fileHandle("get-paid.statewright.json");
    window.showSaveFilePicker = vi.fn(async () => first);
    await saveProjectToFile(repository, t, { askLocation: true });
    expect(await repository.getHandle("prj_getPaid")).toBe(first);
    expect(toasts()).toEqual(['files:save.saved {"file":"get-paid.statewright.json"}']);
  });
});
