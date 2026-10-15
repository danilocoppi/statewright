import { applyBatch, buildIndex } from "statewright";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { connectBoxes, mixLevel } from "@/editing/actions";
import { connectRefusal, edgeFor, startRefusal } from "@/editing/connect";
import { editingStore } from "@/editing/state";
import { toolForKey, toolsFor } from "@/editing/tools";
import { newProject } from "@/files/new-project";
import { fieldsOfKind } from "@/inspector/fields";
import { editorStore } from "@/store/editor";

const t = key => key;
const state = () => editorStore.getState();

/** A new mixed project with a state, a done state, a call, an end, a service and a store. */
function floor() {
  const base = newProject({ name: "Floor", kind: "mixed", names: {} }, new Set());
  return applyBatch(base, [
    {
      type: "catalog.add",
      args: { collection: "endpoints", id: "ept_pay", item: { name: "Pay", method: "POST", path: "/pay" } }
    },
    { type: "node.add", args: { canvas: base.root, id: "nod_open", node: { kind: "state", name: "open" } } },
    {
      type: "node.add",
      args: { canvas: base.root, id: "nod_done", node: { kind: "state", name: "done", terminal: true } }
    },
    { type: "node.add", args: { canvas: base.root, id: "nod_call", node: { kind: "call", endpoint: "ept_pay" } } },
    { type: "node.add", args: { canvas: base.root, id: "nod_end", node: { kind: "end" } } },
    { type: "node.add", args: { canvas: base.root, id: "nod_web", node: { kind: "service", name: "Web" } } },
    { type: "node.add", args: { canvas: base.root, id: "nod_db", node: { kind: "store", name: "Orders" } } }
  ]).doc;
}

let doc;
beforeEach(() => {
  doc = floor();
  editorStore.getState().open(doc, { canvasId: doc.root });
});
afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("a mixed level in the Editor (mixed levels spec §6)", () => {
  it("offers each kind's tools on its tab, the letters following the tab", () => {
    const ids = tab => toolsFor("mixed", tab).map(tool => tool.id);
    expect(ids("machine")).toEqual(expect.arrayContaining(["state", "initial", "participantActor", "steps"]));
    expect(ids("flow")).toEqual(expect.arrayContaining(["action", "if", "stateGuest"]));
    expect(ids("system")).toEqual(expect.arrayContaining(["service", "store"]));
    expect(toolForKey("mixed", "s", "machine").id).toBe("state");
    expect(toolForKey("mixed", "s", "system").id).toBe("service");
  });

  it("connects by meaning: state to state a transition, step to step a flow's edge, box to box a connection", () => {
    expect(edgeFor(doc, doc.root, "nod_open", "nod_done")).toEqual({
      from: "nod_open",
      to: "nod_done",
      kind: "transition"
    });
    expect(edgeFor(doc, doc.root, "nod_call", "nod_end")).toEqual({ from: "nod_call", to: "nod_end" });
    expect(edgeFor(doc, doc.root, "nod_web", "nod_db")).toEqual({ from: "nod_web", to: "nod_db" });
    connectBoxes(t, "nod_open", "nod_done", { x: 0, y: 0 });
    expect(Object.values(state().doc.canvases[doc.root].edges)).toEqual([
      { from: "nod_open", to: "nod_done", kind: "transition" }
    ]);
    expect(editingStore.getState().editor).toMatchObject({ type: "trigger" });
  });

  it("refuses ends that mean nothing together, saying why", () => {
    expect(connectRefusal(doc, doc.root, "nod_open", "nod_call")).toBe("mixedEnds");
    expect(connectRefusal(doc, doc.root, "nod_web", "nod_open")).toBe("mixedEnds");
    expect(startRefusal(doc, doc.root, "nod_done")).toBe("fromTerminal");
  });

  it("shows each element the fields of its own kind", () => {
    const keys = (kind, value) => fieldsOfKind("node", { canvasKind: "mixed", kind, value }).map(field => field.key);
    expect(keys("state", { kind: "state", name: "open" })).toContain("outcome");
    expect(keys("call", { kind: "call" })).toContain("endpoint");
    expect(keys("service", { kind: "service" })).toContain("party");
    expect(keys("state", { kind: "state", target: "nod_x" })).toContain("target");
  });

  it("changes a typed level to mixed in one undoable change", () => {
    const machine = newProject({ name: "Order", kind: "machine", names: { state: "open" } }, new Set());
    editorStore.getState().open(machine, { canvasId: machine.root });
    mixLevel(t);
    expect(state().doc.canvases[machine.root].kind).toBe("mixed");
    expect(Object.values(state().doc.canvases[machine.root].edges)[0].kind).toBe("transition");
    state().undo();
    expect(state().doc.canvases[machine.root].kind).toBe("machine");
    expect(buildIndex(state().doc).get(machine.root)).toBeTruthy();
  });
});

describe("a new box dragged out of a mixed level's box", () => {
  it("has a natural kind there too: a state, a tool the level has", async () => {
    const { naturalTool } = await import("@/editing/connect");
    const { toolById } = await import("@/editing/tools");
    expect(toolById("mixed", naturalTool("mixed"))?.id).toBe("state");
  });
});
