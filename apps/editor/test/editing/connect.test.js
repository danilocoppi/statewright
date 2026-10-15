import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { addNode } from "@/editing/changes";
import {
  asksAfterConnect,
  connectCommands,
  connectRefusal,
  edgeFor,
  naturalTool,
  placeRefusal,
  startRefusal
} from "@/editing/connect";
import { newProject } from "@/files/new-project";

import { placedExample } from "../fixtures.js";

const names = { state: "First state", end: "Done" };
const project = kind => newProject({ name: "Connect", kind, names }, new Set());
const run = (doc, commands) => applyBatch(doc, commands).doc;

/** A project of a kind with extra nodes on its root. */
function withNodes(kind, nodes) {
  const doc = project(kind);
  return run(
    doc,
    Object.entries(nodes).map(([id, node]) => ({ type: "node.add", args: { canvas: doc.root, id, node } }))
  );
}

describe("connecting", () => {
  it("adds a plain transition on machines and a link when an end is a shortcut", () => {
    const doc = withNodes("machine", {
      nod_paid: { kind: "state", name: "Paid" },
      nod_elsewhere: { kind: "ref", target: "cnv_connect" }
    });
    expect(edgeFor(doc, doc.root, "nod_firstState", "nod_paid")).toEqual({ from: "nod_firstState", to: "nod_paid" });
    expect(edgeFor(doc, doc.root, "nod_paid", "nod_elsewhere")).toEqual({
      from: "nod_paid",
      to: "nod_elsewhere",
      kind: "link"
    });
  });

  it("names the branches out of an if (true, then false) and the cases of a switch", () => {
    let doc = withNodes("flow", {
      nod_check: { kind: "if", name: "Paid?" },
      nod_route: { kind: "switch", name: "Route" }
    });
    const first = edgeFor(doc, doc.root, "nod_check", "nod_end");
    expect(first.kind).toBe("true");
    doc = run(doc, [{ type: "edge.add", args: { canvas: doc.root, edge: first } }]);
    expect(edgeFor(doc, doc.root, "nod_check", "nod_end").kind).toBe("false");
    expect(edgeFor(doc, doc.root, "nod_route", "nod_end")).toMatchObject({ kind: "case", case: "case 1" });
    expect(edgeFor(doc, doc.root, "nod_start", "nod_check")).toEqual({ from: "nod_start", to: "nod_check" });
  });

  it("refuses what the format forbids before asking Core, and says why", () => {
    const doc = withNodes("machine", {
      nod_done: { kind: "state", name: "Done", terminal: true },
      nod_paid: { kind: "state", name: "Paid" }
    });
    expect(connectRefusal(doc, doc.root, "nod_firstState", "nod_initial")).toBe("intoStart");
    expect(connectRefusal(doc, doc.root, "nod_done", "nod_paid")).toBe("fromTerminal");
    expect(connectRefusal(doc, doc.root, "nod_initial", "nod_paid")).toBe("initialOnce");
    expect(connectRefusal(doc, doc.root, "nod_firstState", "nod_nowhere")).toBe("elsewhere");
    expect(connectRefusal(doc, doc.root, "nod_firstState", "nod_paid")).toBeNull();
  });

  it("refuses a transition between regions", async () => {
    const doc = await placedExample("payments");
    const nodes = doc.canvases.cnv_lifecycle.nodes;
    const [a, b] = ["rgn_compliance", "rgn_expiry"].map(region =>
      Object.keys(nodes).find(id => nodes[id].region === region && nodes[id].kind === "state")
    );
    expect(connectRefusal(doc, "cnv_lifecycle", a, b)).toBe("crossRegion");
  });

  it("refuses a second initial node in a region", () => {
    const doc = project("machine");
    expect(placeRefusal(doc, doc.root, { kind: "initial" }, { x: 0, y: 0 })).toBe("secondInitial");
    expect(placeRefusal(doc, doc.root, { kind: "state", name: "S" }, { x: 0, y: 0 })).toBeNull();
    const added = addNode(doc, doc.root, { kind: "choice" }, { x: 0, y: 0 });
    expect(placeRefusal(run(doc, added.commands), doc.root, { kind: "choice" }, { x: 0, y: 0 })).toBeNull();
  });

  it("starts nothing from a terminal state or from an initial node that already leads somewhere", () => {
    const doc = withNodes("machine", { nod_done: { kind: "state", name: "Done", terminal: true } });
    expect(startRefusal(doc, doc.root, "nod_done")).toBe("fromTerminal");
    expect(startRefusal(doc, doc.root, "nod_initial")).toBe("initialOnce");
    expect(startRefusal(doc, doc.root, "nod_firstState")).toBeNull();
  });

  it("connects two boxes with a new edge named after them, and asks about transitions, not links", () => {
    const doc = withNodes("machine", {
      nod_paid: { kind: "state", name: "Paid" },
      nod_away: { kind: "ref", target: "cnv_connect" }
    });
    const { id, commands } = connectCommands(doc, doc.root, "nod_firstState", "nod_paid");
    expect(id).toBe("edg_firstStatePaid");
    const after = run(doc, commands);
    expect(asksAfterConnect(after, doc.root, id)).toBe(true);
    const link = connectCommands(after, doc.root, "nod_paid", "nod_away");
    expect(asksAfterConnect(run(after, link.commands), doc.root, link.id)).toBe(false);
  });

  it("asks about flow edges only out of an if or a switch", () => {
    let doc = withNodes("flow", { nod_check: { kind: "if", name: "Paid?" } });
    const plain = connectCommands(doc, doc.root, "nod_start", "nod_check");
    doc = run(doc, plain.commands);
    const branch = connectCommands(doc, doc.root, "nod_check", "nod_end");
    doc = run(doc, branch.commands);
    expect([asksAfterConnect(doc, doc.root, plain.id), asksAfterConnect(doc, doc.root, branch.id)]).toEqual([
      false,
      true
    ]);
  });

  it("creates a state from a state, a service from a service and an action from a flow step", () => {
    expect(["machine", "system", "flow"].map(naturalTool)).toEqual(["state", "service", "action"]);
  });
});
