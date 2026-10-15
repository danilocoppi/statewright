import { applyBatch, figureOf } from "statewright";
import { describe, expect, it } from "vitest";

import {
  addNode,
  addNote,
  alignCommands,
  boxesOf,
  distributeCommands,
  moveCommands,
  regionAt,
  nudgeCommands,
  regionCommands,
  removeCommands,
  renameCommands,
  sizeOf
} from "@/editing/changes";
import { idsFor } from "@/editing/ids";
import { newProject } from "@/files/new-project";

import { demoDoc, placedExample } from "../fixtures.js";

const run = (doc, commands) => applyBatch(doc, commands).doc;

describe("adding", () => {
  it("adds a node centred where the person clicks, with a new ID", () => {
    const doc = demoDoc();
    const { id, commands } = addNode(doc, "cnv_demo", { kind: "service", name: "Billing" }, { x: 300, y: 200 });
    expect(id).toBe("nod_billing");
    const after = run(doc, commands);
    const { w, h } = sizeOf(doc, "cnv_demo", { kind: "service", name: "Billing" });
    expect(after.layout.canvases.cnv_demo.nodes.nod_billing).toEqual({
      x: Math.round(300 - w / 2),
      y: Math.round(200 - h / 2)
    });
    expect(boxesOf(after, "cnv_demo").get("nod_billing")).toMatchObject({ w, h });
  });

  it("never gives two new elements of one change the same ID", () => {
    const doc = demoDoc();
    const ids = idsFor(doc);
    const first = addNode(doc, "cnv_demo", { kind: "service", name: "API" }, { x: 0, y: 0 }, ids);
    const second = addNode(doc, "cnv_demo", { kind: "service", name: "API" }, { x: 200, y: 0 }, ids);
    expect([first.id, second.id]).toEqual(["nod_api2", "nod_api3"]);
    expect(Object.keys(run(doc, [...first.commands, ...second.commands]).canvases.cnv_demo.nodes)).toHaveLength(3);
  });

  it("puts a new state in the region it is dropped in", async () => {
    const doc = await placedExample("payments");
    const expiry = figureOf(doc, "cnv_lifecycle").regions.find(part => part.id === "rgn_expiry");
    const point = { x: expiry.x + expiry.w / 2, y: expiry.y + expiry.h / 2 };
    const { id, commands } = addNode(doc, "cnv_lifecycle", { kind: "state", name: "Paused" }, point);
    expect(run(doc, commands).canvases.cnv_lifecycle.nodes[id].region).toBe("rgn_expiry");
  });

  it("adds a floating note at a point", () => {
    const doc = demoDoc();
    const { id, commands } = addNote(doc, "cnv_demo", "Ask ops", { x: 40.4, y: 80.6 });
    const after = run(doc, commands);
    expect(after.annotations.notes[id]).toEqual({ canvas: "cnv_demo", text: "Ask ops" });
    expect(after.layout.canvases.cnv_demo.notes[id]).toEqual({ x: 40, y: 81 });
  });
});

describe("moving", () => {
  it("moves a box, keeping its stored size and display, and forgets the routes of the edges it touches", async () => {
    const doc = await placedExample("get-paid-as-built");
    const stored = doc.layout.canvases.cnv_transaction;
    const touching = Object.entries(doc.canvases.cnv_transaction.edges)
      .filter(([, edge]) => edge.from === "nod_open" || edge.to === "nod_open")
      .map(([id]) => id);
    const after = run(doc, moveCommands(doc, "cnv_transaction", [["nod_open", { x: 40, y: 500 }]]));
    expect(after.layout.canvases.cnv_transaction.nodes.nod_open).toEqual({ ...stored.nodes.nod_open, x: 40, y: 500 });
    for (const edgeId of touching) expect(after.layout.canvases.cnv_transaction.edges?.[edgeId]).toBeUndefined();
  });

  it("moves an edge's route with its two ends when they move together", async () => {
    const doc = await placedExample("payments");
    const [edgeId, edge] = Object.entries(doc.canvases.cnv_runtime.edges).find(
      ([id]) => doc.layout.canvases.cnv_runtime.edges?.[id]?.points
    );
    const nodes = doc.layout.canvases.cnv_runtime.nodes;
    const moves = [edge.from, edge.to].map(id => [id, { x: nodes[id].x + 30, y: nodes[id].y - 10 }]);
    const after = run(doc, moveCommands(doc, "cnv_runtime", moves));
    const before = doc.layout.canvases.cnv_runtime.edges[edgeId].points;
    expect(after.layout.canvases.cnv_runtime.edges[edgeId].points).toEqual(before.map(([x, y]) => [x + 30, y - 10]));
  });

  it("nudges boxes and notes by an offset", () => {
    let doc = demoDoc();
    doc = run(doc, [{ type: "layout.node.set", args: { canvas: "cnv_demo", id: "nod_api", x: 0, y: 0 } }]);
    const note = addNote(doc, "cnv_demo", "Why?", { x: 300, y: 0 });
    doc = run(doc, note.commands);
    const after = run(doc, nudgeCommands(doc, "cnv_demo", ["nod_api", note.id], 10, -1));
    expect(after.layout.canvases.cnv_demo.nodes.nod_api).toEqual({ x: 10, y: -1 });
    expect(after.layout.canvases.cnv_demo.notes[note.id]).toEqual({ x: 310, y: -1 });
  });
});

