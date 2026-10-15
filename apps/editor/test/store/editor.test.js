import { describe, expect, it } from "vitest";

import { COALESCE_MS } from "@/store/history";
import { createEditorStore } from "@/store/editor";

import { addService, demoDoc, readExample } from "../fixtures.js";

/** A store with a controllable clock. */
function setup(doc = demoDoc()) {
  const clock = { now: 1000 };
  const store = createEditorStore({ now: () => clock.now });
  store.getState().open(doc);
  return { store, clock, state: () => store.getState() };
}

const rename = name => ({ type: "project.update", args: { set: { name } } });

describe("editor store", () => {
  it("opens a document on its root, or on a given canvas when it exists", () => {
    const { store, state } = setup(readExample("payments"));
    expect(state().canvasId).toBe(state().doc.root);
    store.getState().open(readExample("payments"), { canvasId: "cnv_lifecycle" });
    expect(state().canvasId).toBe("cnv_lifecycle");
    store.getState().open(readExample("payments"), { canvasId: "cnv_missing" });
    expect(state().canvasId).toBe(state().doc.root);
  });

  it("applies a batch, bumps the version, records it and marks the project unsaved", () => {
    const { state } = setup();
    const result = state().dispatch([addService("nod_db", "Database")], { label: "Add service" });
    expect(result).toEqual({ ok: true, created: ["nod_db"] });
    expect(state().doc.canvases.cnv_demo.nodes.nod_db.name).toBe("Database");
    expect(state().version).toBe(1);
    expect(state().history.past.map(entry => entry.label)).toEqual(["Add service"]);
    expect(state().history.past[0].canvasId).toBe("cnv_demo");
    expect(state().status.dirty).toBe(true);
  });

  it("refuses a batch Core rejects and leaves everything unchanged", () => {
    const { state } = setup();
    const before = state().doc;
    const result = state().dispatch([addService("nod_db", "Database"), addService("nod_db", "Again")], {
      label: "Add twice"
    });
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe("ID_TAKEN");
    expect(state().doc).toBe(before);
    expect(state().version).toBe(0);
    expect(state().history.past).toEqual([]);
  });

  it("undoes and redoes back to the exact documents", () => {
    const { state } = setup();
    const original = state().doc;
    state().dispatch([addService("nod_db", "Database")], { label: "Add service" });
    const changed = state().doc;
    expect(state().undo()).toBe(true);
    expect(state().doc).toEqual(original);
    expect(state().redo()).toBe(true);
    expect(state().doc).toEqual(changed);
    expect(state().version).toBe(3);
    expect(state().undo() && state().undo()).toBe(false);
  });

  it("returns to the canvas where the undone change happened", () => {
    const { store, state } = setup(readExample("payments"));
    store.getState().setCanvas("cnv_lifecycle");
    state().dispatch([{ type: "canvas.update", args: { id: "cnv_lifecycle", set: { caption: "Changed" } } }], {
      label: "Change caption"
    });
    store.getState().setCanvas(state().doc.root);
    state().undo();
    expect(state().canvasId).toBe("cnv_lifecycle");
  });

  it("coalesces typing into one entry within the window, until sealed", () => {
    const { state, clock } = setup();
    state().dispatch([rename("D")], { label: "Rename", coalesceKey: "project.name" });
    clock.now += COALESCE_MS - 10;
    state().dispatch([rename("De")], { label: "Rename", coalesceKey: "project.name" });
    expect(state().history.past).toHaveLength(1);
    state().seal();
    state().dispatch([rename("Dem")], { label: "Rename", coalesceKey: "project.name" });
    expect(state().history.past).toHaveLength(2);
    state().undo();
    state().undo();
    expect(state().doc.project.name).toBe("Demo");
  });

  it("keeps a change out of the undo history when asked, as automatic placement does", () => {
    const { state } = setup();
    expect(state().dispatch([addService("nod_db", "DB")], { label: "Place", record: false }).ok).toBe(true);
    expect(state().doc.canvases.cnv_demo.nodes.nod_db).toBeTruthy();
    expect(state().history.past).toEqual([]);
    expect(state()).toMatchObject({ version: 1, status: { dirty: true } });
  });

  it("keeps the selection and the view of each level while the session lasts", () => {
    const { store, state } = setup(readExample("payments"));
    state().select(["nod_api"]);
    state().setViewport("cnv_runtime", { x: 10, y: 20, zoom: 0.5 });
    state().setCanvas("cnv_lifecycle");
    state().select(["nod_created"]);
    expect(state().view).toEqual({
      selections: { cnv_runtime: ["nod_api"], cnv_lifecycle: ["nod_created"] },
      viewports: { cnv_runtime: { x: 10, y: 20, zoom: 0.5 } },
      reveal: null
    });
    store.getState().open(readExample("payments"));
    expect(state().view).toEqual({ selections: {}, viewports: {}, reveal: null });
  });

  it("selects on another level, and asks the canvas to reveal an element until it has", () => {
    const { state } = setup(readExample("payments"));
    state().select(["nod_complianceHold"], "cnv_lifecycle");
    state().reveal("cnv_lifecycle", "nod_complianceHold");
    expect(state().view.selections).toEqual({ cnv_lifecycle: ["nod_complianceHold"] });
    expect(state().view.reveal).toEqual({ canvasId: "cnv_lifecycle", id: "nod_complianceHold" });
    state().reveal("cnv_lifecycle", null);
    expect(state().view.reveal).toBeNull();
  });

  it("refuses changes, undo and redo in a read-only tab", () => {
    const { store, state } = setup();
    state().dispatch([addService("nod_db", "Database")], { label: "Add service" });
    store.getState().setReadOnly(true);
    expect(state().dispatch([rename("X")], { label: "Rename" }).error.code).toBe("READ_ONLY");
    expect(state().undo()).toBe(false);
    expect(state().doc.canvases.cnv_demo.nodes.nod_db).toBeTruthy();
  });

  it("knows whether the saved version is still the current one", () => {
    const { state } = setup();
    state().dispatch([rename("A")], { label: "Rename" });
    state().markSaved(1, 5000);
    expect(state().status).toEqual({ dirty: false, savedAt: 5000, error: null, byHand: false });
    state().dispatch([rename("B")], { label: "Rename" });
    state().markSaved(1, 6000);
    expect(state().status.dirty).toBe(true);
    state().markSaveFailed("Quota exceeded");
    expect(state().status.error).toBe("Quota exceeded");
  });
});
