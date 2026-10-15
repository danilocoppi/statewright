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

describe("M5 review in the Editor", () => {
  it("offers / on a mixed level: every kind's tools, flow steps and the parts that fit, without breaking", async () => {
    const { insertables } = await import("@/editing/insertables");
    const withPart = applyBatch(doc, [
      { type: "definition.create", args: { id: "def_part", kind: "machine", name: "Part" } }
    ]).doc;
    const ids = insertables(withPart, doc.root, key => key).map(item => item.id);
    expect(ids).toEqual(expect.arrayContaining(["tool:state", "tool:service", "tool:if", "step:start"]));
  });

  it("drafts a box of the source's own kind when a connection is dragged to empty space", async () => {
    const { naturalTool } = await import("@/editing/connect");
    const nodes = doc.canvases[doc.root].nodes;
    expect(naturalTool("mixed", nodes.nod_call)).toBe("action");
    expect(naturalTool("mixed", nodes.nod_web)).toBe("service");
    expect(naturalTool("mixed", nodes.nod_open)).toBe("state");
  });

  it("unsets a case's value when a mixed level's branch becomes the default", async () => {
    const { kindCommands } = await import("@/editing/triggers");
    const flowDoc = applyBatch(doc, [
      { type: "node.add", args: { canvas: doc.root, id: "nod_switch", node: { kind: "switch" } } },
      {
        type: "edge.add",
        args: { canvas: doc.root, id: "edg_case", edge: { from: "nod_switch", to: "nod_end", kind: "case", case: "a" } }
      }
    ]).doc;
    expect(kindCommands(flowDoc, "edg_case", "default")[0].args.unset).toEqual(["case"]);
  });
});

describe("regions on a mixed level", () => {
  it("are made from the machine's nodes selected, the steps and boxes left out", async () => {
    const { regionCommands } = await import("@/editing/changes");
    const { commands } = regionCommands(doc, doc.root, ["nod_open", "nod_call"], {
      first: "Region 1",
      next: "Region 2"
    });
    const after = applyBatch(doc, commands).doc;
    const nodes = after.canvases[doc.root].nodes;
    expect(nodes.nod_open.region).toBeDefined();
    expect(nodes.nod_call.region).toBeUndefined();
  });
});
