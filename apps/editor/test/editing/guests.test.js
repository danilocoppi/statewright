import { applyBatch, check } from "statewright";
import { describe, expect, it } from "vitest";

import { placeCommands } from "@/editing/place";
import { DOCK_TABS, toolById, toolsFor } from "@/editing/tools";
import { newProject } from "@/files/new-project";

const run = (doc, commands) => applyBatch(doc, commands).doc;
const project = kind => newProject({ name: "Guests", kind, names: { state: "Open", end: "Done" } }, new Set());
const at = { x: 400, y: 300 };

describe("guest tools: the dock's tabs (mixed levels spec §6)", () => {
  it("has a tab per kind, and each level's own tools on its own tab", () => {
    expect(DOCK_TABS).toEqual(["system", "machine", "flow"]);
    for (const kind of DOCK_TABS) expect(toolsFor(kind, kind)).toEqual(toolsFor(kind));
  });

  it("offers each level the guests of the other kinds, between Select and Note, with no letter key", () => {
    const ids = (kind, tab) => toolsFor(kind, tab).map(tool => tool.id);
    expect(ids("system", "machine")).toEqual(["select", "lifecycle", "note"]);
    expect(ids("system", "flow")).toEqual(["select", "procedure", "note"]);
    expect(ids("machine", "system")).toEqual([
      "select",
      "participantActor",
      "participantService",
      "participantExternal",
      "note"
    ]);
    expect(ids("machine", "flow")).toEqual(["select", "steps", "note"]);
    expect(ids("flow", "system")).toEqual([
      "select",
      "participantActor",
      "participantService",
      "participantExternal",
      "note"
    ]);
    expect(ids("flow", "machine")).toEqual(["select", "stateGuest", "note"]);
    for (const kind of DOCK_TABS) {
      for (const tab of DOCK_TABS.filter(other => other !== kind)) {
        for (const tool of toolsFor(kind, tab).slice(1, -1)) expect(tool.key, tool.id).toBeUndefined();
      }
    }
  });

  it("finds a tool by its ID on any tab of a level", () => {
    expect(toolById("machine", "steps").node).toEqual({ kind: "steps" });
    expect(toolById("machine", "state").key).toBe("S");
    expect(toolById("machine", "stateGuest")).toBeNull();
  });
});

describe("placing a guest", () => {
  it("adds a participant of an existing party, or the party it is named after, in one change", () => {
    const doc = project("machine");
    const fresh = placeCommands(doc, doc.root, toolById("machine", "participantActor"), at, {
      party: { name: "Customer" }
    });
    const after = run(doc, fresh.commands);
    const [partyId, party] = Object.entries(after.catalog.parties)[0];
    expect(party).toEqual({ kind: "human", name: "Customer" });
    expect(after.canvases[doc.root].nodes[fresh.id]).toEqual({ kind: "participant", party: partyId });
    const again = placeCommands(after, doc.root, toolById("machine", "participantService"), at, {
      party: { id: partyId }
    });
    expect(again.commands.map(command => command.type)).toEqual(["node.add"]);
  });

  it("names a new service party as a system, an external one as external", () => {
    const doc = project("flow");
    for (const [tool, kind] of [
      ["participantService", "system"],
      ["participantExternal", "external"]
    ]) {
      const { commands } = placeCommands(doc, doc.root, toolById("flow", tool), at, { party: { name: "Bank" } });
      expect(Object.values(run(doc, commands).catalog.parties)[0].kind).toBe(kind);
    }
  });

  it("adds the steps of an action, giving the action a flow when it has none", () => {
    const doc = project("machine");
    const { id, commands } = placeCommands(doc, doc.root, toolById("machine", "steps"), at, {
      action: { name: "Charge card" }
    });
    const after = run(doc, commands);
    const [actionId, action] = Object.entries(after.catalog.actions)[0];
    expect(after.canvases[doc.root].nodes[id]).toEqual({ kind: "steps", action: actionId });
    expect(after.canvases[action.inner.canvas]).toMatchObject({ kind: "flow", name: "Charge card" });
    // The new flow starts as a new project's does, with no errors.
    expect(Object.values(after.canvases[action.inner.canvas].nodes).map(node => node.kind)).toEqual(["start", "end"]);
    expect(check(after).filter(problem => problem.severity === "error")).toEqual([]);
    const withFlow = placeCommands(after, doc.root, toolById("machine", "steps"), at, { action: { id: actionId } });
    expect(withFlow.commands.map(command => command.type)).toEqual(["node.add"]);
  });

  it("adds a state guest standing for a machine's state", () => {
    const machine = project("machine");
    const stateId = Object.entries(machine.canvases[machine.root].nodes).find(([, node]) => node.kind === "state")[0];
    const doc = run(machine, [
      { type: "catalog.add", args: { collection: "actions", id: "act_pay", item: { name: "Pay" } } },
      { type: "canvas.create", args: { kind: "flow", name: "Pay", owner: "act_pay", id: "cnv_pay" } }
    ]);
    const { id, commands } = placeCommands(doc, "cnv_pay", toolById("flow", "stateGuest"), at, { target: stateId });
    const after = run(doc, commands);
    expect(after.canvases.cnv_pay.nodes[id]).toEqual({ kind: "state", target: stateId });
    expect(check(after).filter(problem => problem.code.startsWith("roles."))).toEqual([]);
  });

  it("adds a lifecycle: a store with a new machine inside, shown as a frame", () => {
    const doc = project("system");
    const { id, commands } = placeCommands(doc, doc.root, toolById("system", "lifecycle"), at, { name: "Order" });
    const after = run(doc, commands);
    const node = after.canvases[doc.root].nodes[id];
    expect(node).toMatchObject({ kind: "store", name: "Order" });
    expect(after.canvases[node.inner.canvas]).toMatchObject({ kind: "machine", name: "Order" });
    expect(Object.values(after.canvases[node.inner.canvas].nodes).map(item => item.kind)).toEqual(["initial", "state"]);
    expect(after.layout.canvases[doc.root].nodes[id].display).toBe("frame");
  });

  it("adds a procedure: a service with a new flow inside, shown as a frame", () => {
    const doc = project("system");
    const { id, commands } = placeCommands(doc, doc.root, toolById("system", "procedure"), at, { name: "Refund" });
    const after = run(doc, commands);
    const node = after.canvases[doc.root].nodes[id];
    expect(after.canvases[node.inner.canvas]).toMatchObject({ kind: "flow", name: "Refund" });
    expect(after.layout.canvases[doc.root].nodes[id].display).toBe("frame");
  });
});

