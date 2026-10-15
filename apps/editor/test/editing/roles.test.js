import { applyBatch } from "statewright";
import { autoLayout } from "statewright/layout";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { projectLevel } from "@/canvas/project";
import { connectBoxes, deleteSelection, receiveWith } from "@/editing/actions";
import { connectRefusal, emptyRefusal, startRefusal } from "@/editing/connect";
import { editingStore } from "@/editing/state";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

const t = key => key;
const state = () => editorStore.getState();

/** A machine: open → paid on order.pay; paid runs Notify and Charge card; a customer, a payment service, the steps. */
async function rolesDoc() {
  const base = newProject({ name: "Orders", kind: "machine", names: { state: "open", end: "Done" } }, new Set());
  const root = base.root;
  const open = Object.keys(base.canvases[root].nodes).find(id => base.canvases[root].nodes[id].kind === "state");
  const doc = applyBatch(base, [
    {
      type: "catalog.add",
      args: { collection: "parties", id: "pty_customer", item: { kind: "human", name: "Customer" } }
    },
    {
      type: "catalog.add",
      args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
    },
    { type: "catalog.add", args: { collection: "events", id: "evt_pay", item: { name: "order.pay" } } },
    { type: "catalog.add", args: { collection: "actions", id: "act_charge", item: { name: "Charge card" } } },
    { type: "catalog.add", args: { collection: "actions", id: "act_notify", item: { name: "Notify" } } },
    {
      type: "node.add",
      args: {
        canvas: root,
        id: "nod_paid",
        node: { kind: "state", name: "paid", onEntry: [{ action: "act_notify" }, { action: "act_charge" }] }
      }
    },
    {
      type: "node.add",
      args: { canvas: root, id: "nod_customer", node: { kind: "participant", party: "pty_customer" } }
    },
    {
      type: "node.add",
      args: { canvas: root, id: "nod_service", node: { kind: "participant", party: "pty_payments" } }
    },
    { type: "node.add", args: { canvas: root, id: "nod_steps", node: { kind: "steps", action: "act_charge" } } },
    { type: "edge.add", args: { canvas: root, id: "edg_pay", edge: { from: open, to: "nod_paid", on: ["evt_pay"] } } }
  ]).doc;
  return { doc: applyBatch(doc, await autoLayout(doc, root, { scope: "all" })).doc, root, open };
}

let level;
beforeEach(async () => {
  level = await rolesDoc();
  editorStore.getState().open(level.doc, { canvasId: level.root });
});
afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("drawing roles on a machine (mixed levels spec §4.1, §4.2, §6)", () => {
  it("lets a participant or steps start a connector, but not a new box in empty space", () => {
    const { doc, root } = level;
    expect(startRefusal(doc, root, "nod_customer")).toBeNull();
    expect(startRefusal(doc, root, "nod_steps")).toBeNull();
    expect(emptyRefusal(doc, root, "nod_customer")).toBe("guest");
    expect(emptyRefusal(doc, root, level.open)).toBeNull();
  });

  it("judges a connector by what it would mean", () => {
    const { doc, root, open } = level;
    expect(connectRefusal(doc, root, "nod_customer", "edg_pay")).toBeNull();
    expect(connectRefusal(doc, root, "nod_customer", open)).toBe("noMeaning");
    expect(connectRefusal(doc, root, "nod_steps", open)).toBeNull();
    expect(connectRefusal(doc, root, "nod_paid", "nod_service")).toBeNull();
    expect(connectRefusal(doc, root, open, "nod_service")).toBe("nothingToReceive");
  });

  it("participant onto a transition: it sends it, in one undoable change", () => {
    connectBoxes(t, "nod_customer", "edg_pay", { x: 0, y: 0 });
    expect(state().doc.canvases[level.root].edges.edg_pay.by).toBe("pty_customer");
    state().undo();
    expect(state().doc.canvases[level.root].edges.edg_pay.by).toBeUndefined();
  });

  it("a state onto a participant: asks which of its actions it receives, then gives that action the party", () => {
    connectBoxes(t, "nod_paid", "nod_service", { x: 10, y: 20 });
    expect(editingStore.getState().editor).toMatchObject({
      type: "receive",
      from: "nod_paid",
      to: "nod_service",
      needs: "action",
      options: ["act_notify", "act_charge"]
    });
    receiveWith(t, "act_charge");
    expect(state().doc.catalog.actions.act_charge.party).toBe("pty_payments");
    expect(editingStore.getState().editor).toBeNull();
  });

  it("says why a connector means nothing", () => {
    connectBoxes(t, "nod_customer", level.open, { x: 1, y: 2 });
    expect(editingStore.getState().refusal).toMatchObject({ reason: "noMeaning" });
  });

  it("deletes a connector by clearing what it stands for", () => {
    connectBoxes(t, "nod_customer", "edg_pay", { x: 0, y: 0 });
    state().select(["sends:nod_customer:edg_pay"]);
    deleteSelection(t);
    expect(state().doc.canvases[level.root].edges.edg_pay.by).toBeUndefined();
  });
});