describe("removing and renaming", () => {
  it("removes boxes with their edges, edges on their own, and notes, in one change", async () => {
    const doc = await placedExample("payments");
    const edges = doc.canvases.cnv_runtime.edges;
    const lone = Object.keys(edges).find(id => edges[id].from !== "nod_clients" && edges[id].to !== "nod_clients");
    const commands = removeCommands(doc, ["nod_clients", lone]);
    expect(commands.map(command => command.type)).toEqual(["edge.remove", "node.remove"]);
    const after = run(doc, commands);
    expect(after.canvases.cnv_runtime.nodes.nod_clients).toBeUndefined();
    expect(Object.values(after.canvases.cnv_runtime.edges).some(edge => edge.from === "nod_clients")).toBe(false);
    expect(after.canvases.cnv_runtime.edges[lone]).toBeUndefined();
  });

  it("renames a box, keeps a state's name when the new one is empty, and changes a note's text", () => {
    let doc = demoDoc();
    expect(renameCommands(doc, "nod_api", "  Public API ")).toEqual([
      { type: "node.update", args: { id: "nod_api", set: { name: "Public API" } } }
    ]);
    expect(renameCommands(doc, "nod_api", "API")).toEqual([]);
    expect(renameCommands(doc, "nod_api", "")).toEqual([
      { type: "node.update", args: { id: "nod_api", unset: ["name"] } }
    ]);
    const note = addNote(doc, "cnv_demo", "Old", { x: 0, y: 0 });
    doc = run(doc, note.commands);
    expect(renameCommands(doc, note.id, "New")).toEqual([
      { type: "note.update", args: { id: note.id, set: { text: "New" } } }
    ]);
    expect(renameCommands(doc, note.id, " ")).toEqual([]);
  });

  it("keeps a state's name when the new one is empty", async () => {
    const doc = await placedExample("get-paid-as-built");
    expect(renameCommands(doc, "nod_cancelled", "")).toEqual([]);
  });
});

describe("aligning and distributing", () => {
  /** Three services at the given points (top-left). */
  function three(points) {
    let doc = demoDoc();
    const ids = ["nod_api", "nod_b", "nod_c"];
    doc = run(doc, [
      {
        type: "node.add",
        args: { canvas: "cnv_demo", id: "nod_b", node: { kind: "service", name: "Billing service" } }
      },
      { type: "node.add", args: { canvas: "cnv_demo", id: "nod_c", node: { kind: "service", name: "C" } } },
      ...ids.map((id, index) => ({ type: "layout.node.set", args: { canvas: "cnv_demo", id, ...points[index] } }))
    ]);
    return { doc, ids };
  }

  it("lines boxes up on the left, centre, right, top, middle or bottom of the space they take", () => {
    const { doc, ids } = three([
      { x: 0, y: 0 },
      { x: 300, y: 120 },
      { x: 90, y: 400 }
    ]);
    const boxes = boxesOf(doc, "cnv_demo");
    const after = how => boxesOf(run(doc, alignCommands(doc, "cnv_demo", ids, how)), "cnv_demo");
    expect(ids.map(id => after("left").get(id).x)).toEqual([0, 0, 0]);
    const right = Math.max(...ids.map(id => boxes.get(id).x + boxes.get(id).w));
    expect(ids.map(id => after("right").get(id)).map(box => box.x + box.w)).toEqual([right, right, right]);
    const bottom = Math.max(...ids.map(id => boxes.get(id).y + boxes.get(id).h));
    expect(ids.map(id => after("bottom").get(id)).map(box => box.y + box.h)).toEqual([bottom, bottom, bottom]);
    const centres = ids.map(id => after("centre").get(id)).map(box => box.x + box.w / 2);
    expect(Math.max(...centres) - Math.min(...centres)).toBeLessThanOrEqual(1);
    expect(alignCommands(doc, "cnv_demo", ["nod_api"], "left")).toEqual([]);
  });

  it("spaces three or more boxes evenly between the first and the last", () => {
    const { doc, ids } = three([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 600, y: 0 }
    ]);
    const after = boxesOf(run(doc, distributeCommands(doc, "cnv_demo", ids, "horizontal")), "cnv_demo");
    const [a, b, c] = ids.map(id => after.get(id));
    expect(Math.abs(b.x - (a.x + a.w) - (c.x - (b.x + b.w)))).toBeLessThanOrEqual(1);
    expect([a.x, c.x]).toEqual([0, 600]);
    expect(distributeCommands(doc, "cnv_demo", ids.slice(0, 2), "horizontal")).toEqual([]);
  });
});

