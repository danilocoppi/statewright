import { applyBatch, figureOf } from "statewright";
import { describe, expect, it } from "vitest";

import { NOTE_SIZE, ghostSize, placeCommands } from "@/editing/place";
import { toolsFor } from "@/editing/tools";
import { newProject } from "@/files/new-project";

import { placedExample } from "../fixtures.js";

const tool = (kind, id) => toolsFor(kind).find(item => item.id === id);
const run = (doc, commands) => applyBatch(doc, commands).doc;
const project = kind => newProject({ name: "Place", kind, names: { state: "Open", end: "Done" } }, new Set());

describe("placing a tool's element", () => {
  it("sizes the landing ghost as Core sizes the box, the smallest box when a choice comes first, a note's size", () => {
    const doc = project("machine");
    expect(ghostSize(doc, doc.root, tool("machine", "state"), "New state")).toEqual(
      expect.objectContaining({ w: expect.any(Number), h: expect.any(Number) })
    );
    expect(ghostSize(doc, doc.root, tool("machine", "link"))).toEqual({ w: 140, h: 48 });
    expect(ghostSize(doc, doc.root, tool("machine", "note"))).toEqual(NOTE_SIZE);
  });

  it("sizes the ghost of a state on a machine with regions, where every node names its region", async () => {
    const doc = await placedExample("payments");
    const size = ghostSize(doc, "cnv_lifecycle", tool("machine", "state"), "New state");
    expect(size.w).toBeGreaterThan(0);
    expect(size.h).toBeGreaterThan(0);
  });

  it("adds a named state centred on the point", () => {
    const doc = project("machine");
    const { id, commands } = placeCommands(
      doc,
      doc.root,
      tool("machine", "state"),
      { x: 500, y: 300 },
      { name: "Paid" }
    );
    const after = run(doc, commands);
    const part = figureOf(after, doc.root).nodes.find(item => item.id === id);
    expect(after.canvases[doc.root].nodes[id]).toEqual({ kind: "state", name: "Paid" });
    expect([part.x + part.w / 2, part.y + part.h / 2].map(Math.round)).toEqual([500, 300]);
  });

  it("adds a flow step with a new action, the action first, in one change", () => {
    const doc = project("flow");
    const { id, commands } = placeCommands(
      doc,
      doc.root,
      tool("flow", "action"),
      { x: 0, y: 200 },
      {
        action: { name: "Charge the card" }
      }
    );
    expect(commands[0]).toMatchObject({ type: "catalog.add", args: { collection: "actions" } });
    const after = run(doc, commands);
    expect(after.catalog.actions[after.canvases[doc.root].nodes[id].action]).toEqual({ name: "Charge the card" });
  });

  it("adds a link to a level, and a note", async () => {
    const doc = await placedExample("payments");
    const link = placeCommands(
      doc,
      "cnv_runtime",
      tool("system", "link"),
      { x: 0, y: 600 },
      { target: "cnv_lifecycle" }
    );
    expect(run(doc, link.commands).canvases.cnv_runtime.nodes[link.id]).toEqual({
      kind: "ref",
      target: "cnv_lifecycle"
    });
    const note = placeCommands(doc, "cnv_runtime", tool("system", "note"), { x: 100, y: 600 }, { text: "Why?" });
    expect(run(doc, note.commands).annotations.notes[note.id]).toEqual({ canvas: "cnv_runtime", text: "Why?" });
  });

  it("refuses a second initial node in a region", () => {
    const doc = project("machine");
    expect(placeCommands(doc, doc.root, tool("machine", "initial"), { x: 0, y: 0 })).toEqual({
      refusal: "secondInitial"
    });
  });

  it("connects a box made from a dragged connection to the box it came from, in that box's region", async () => {
    const doc = await placedExample("payments");
    const from = Object.keys(doc.canvases.cnv_lifecycle.nodes).find(
      id =>
        doc.canvases.cnv_lifecycle.nodes[id].region === "rgn_expiry" &&
        doc.canvases.cnv_lifecycle.nodes[id].kind === "state"
    );
    const { id, edgeId, commands } = placeCommands(
      doc,
      "cnv_lifecycle",
      tool("machine", "state"),
      { x: 900, y: 0 },
      {
        name: "Paused",
        from
      }
    );
    const after = run(doc, commands);
    expect(after.canvases.cnv_lifecycle.nodes[id].region).toBe("rgn_expiry");
    expect(after.canvases.cnv_lifecycle.edges[edgeId]).toEqual({ from, to: id });
  });
});
