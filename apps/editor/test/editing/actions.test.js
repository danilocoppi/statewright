import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  alignSelection,
  copySelection,
  distributeSelection,
  regionSelection,
  relayout,
  deleteSelection,
  duplicateSelection,
  lastClip,
  neighbour,
  nudgeSelection,
  paste,
  selectAll
} from "@/editing/actions";
import { boxesOf } from "@/editing/changes";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";
import { handlers } from "@/workers/layout";

import { placedExample } from "../fixtures.js";

const t = key => key;
const state = () => editorStore.getState();
const selection = () => state().view.selections[state().canvasId] ?? [];

beforeEach(async () => editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime" }));
afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("actions on the selection", () => {
  it("selects every box of the level", () => {
    selectAll();
    expect(selection().sort()).toEqual(Object.keys(state().doc.canvases.cnv_runtime.nodes).sort());
  });

  it("deletes what is selected as one undoable change, and clears the selection", () => {
    state().select(["nod_scheduler", "nod_outboxRelay"]);
    deleteSelection(t);
    expect(state().doc.canvases.cnv_runtime.nodes.nod_scheduler).toBeUndefined();
    expect(state().doc.canvases.cnv_runtime.nodes.nod_outboxRelay).toBeUndefined();
    expect(state().history.past.map(entry => entry.label)).toEqual(["editing.delete"]);
    expect(selection()).toEqual([]);
    state().undo();
    expect(state().doc.canvases.cnv_runtime.nodes.nod_scheduler).toBeTruthy();
  });

  it("nudges what is selected, and keeps nudges in a row as one undo entry", () => {
    const before = boxesOf(state().doc, "cnv_runtime").get("nod_scheduler");
    state().select(["nod_scheduler"]);
    nudgeSelection(t, 10, 0);
    nudgeSelection(t, 0, 1);
    expect(boxesOf(state().doc, "cnv_runtime").get("nod_scheduler")).toMatchObject({
      x: before.x + 10,
      y: before.y + 1
    });
    expect(state().history.past).toHaveLength(1);
  });

  it("duplicates what is selected and selects the copies", () => {
    state().select(["nod_scheduler"]);
    duplicateSelection(t);
    const [copy] = selection();
    expect(copy).not.toBe("nod_scheduler");
    expect(state().doc.canvases.cnv_runtime.nodes[copy].name).toBe(
      state().doc.canvases.cnv_runtime.nodes.nod_scheduler.name
    );
  });

  it("pastes a copy where the pointer is, and selects what it pasted", () => {
    state().select(["nod_scheduler"]);
    const clip = copySelection();
    expect(lastClip()).toBe(clip);
    editingStore.getState().point({ x: 900, y: 700 });
    paste(t, clip);
    const [copy] = selection();
    expect(boxesOf(state().doc, "cnv_runtime").get(copy)).toMatchObject({ x: 900, y: 700 });
  });

  it("says where it would have pasted when the copy belongs on another kind of level", () => {
    state().select(["nod_scheduler"]);
    const clip = copySelection();
    state().setCanvas("cnv_lifecycle");
    editingStore.getState().point({ x: 10, y: 20 });
    paste(t, clip);
    expect(editingStore.getState().refusal).toMatchObject({ reason: "wrongKind", at: { x: 10, y: 20 } });
  });

  it("says the paste was not made when a clip that looked whole is not, and changes nothing", () => {
    state().select(["nod_scheduler"]);
    const clip = copySelection();
    const before = state().doc;
    editingStore.getState().point({ x: 10, y: 20 });
    expect(() => paste(t, { ...clip, layout: { ...clip.layout, nodes: {} } })).not.toThrow();
    expect(state().doc).toBe(before);
    expect(editingStore.getState().refusal).toMatchObject({ reason: "other", at: { x: 10, y: 20 } });
  });

  it("changes nothing in a read-only tab", async () => {
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime", readOnly: true });
    state().select(["nod_scheduler"]);
    deleteSelection(t);
    duplicateSelection(t);
    nudgeSelection(t, 1, 0);
    expect(state().history.past).toEqual([]);
  });
});

describe("lining up and regions", () => {
  it("aligns and distributes what is selected, each as one undoable change", () => {
    const ids = ["nod_clients", "nod_commandApi", "nod_scheduler"];
    state().select(ids);
    alignSelection(t, "top");
    const tops = ids.map(id => boxesOf(state().doc, "cnv_runtime").get(id).y);
    expect(new Set(tops).size).toBe(1);
    distributeSelection(t, "horizontal");
    expect(state().history.past.map(entry => entry.label)).toEqual(["editing.align", "editing.distribute"]);
  });

  it("makes the selected states of a machine a region of their own, named for the person", async () => {
    editorStore.getState().open(await placedExample("get-paid-as-built"), { canvasId: "cnv_open" });
    state().select(["nod_underpaid"]);
    regionSelection(key =>
      key === "editing.regionFirst" ? "Main"
      : key === "editing.regionNext" ? "Region 2"
      : key
    );
    const regions = state().doc.canvases.cnv_open.regions;
    expect(Object.values(regions).map(region => region.name)).toEqual(["Main", "Region 2"]);
  });
});

describe("laying a level out again", () => {
  const client = { request: (type, payload) => handlers[type](payload) };

  it("lays the whole level out as one undoable change", async () => {
    state().select(["nod_scheduler"]);
    nudgeSelection(t, 400, 300);
    expect(await relayout(t, client)).toBe(true);
    expect(state().history.past.map(entry => entry.label)).toEqual(["editing.move", "editing.relayout"]);
    const laidOut = boxesOf(state().doc, "cnv_runtime").get("nod_scheduler");
    state().undo();
    expect(boxesOf(state().doc, "cnv_runtime").get("nod_scheduler")).not.toEqual(laidOut);
  });

  it("drops the layout when the level changed while it was being made", async () => {
    const slow = {
      request: async (type, payload) => {
        const commands = await handlers[type](payload);
        state().select(["nod_scheduler"]);
        nudgeSelection(t, 1, 0);
        return commands;
      }
    };
    expect(await relayout(t, slow)).toBe(false);
    expect(state().history.past.map(entry => entry.label)).toEqual(["editing.move"]);
  });

  it("says so where the level is when it cannot be laid out, and changes nothing", async () => {
    const before = state().doc;
    const failing = { request: async () => Promise.reject(new Error("The layout worker could not start.")) };
    expect(await relayout(t, failing)).toBe(false);
    expect(state().doc).toBe(before);
    expect(editingStore.getState().refusal).toMatchObject({
      reason: "arrangeFailed",
      message: "The layout worker could not start."
    });
  });
});

describe("moving between connected boxes", () => {
  it("finds the connected box that lies most in the direction of an arrow", () => {
    const { doc } = state();
    const boxes = boxesOf(doc, "cnv_runtime");
    const linked = Object.values(doc.canvases.cnv_runtime.edges)
      .filter(edge => edge.from === "nod_lifecycleEngine" || edge.to === "nod_lifecycleEngine")
      .map(edge => (edge.from === "nod_lifecycleEngine" ? edge.to : edge.from));
    const right = neighbour(doc, "cnv_runtime", "nod_lifecycleEngine", [1, 0]);
    expect(linked).toContain(right);
    expect(boxes.get(right).x).toBeGreaterThan(boxes.get("nod_lifecycleEngine").x);
    expect(neighbour(doc, "cnv_runtime", "nod_clients", [-1, 0])).toBeNull();
  });
});