describe("regions", () => {
  it("makes selected states a region of their own; the first region takes the others", async () => {
    const doc = await placedExample("get-paid-as-built");
    const { id, commands } = regionCommands(doc, "cnv_open", ["nod_underpaid"], { first: "Main", next: "Region 2" });
    const after = run(doc, commands);
    const regions = after.canvases.cnv_open.regions;
    expect(Object.values(regions).map(region => region.name)).toEqual(["Main", "Region 2"]);
    expect(after.canvases.cnv_open.nodes.nod_underpaid.region).toBe(id);
    expect(after.canvases.cnv_open.nodes.nod_created.region).not.toBe(id);
    expect(regionCommands(doc, "cnv_transaction", [], { first: "Main", next: "Region 2" })).toBeNull();
  });
});

/** A machine of two regions side by side: Payer (Open and its start) at the left, Bank (Paid) at the right. */
function regions() {
  let doc = newProject({ name: "Pay", kind: "machine", names: { state: "Open", end: "Done" } }, new Set());
  doc = run(doc, [
    { type: "region.add", args: { canvas: doc.root, id: "rgn_payer", name: "Payer" } },
    { type: "region.add", args: { canvas: doc.root, id: "rgn_bank", name: "Bank" } },
    {
      type: "node.add",
      args: { canvas: doc.root, id: "nod_paid", node: { kind: "state", name: "Paid", region: "rgn_bank" } }
    },
    ...[
      ["nod_initial", 0, 0],
      ["nod_firstState", 120, 0],
      ["nod_paid", 600, 0]
    ].map(([id, x, y]) => ({ type: "layout.node.set", args: { canvas: doc.root, id, x, y } }))
  ]);
  return doc;
}

const drawn = (doc, id) => figureOf(doc, doc.root).regions.find(part => part.id === id);

describe("regions", () => {
  it("puts a box placed outside every region in the nearest one", () => {
    const doc = regions();
    const bank = drawn(doc, "rgn_bank");
    expect(regionAt(doc, doc.root, { x: bank.x + bank.w + 300, y: bank.y + bank.h / 2 })).toEqual({
      region: "rgn_bank"
    });
    const payer = drawn(doc, "rgn_payer");
    expect(regionAt(doc, doc.root, { x: payer.x - 300, y: payer.y })).toEqual({ region: "rgn_payer" });
  });

  it("moves a box dropped inside another region into it, as part of the same change", () => {
    const doc = regions();
    const bank = drawn(doc, "rgn_bank");
    const { w, h } = figureOf(doc, doc.root).nodes.find(part => part.id === "nod_firstState");
    const into = { x: bank.x + bank.w / 2 - w / 2, y: bank.y + bank.h / 2 - h / 2 };
    const after = run(doc, moveCommands(doc, doc.root, [["nod_firstState", into]]));
    expect(after.canvases[doc.root].nodes.nod_firstState.region).toBe("rgn_bank");
    // Moved within its own region, or out of every region, it stays where it was.
    const near = run(doc, moveCommands(doc, doc.root, [["nod_firstState", { x: 140, y: 10 }]]));
    expect(near.canvases[doc.root].nodes.nod_firstState.region).toBe("rgn_payer");
  });
});
