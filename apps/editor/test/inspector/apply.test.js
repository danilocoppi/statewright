import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { fieldCommands, isEmpty, kindCommands } from "@/inspector/apply";
import { newProject } from "@/files/new-project";

import { readExample } from "../fixtures.js";

const run = (doc, commands) => applyBatch(doc, commands).doc;

/** A flow: start → switch → end, with one case edge out of the switch. */
function flow() {
  let doc = newProject({ name: "Pay", kind: "flow", names: { state: "Open", end: "Done" } }, new Set());
  const nodes = doc.canvases[doc.root].nodes;
  const [start, end] = [
    Object.keys(nodes).find(id => nodes[id].kind === "start"),
    Object.keys(nodes).find(id => nodes[id].kind === "end")
  ];
  doc = run(doc, [
    { type: "node.add", args: { canvas: doc.root, id: "nod_route", node: { kind: "switch", name: "Route" } } },
    {
      type: "edge.add",
      args: { canvas: doc.root, id: "edg_one", edge: { from: "nod_route", to: end, kind: "case", case: 1 } }
    },
    { type: "edge.add", args: { canvas: doc.root, id: "edg_two", edge: { from: "nod_route", to: end } } },
    { type: "edge.add", args: { canvas: doc.root, id: "edg_in", edge: { from: start, to: "nod_route" } } }
  ]);
  return doc;
}

describe("editing a field", () => {
  const doc = readExample("get-paid-as-built");
  const state = id => doc.canvases.cnv_open.nodes[id];

  it("sets a field of a node, and leaves it out when it is emptied", () => {
    const set = run(doc, fieldCommands(doc, "nod_awaitingPayment", "description", "The payer has the instructions."));
    expect(set.canvases.cnv_open.nodes.nod_awaitingPayment.description).toBe("The payer has the instructions.");
    expect(state("nod_awaitingPayment").category).toBe("waiting");
    const cleared = run(doc, fieldCommands(doc, "nod_awaitingPayment", "category", undefined));
    expect(cleared.canvases.cnv_open.nodes.nod_awaitingPayment).not.toHaveProperty("category");
    const none = run(doc, fieldCommands(doc, "nod_awaitingPayment", "statuses", []));
    expect(none.canvases.cnv_open.nodes.nod_awaitingPayment).not.toHaveProperty("statuses");
  });

  it("edits the level, the project, a catalog item and a finding through their own commands", () => {
    const event = Object.keys(doc.catalog.events)[0];
    const after = run(doc, [
      ...fieldCommands(doc, "cnv_open", "title", "How a payment opens"),
      ...fieldCommands(doc, doc.project.id, "description", "Everything about getting paid."),
      ...fieldCommands(doc, event, "payload", null)
    ]);
    expect(after.canvases.cnv_open.title).toBe("How a payment opens");
    expect(after.project.description).toBe("Everything about getting paid.");
    expect(after.catalog.events[event].payload).toBeNull();

    const finding = { code: "SW001", title: "No way out", severity: "high", targets: ["nod_failed"] };
    const flagged = run(doc, [{ type: "finding.upsert", args: { id: "fnd_noWayOut", finding } }]);
    const commands = fieldCommands(flagged, "fnd_noWayOut", "severity", "low");
    expect(commands).toEqual([
      { type: "finding.upsert", args: { id: "fnd_noWayOut", finding: { ...finding, severity: "low" } } }
    ]);
    expect(run(flagged, commands).annotations.findings.fnd_noWayOut.severity).toBe("low");
  });

  it("asks nothing of Core for an element that is gone, and keeps null as an explicit none", () => {
    expect(fieldCommands(doc, "nod_gone", "name", "x")).toEqual([]);
    expect([undefined, "", [], {}].every(isEmpty)).toBe(true);
    expect([null, 0, false, "x", [1], { a: 1 }].some(isEmpty)).toBe(false);
  });
});

describe("changing a kind", () => {
  it("leaves out what the new kind of node does not take", () => {
    const doc = readExample("get-paid-as-built");
    const commands = kindCommands(doc, "nod_awaitingPayment", "choice");
    expect(commands[0].args).toMatchObject({ set: { kind: "choice" } });
    expect(commands[0].args.unset.sort()).toEqual(["category", "statuses"]);
    const after = run(doc, commands);
    expect(after.canvases.cnv_open.nodes.nod_awaitingPayment).toEqual({
      kind: "choice",
      name: "awaiting_payment",
      summary: "instructions issued"
    });
  });

  it("numbers a flow edge that becomes a case, and drops the case when it stops being one", () => {
    const doc = flow();
    const casing = run(doc, kindCommands(doc, "edg_two", "case"));
    expect(casing.canvases[doc.root].edges.edg_two).toMatchObject({ kind: "case", case: 2 });
    const plain = run(casing, fieldCommands(casing, "edg_one", "kind", undefined));
    expect(plain.canvases[doc.root].edges.edg_one).toEqual({ from: "nod_route", to: expect.any(String) });
    const otherwise = run(casing, kindCommands(casing, "edg_one", "default"));
    expect(otherwise.canvases[doc.root].edges.edg_one).not.toHaveProperty("case");
  });

  it("keeps a type's fields, values or alias only for the kind that owns them", () => {
    const doc = readExample("payments");
    const [id, type] = Object.entries(doc.catalog.types).find(([, item]) => item.kind === "object");
    const commands = kindCommands(doc, id, "enum");
    expect(commands[0]).toEqual({ type: "catalog.update", args: { id, set: { kind: "enum" }, unset: ["fields"] } });
    expect(type.fields.length).toBeGreaterThan(0);
  });
});