describe("connecting guests (M1: they take no part in the level's transitions)", () => {
  it("refuses a connection to or from a guest, and a box dragged out of one", async () => {
    const { connectRefusal, startRefusal } = await import("@/editing/connect");
    const doc = project("machine");
    const placed = placeCommands(doc, doc.root, toolById("machine", "participantActor"), at, {
      party: { name: "Customer" }
    });
    const after = run(doc, placed.commands);
    const state = Object.keys(after.canvases[doc.root].nodes).find(
      id => after.canvases[doc.root].nodes[id].kind === "state"
    );
    expect(connectRefusal(after, doc.root, placed.id, state)).toBe("guest");
    expect(connectRefusal(after, doc.root, state, placed.id)).toBe("guest");
    expect(startRefusal(after, doc.root, placed.id)).toBe("guest");
  });
});

describe("naming guests", () => {
  it("renames a guest through its label, and gives it back its party's name when emptied", async () => {
    const { renameCommands } = await import("@/editing/changes");
    const doc = project("machine");
    const placed = placeCommands(doc, doc.root, toolById("machine", "participantActor"), at, {
      party: { name: "Customer" }
    });
    const after = run(doc, placed.commands);
    expect(renameCommands(after, placed.id, "Customer")).toEqual([]);
    const renamed = run(after, renameCommands(after, placed.id, "Buyer"));
    expect(renamed.canvases[doc.root].nodes[placed.id].label).toBe("Buyer");
    const back = run(renamed, renameCommands(renamed, placed.id, ""));
    expect(back.canvases[doc.root].nodes[placed.id].label).toBeUndefined();
  });

  it("finds a guest by what it stands for", async () => {
    const { elementName } = await import("@/inspector/references");
    const { buildIndex } = await import("statewright");
    const doc = project("machine");
    const placed = placeCommands(doc, doc.root, toolById("machine", "participantActor"), at, {
      party: { name: "Customer" }
    });
    const after = run(doc, placed.commands);
    expect(elementName(after, buildIndex(after).get(placed.id), kind => kind)).toBe("Customer");
  });
});

describe("choosing a participant's party", () => {
  it("offers a party of another kind by the name typed, rather than nothing", async () => {
    const { partyOptions } = await import("@/editing/choices");
    const doc = project("machine");
    doc.catalog.parties.pty_bank = { kind: "external", name: "Bank" };
    const options = partyOptions(
      key => key,
      doc,
      toolById("machine", "participantActor"),
      () => {}
    )("Bank");
    expect(options.map(option => [option.id, option.meta])).toEqual([
      ["pty_bank", "inspector:choices.partyKind.external"]
    ]);
  });
});
