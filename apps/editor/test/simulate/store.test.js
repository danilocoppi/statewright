import { check } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { isSimulating, simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

const INIT = { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };
const sim = () => simulationStore.getState();

/** The payments example open in the editor, its lifecycle started in the panel. */
function started({ readOnly = false } = {}) {
  editorStore.getState().open(readExample("payments"), { readOnly });
  sim().open("cnv_lifecycle");
  sim().begin(INIT);
}

afterEach(() => {
  sim().close();
  editorStore.getState().close();
});

describe("the simulation beside the document (simulator spec §6)", () => {
  it("opens on the Start panel, runs, and closes leaving the document as it was", () => {
    editorStore.getState().open(readExample("payments"));
    const doc = editorStore.getState().doc;
    expect(isSimulating()).toBe(false);
    sim().open("cnv_lifecycle");
    expect(isSimulating()).toBe(true);
    expect(sim()).toMatchObject({ mode: "start", canvas: "cnv_lifecycle" });
    sim().begin(INIT);
    sim().take({ event: "evt_verifyStarted" });
    expect(sim().points).toHaveLength(2);
    sim().close();
    expect(isSimulating()).toBe(false);
    expect(editorStore.getState().doc).toBe(doc);
  });

  it("saves the run as a scenario, one undoable change, and stores captions of saved steps in it", () => {
    started();
    sim().take({ event: "evt_verifyStarted" });
    const result = sim().save({ name: "Paused" }, "Save scenario");
    expect(result.ok).toBe(true);
    const id = result.created[0];
    const { doc, history } = editorStore.getState();
    expect(doc.annotations.scenarios[id]).toMatchObject({ name: "Paused", canvas: "cnv_lifecycle" });
    expect(history.past.at(-1).label).toBe("Save scenario");
    expect(sim().script).toMatchObject({ id, following: false });
    sim().caption(1, "The clock stops.", "Write a caption");
    expect(editorStore.getState().doc.annotations.scenarios[id].steps[0].caption).toBe("The clock stops.");
    expect(sim().points[1].caption).toBe("The clock stops.");
  });

  it("keeps a caption with the run until it is saved", () => {
    started();
    sim().take({ event: "evt_verifyStarted" });
    const doc = editorStore.getState().doc;
    expect(sim().caption(1, "The clock stops.", "Write a caption")).toBeNull();
    expect(editorStore.getState().doc).toBe(doc);
    expect(sim().points[1].caption).toBe("The clock stops.");
  });

  it("accepts the new path of a diverged scenario, which Problems then no longer report", () => {
    const changed = structuredClone(readExample("payments"));
    changed.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped";
    editorStore.getState().open(changed);
    sim().followTo("scn_verificationPausesTheClock", 3);
    expect(sim().points[3].status).toBe("diverged");
    expect(sim().preview(3).dropped).toBe(0);
    expect(sim().accept(3, "Accept the new path").ok).toBe(true);
    const problems = check(editorStore.getState().doc).filter(problem => problem.code === "scenario.diverged");
    expect(problems).toEqual([]);
    expect(sim().points[3].status).toBe("same");
  });

  it("holds the document while simulating: only scenarios and automatic placement change it, and undo waits", () => {
    started();
    const doc = editorStore.getState().doc;
    const add = [
      { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } }
    ];
    expect(editorStore.getState().dispatch(add, { label: "Add" })).toMatchObject({
      ok: false,
      error: { code: "SIMULATING" }
    });
    expect(editorStore.getState().doc).toBe(doc);
    const place = [{ type: "layout.node.set", args: { canvas: "cnv_lifecycle", id: "nod_expiryClock", x: 10, y: 10 } }];
    expect(editorStore.getState().dispatch(place, { label: "Place", record: false }).ok).toBe(true);
    sim().take({ event: "evt_verifyStarted" });
    expect(sim().save({ name: "Paused" }, "Save scenario").ok).toBe(true);
    expect(editorStore.getState().undo()).toBe(false);
    sim().close();
    expect(editorStore.getState().undo()).toBe(true);
    expect(editorStore.getState().dispatch(add, { label: "Add" }).ok).toBe(true);
  });

  it("can simulate in a read-only tab, but not save", () => {
    started({ readOnly: true });
    sim().take({ event: "evt_verifyStarted" });
    expect(sim().points).toHaveLength(2);
    expect(sim().save({ name: "Paused" }, "Save scenario")).toMatchObject({ ok: false, error: { code: "READ_ONLY" } });
    expect(sim().script).toBeNull();
  });
});
