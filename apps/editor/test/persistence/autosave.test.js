import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTOSAVE_MS, startAutosave } from "@/persistence/autosave";
import { createEditorStore } from "@/store/editor";

import { demoDoc } from "../fixtures.js";

const rename = name => [{ type: "project.update", args: { set: { name } } }];

/** A store with a demo project, autosaving into a fake repository. */
function setup(save = vi.fn(async doc => ({ doc })), page = undefined) {
  const store = createEditorStore();
  store.getState().open(demoDoc());
  const autosave = startAutosave({ store, repository: { save }, page });
  return { store, save, autosave, state: () => store.getState() };
}

/** A stand-in for the browser window: its events and its document's visibility. */
function fakePage() {
  const document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  return Object.assign(new EventTarget(), { document });
}

/** Whether the page asks before going away (a `beforeunload` that was cancelled). */
function asksBeforeLeaving(page) {
  const event = new Event("beforeunload", { cancelable: true });
  page.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("autosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("saves once, about a second after the last of several quick changes", async () => {
    const { state, save } = setup();
    state().dispatch(rename("A"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS / 2);
    state().dispatch(rename("AB"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS - 1);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].project.name).toBe("AB");
    expect(state().status.dirty).toBe(false);
  });

  it("reports a failed save by its error name and retries with the next change", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("Storage is full", "QuotaExceededError"))
      .mockResolvedValue({});
    const { state, autosave } = setup(save);
    state().dispatch(rename("A"), { label: "Rename" });
    await autosave.flush();
    expect(state().status).toMatchObject({ dirty: true, error: "QuotaExceededError" });
    expect(state().doc.project.name).toBe("A");
    state().dispatch(rename("AB"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    expect(save).toHaveBeenCalledTimes(2);
    expect(state().status).toMatchObject({ dirty: false, error: null });
  });

  it("never saves a read-only tab or an unchanged project", async () => {
    const { state, save, store, autosave } = setup();
    await autosave.flush();
    expect(save).not.toHaveBeenCalled();
    store.getState().setReadOnly(true);
    state().dispatch(rename("A"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    expect(save).not.toHaveBeenCalled();
  });

  it("runs saves one after another, so the newest version is written last", async () => {
    const written = [];
    let release;
    const gate = new Promise(resolve => (release = resolve));
    const save = vi.fn(async doc => {
      if (save.mock.calls.length === 1) await gate;
      written.push(doc.project.name);
    });
    const { state, autosave } = setup(save);
    state().dispatch(rename("old"), { label: "Rename" });
    const first = autosave.flush();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    state().dispatch(rename("new"), { label: "Rename" });
    const second = autosave.flush();
    release();
    await Promise.all([first, second]);
    expect(written).toEqual(["old", "new"]);
  });

  it("stops listening when stopped", async () => {
    const { state, save, autosave } = setup();
    autosave.stop();
    state().dispatch(rename("A"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS * 2);
    expect(save).not.toHaveBeenCalled();
  });

  it.each([
    ["the tab is closed or reloaded", page => page.dispatchEvent(new Event("pagehide"))],
    [
      "the page is hidden",
      page => {
        page.document.visibilityState = "hidden";
        page.document.dispatchEvent(new Event("visibilitychange"));
      }
    ]
  ])("stores a change at once when %s", async (_when, leave) => {
    const page = fakePage();
    const { state, save } = setup(undefined, page);
    state().dispatch(rename("A"), { label: "Rename" });
    leave(page);
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].project.name).toBe("A");
  });

  it("asks before the page goes away while a change is not stored yet", async () => {
    const page = fakePage();
    const { state, autosave } = setup(undefined, page);
    expect(asksBeforeLeaving(page)).toBe(false);
    state().dispatch(rename("A"), { label: "Rename" });
    expect(asksBeforeLeaving(page)).toBe(true);
    await autosave.flush();
    expect(asksBeforeLeaving(page)).toBe(false);
  });

  it("stores a read-only tab's last change when told to, as it hands the project to another tab", async () => {
    const { state, save, autosave } = setup();
    state().dispatch(rename("Last"), { label: "Rename" });
    state().setReadOnly(true);
    await autosave.flush();
    expect(save).not.toHaveBeenCalled();
    await autosave.flush({ force: true });
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].project.name).toBe("Last");
    expect(state().status.dirty).toBe(false);
  });

  it("asks before leaving a read-only tab that still holds a change it could not store", async () => {
    const page = fakePage();
    const full = vi.fn(async () => {
      throw new DOMException("The disk is full", "QuotaExceededError");
    });
    const { state, autosave } = setup(full, page);
    state().dispatch(rename("Mine"), { label: "Rename" });
    await autosave.flush();
    state().setReadOnly(true);
    expect(asksBeforeLeaving(page)).toBe(true);
  });

  it("does not ask for what the editor did by itself (a level arranged as it opens), but still stores it", async () => {
    const page = fakePage();
    const { state, save, autosave } = setup(undefined, page);
    state().dispatch(rename("Arranged"), { record: false });
    expect(asksBeforeLeaving(page)).toBe(false);
    // A person's change after it is asked about, and both are stored.
    state().dispatch(rename("B"), { label: "Rename" });
    expect(asksBeforeLeaving(page)).toBe(true);
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(asksBeforeLeaving(page)).toBe(false);
    state().dispatch(rename("C"), { record: false });
    page.dispatchEvent(new Event("pagehide"));
    await autosave.flush();
    expect(save.mock.calls.at(-1)[0].project.name).toBe("C");
  });
});
