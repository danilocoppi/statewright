import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { addNote, boxesOf } from "@/editing/changes";
import { clipFrom, clipText, copyOf, duplicateCommands, pasteCommands } from "@/editing/clipboard";
import { newProject } from "@/files/new-project";

import { demoDoc, placedExample } from "../fixtures.js";

const run = (doc, commands) => applyBatch(doc, commands).doc;
const machineProject = () =>
  newProject({ name: "Target", kind: "machine", names: { state: "Open", end: "Done" } }, new Set());

describe("copy and paste", () => {
  it("pastes boxes with the edges between them, with new IDs, their top-left corner where the person points", async () => {
    const doc = await placedExample("payments");
    const clip = copyOf(doc, "cnv_runtime", ["nod_commandApi", "nod_lifecycleEngine", "nod_scheduler"]);
    const inside = Object.values(clip.edges);
    expect(inside.length).toBeGreaterThan(0);
    expect(inside.every(edge => clip.nodes[edge.from] && clip.nodes[edge.to])).toBe(true);
    const { commands, ids } = pasteCommands(doc, "cnv_runtime", clip, { at: { x: 2000, y: 1000 } });
    const after = run(doc, commands);
    expect(ids).toHaveLength(3);
    expect(ids.every(id => !doc.canvases.cnv_runtime.nodes[id] && after.canvases.cnv_runtime.nodes[id])).toBe(true);
    const boxes = boxesOf(after, "cnv_runtime");
    expect(Math.min(...ids.map(id => boxes.get(id).x))).toBe(2000);
    expect(Math.min(...ids.map(id => boxes.get(id).y))).toBe(1000);
    const pastedEdges = Object.values(after.canvases.cnv_runtime.edges).filter(edge => ids.includes(edge.from));
    expect(pastedEdges).toHaveLength(inside.length);
    expect(pastedEdges.every(edge => ids.includes(edge.to))).toBe(true);
  });

  it("copies a box's own interior, at any depth, as new levels", () => {
    let doc = demoDoc();
    doc = run(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_demo", id: "nod_api", x: 0, y: 0 } },
      { type: "canvas.create", args: { kind: "machine", name: "API states", owner: "nod_api", id: "cnv_apiStates" } },
      {
        type: "node.add",
        args: { canvas: "cnv_apiStates", id: "nod_up", node: { kind: "state", name: "Up" }, at: { x: 0, y: 0 } }
      },
      { type: "canvas.create", args: { kind: "machine", name: "Up states", owner: "nod_up", id: "cnv_upStates" } },
      {
        type: "node.add",
        args: { canvas: "cnv_upStates", id: "nod_warm", node: { kind: "state", name: "Warm" }, at: { x: 0, y: 0 } }
      }
    ]);
    const clip = copyOf(doc, "cnv_demo", ["nod_api"]);
    expect(Object.keys(clip.canvases).sort()).toEqual(["cnv_apiStates", "cnv_upStates"]);
    const { commands, ids } = pasteCommands(doc, "cnv_demo", clip, { offset: [0, 200] });
    const after = run(doc, commands);
    const outer = after.canvases[after.canvases.cnv_demo.nodes[ids[0]].inner.canvas];
    expect(outer.name).toBe("API states");
    const [upId, up] = Object.entries(outer.nodes)[0];
    expect(upId).not.toBe("nod_up");
    expect(Object.values(after.canvases[up.inner.canvas].nodes)).toEqual([{ kind: "state", name: "Warm" }]);
    expect(after.layout.canvases[up.inner.canvas].nodes).toBeTruthy();
  });

  it("keeps instances of the project's definitions, and leaves them behind in a project without them", async () => {
    const doc = await placedExample("payments");
    const clip = copyOf(doc, "cnv_runtime", ["nod_lifecycleEngine"]);
    expect(Object.keys(clip.canvases)).toEqual(["cnv_lifecycle"]);
    const same = run(doc, pasteCommands(doc, "cnv_runtime", clip, { offset: [0, 400] }).commands);
    const instances = canvas => Object.values(canvas.nodes).filter(node => node.inner?.definition);
    const pasted = Object.values(same.canvases).filter(canvas => canvas.name === doc.canvases.cnv_lifecycle.name);
    expect(pasted.map(canvas => instances(canvas).length)).toEqual([3, 3]);
    const system = newProject({ name: "Other", kind: "system", names: { state: "S", end: "E" } }, new Set());
    const other = run(system, pasteCommands(system, system.root, clip, { at: { x: 0, y: 0 } }).commands);
    const copied = Object.values(other.canvases).find(canvas => canvas.kind === "machine");
    expect(instances(copied)).toEqual([]);
    expect(Object.keys(copied.nodes)).toHaveLength(6);
  });

  it("pastes into another project, adding the catalog items it lacks with their IDs", async () => {
    const source = await placedExample("payments");
    const states = Object.keys(source.canvases.cnv_complianceHold.nodes);
    const clip = copyOf(source, "cnv_complianceHold", states);
    const target = machineProject();
    const { commands } = pasteCommands(target, target.root, clip, { at: { x: 0, y: 300 } });
    const after = run(target, commands);
    const used = Object.values(after.canvases[target.root].edges).flatMap(edge => edge.on ?? []);
    expect(used.length).toBeGreaterThan(0);
    expect(used.every(id => after.catalog.events[id]?.name === source.catalog.events[id].name)).toBe(true);
  });

  it("reuses the catalog items the target project already has", async () => {
    const doc = await placedExample("payments");
    const clip = copyOf(doc, "cnv_complianceHold", Object.keys(doc.canvases.cnv_complianceHold.nodes));
    const { commands } = pasteCommands(doc, "cnv_complianceHold", clip, { offset: [0, 600] });
    expect(commands.some(command => command.type === "catalog.add")).toBe(false);
    expect(() => run(doc, commands)).not.toThrow();
  });

  it("keeps a copied note on the copied box it is attached to", () => {
    let doc = demoDoc();
    doc = run(doc, [{ type: "layout.node.set", args: { canvas: "cnv_demo", id: "nod_api", x: 0, y: 0 } }]);
    const note = addNote(doc, "cnv_demo", "Rate limited", { x: 0, y: 120 });
    doc = run(doc, [...note.commands, { type: "note.update", args: { id: note.id, set: { target: "nod_api" } } }]);
    const { commands, ids } = pasteCommands(doc, "cnv_demo", copyOf(doc, "cnv_demo", ["nod_api", note.id]), {
      offset: [300, 0]
    });
    const after = run(doc, commands);
    expect(after.annotations.notes[ids[1]]).toEqual({ canvas: "cnv_demo", text: "Rate limited", target: ids[0] });
  });

  it("refuses to paste boxes on a level of another kind", async () => {
    const doc = await placedExample("payments");
    const clip = copyOf(doc, "cnv_runtime", ["nod_commandApi"]);
    expect(pasteCommands(doc, "cnv_lifecycle", clip, { offset: [0, 0] })).toEqual({ refusal: "wrongKind" });
    expect(copyOf(doc, "cnv_runtime", [])).toBeNull();
  });

  it("leaves behind a second initial node for a region, and refuses when nothing else is left", () => {
    const fresh = machineProject();
    const doc = run(
      fresh,
      Object.keys(fresh.canvases[fresh.root].nodes).map((id, index) => ({
        type: "layout.node.set",
        args: { canvas: fresh.root, id, x: index * 200, y: 0 }
      }))
    );
    const nodes = Object.entries(doc.canvases[doc.root].nodes);
    const initial = nodes.find(([, node]) => node.kind === "initial")[0];
    const state = nodes.find(([, node]) => node.kind === "state")[0];
    const { commands, ids } = duplicateCommands(doc, doc.root, [initial, state]);
    const after = run(doc, commands);
    const initials = Object.values(after.canvases[doc.root].nodes).filter(node => node.kind === "initial");
    expect(initials).toHaveLength(1);
    expect(ids.map(id => after.canvases[doc.root].nodes[id].kind)).toEqual(["state"]);
    expect(duplicateCommands(doc, doc.root, [initial])).toEqual({ refusal: "secondInitial" });
  });

  it("leaves behind a link to a level the target project does not have, and refuses when nothing else is left", async () => {
    const source = run(await placedExample("payments"), [
      {
        type: "node.add",
        args: {
          canvas: "cnv_runtime",
          id: "nod_toLifecycle",
          node: { kind: "ref", target: "cnv_lifecycle" },
          at: { x: 0, y: 900 }
        }
      }
    ]);
    const target = newProject({ name: "Other", kind: "system", names: { state: "Open", end: "Done" } }, new Set());
    const clip = copyOf(source, "cnv_runtime", ["nod_toLifecycle", "nod_scheduler"]);
    const { commands, ids } = pasteCommands(target, target.root, clip, { at: { x: 0, y: 300 } });
    const after = run(target, commands);
    expect(ids.map(id => after.canvases[target.root].nodes[id].name)).toEqual(["Scheduler"]);
    const alone = copyOf(source, "cnv_runtime", ["nod_toLifecycle"]);
    expect(pasteCommands(target, target.root, alone, { at: { x: 0, y: 300 } })).toEqual({ refusal: "missingLevel" });
  });

  it("duplicates a little below and to the right, on the same level", async () => {
    const doc = await placedExample("payments");
    const { commands, ids } = duplicateCommands(doc, "cnv_runtime", ["nod_scheduler"]);
    const after = run(doc, commands);
    const [before, copy] = [
      boxesOf(doc, "cnv_runtime").get("nod_scheduler"),
      boxesOf(after, "cnv_runtime").get(ids[0])
    ];
    expect([copy.x - before.x, copy.y - before.y]).toEqual([24, 24]);
  });

  it("travels as text, and reads only Statewright elements back", async () => {
    const doc = await placedExample("payments");
    const clip = copyOf(doc, "cnv_runtime", ["nod_scheduler"]);
    expect(clipFrom(clipText(clip))).toEqual(clip);
    expect(clipFrom("plain words")).toBeNull();
    expect(clipFrom('{"nodes":{}}')).toBeNull();
    // Clipboard text is anyone's: a clip must have every part, of the right shape.
    expect(clipFrom('{"format":"statewright/clip","kind":"system"}')).toBeNull();
    expect(clipFrom(clipText({ ...clip, kind: "page" }))).toBeNull();
    expect(clipFrom(clipText({ ...clip, layout: { nodes: {} } }))).toBeNull();
    expect(clipFrom(clipText({ ...clip, catalog: [] }))).toBeNull();
  });
});