describe("deleting a sender read from an event's source", () => {
  it("says which other transitions lose their sender, with Undo", async () => {
    const { useToastStore } = await import("@/stores/toast");
    const { doc, root, open } = level;
    const sourced = applyBatch(doc, [
      { type: "catalog.update", args: { id: "evt_pay", set: { source: "pty_customer" } } },
      {
        type: "edge.add",
        args: { canvas: root, id: "edg_again", edge: { from: "nod_paid", to: open, on: ["evt_pay"] } }
      }
    ]).doc;
    editorStore.getState().open(sourced, { canvasId: root });
    state().select(["sends:nod_customer:edg_pay"]);
    deleteSelection(t);
    expect(state().doc.catalog.events.evt_pay.source).toBeUndefined();
    const [notice] = useToastStore.getState().items.slice(-1);
    expect(notice.message).toBe("roles.alsoLose");
    notice.actions[0].onClick();
    expect(state().doc.catalog.events.evt_pay.source).toBe("pty_customer");
  });
});

describe("the canvas shows the roles' connectors", () => {
  it("projects each association as an edge of its own type", () => {
    const { edges } = projectLevel(level.doc, level.root);
    const runs = edges.find(edge => edge.id === "runs:nod_paid:nod_steps");
    expect(runs).toMatchObject({ type: "association", source: "nod_paid", target: "nod_steps", selectable: true });
    expect(runs.data.part.role).toBe("runs");
  });
});

describe("the roles' refusals in words", () => {
  it("has a sentence for each", async () => {
    const { refusalKey } = await import("@/editing/refusals");
    for (const reason of ["guest", "noMeaning", "already", "notRun", "nothingToReceive"]) {
      expect(refusalKey(reason)).toBe(`refusals.${reason}`);
    }
  });
});

describe("connectors that reach into a frame", () => {
  it("keys each end with its own frame's path, so React Flow finds both", async () => {
    const doc = applyBatch(level.doc, [
      { type: "catalog.add", args: { collection: "parties", id: "pty_ops", item: { kind: "operator", name: "Ops" } } }
    ]).doc;
    // A system around the machine: a store holding it as a frame, and a service acting for the customer.
    const system = structuredClone({
      ...doc,
      root: "cnv_shop",
      canvases: {
        ...doc.canvases,
        cnv_shop: {
          kind: "system",
          name: "Shop",
          nodes: {
            nod_orders: { kind: "store", name: "Orders", inner: { canvas: level.root } },
            nod_web: { kind: "service", name: "Web", party: "pty_customer" }
          },
          edges: {}
        }
      }
    });
    system.canvases[level.root].edges.edg_pay.by = "pty_customer";
    let placed = applyBatch(system, [
      { type: "layout.node.set", args: { canvas: "cnv_shop", id: "nod_orders", x: 0, y: 0, display: "frame" } }
    ]).doc;
    placed = applyBatch(placed, await autoLayout(placed, "cnv_shop", { scope: "all" })).doc;
    const { nodes, edges } = projectLevel(placed, "cnv_shop");
    const keys = new Set(nodes.map(node => node.id));
    const drives = edges.filter(edge => edge.type === "association");
    expect(drives.length).toBeGreaterThan(0);
    for (const edge of drives) {
      expect(keys.has(edge.source), edge.source).toBe(true);
      expect(keys.has(edge.target), edge.target).toBe(true);
    }
  });
});
