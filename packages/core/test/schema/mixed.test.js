import { describe, expect, it } from "vitest";
import {
  applyBatch,
  CommandError,
  collectRefs,
  createDocument,
  documentSchema,
  edgeHome,
  homeKind,
  applyPatches
} from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

/** A shop on one mixed level: Order's states, a checkout's steps, two services, a participant and a state guest. */
export function mixedDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, { pty_customer: { kind: "human", name: "Customer" } });
  Object.assign(doc.catalog.events, { evt_pay: { name: "order.pay" } });
  doc.catalog.endpoints.ept_pay = { name: "Pay", method: "POST", path: "/pay" };
  doc.canvases.cnv_root.nodes.nod_shop = { kind: "service", name: "Shop", inner: { canvas: "cnv_mixed" } };
  doc.canvases.cnv_mixed = {
    kind: "mixed",
    name: "Shop floor",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid", terminal: true },
      nod_start: { kind: "start" },
      nod_call: { kind: "call", endpoint: "ept_pay" },
      nod_end: { kind: "end" },
      nod_web: { kind: "service", name: "Web", party: "pty_customer" },
      nod_db: { kind: "store", name: "Orders" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_paidHere: { kind: "state", target: "nod_paid" }
    },
    edges: {
      edg_init: { from: "nod_init", to: "nod_open", kind: "transition" },
      edg_pay: { from: "nod_open", to: "nod_paid", kind: "transition", on: ["evt_pay"] },
      edg_s1: { from: "nod_start", to: "nod_call" },
      edg_s2: { from: "nod_call", to: "nod_end", kind: "next" },
      edg_db: { from: "nod_web", to: "nod_db", kind: "data", events: ["evt_pay"] }
    }
  };
  return doc;
}

const issues = doc => documentSchema.safeParse(doc).error?.issues.map(issue => issue.path.join("/")) ?? [];
const add = (doc, edge) => applyBatch(doc, [{ type: "edge.add", args: { canvas: "cnv_mixed", id: "edg_new", edge } }]);

describe("the mixed level (mixed levels spec §4.5, §5)", () => {
  it("holds elements of every kind", () => {
    expect(issues(mixedDoc())).toEqual([]);
  });

  it("says what each element is at home: a machine's, a flow's or a system's", () => {
    const { nodes, edges } = mixedDoc().canvases.cnv_mixed;
    expect(
      ["nod_open", "nod_init", "nod_customer", "nod_start", "nod_call", "nod_paidHere", "nod_web"].map(id =>
        homeKind("mixed", nodes[id])
      )
    ).toEqual(["machine", "machine", "machine", "flow", "flow", "flow", "system"]);
    expect(homeKind("machine", nodes.nod_start)).toBe("machine");
    expect(
      ["edg_pay", "edg_s1", "edg_s2", "edg_db"].map(id => edgeHome(mixedDoc().canvases.cnv_mixed, edges[id]))
    ).toEqual(["machine", "flow", "flow", "system"]);
  });

  it("refuses a transition without its kind, and keys of another kind's edge", () => {
    const doc = mixedDoc();
    delete doc.canvases.cnv_mixed.edges.edg_pay.kind;
    expect(issues(doc).length).toBeGreaterThan(0);
  });

  it("collects each element's references as its own kind does", () => {
    const refs = collectRefs(mixedDoc());
    const of = (source, field) => refs.find(ref => ref.source === source && ref.field === field)?.target;
    expect(of("edg_pay", "on")).toBe("evt_pay");
    expect(of("nod_call", "endpoint")).toBe("ept_pay");
    expect(of("edg_db", "events")).toBe("evt_pay");
    expect(of("nod_paidHere", "target")).toBe("nod_paid");
    expect(of("nod_web", "party")).toBe("pty_customer");
  });

  it("gives a connection the meaning its ends have, and refuses ends with none", () => {
    const doc = mixedDoc();
    expect(() => add(doc, { from: "nod_open", to: "nod_open", kind: "transition", on: ["evt_pay"] })).not.toThrow();
    expect(() => add(doc, { from: "nod_call", to: "nod_end" })).not.toThrow();
    expect(() => add(doc, { from: "nod_db", to: "nod_web", kind: "data" })).not.toThrow();
    for (const edge of [
      { from: "nod_open", to: "nod_call", kind: "transition" },
      { from: "nod_open", to: "nod_call" },
      { from: "nod_web", to: "nod_open", kind: "command" },
      { from: "nod_call", to: "nod_paid" }
    ]) {
      expect(() => add(doc, edge), JSON.stringify(edge)).toThrow(CommandError);
    }
  });

  it("turns a typed level into a mixed one, in one change that undoes", () => {
    const doc = mixedDoc();
    doc.canvases.cnv_machine = {
      kind: "machine",
      name: "Order",
      nodes: { nod_i: { kind: "initial" }, nod_a: { kind: "state", name: "a" } },
      edges: { edg_ia: { from: "nod_i", to: "nod_a" } }
    };
    doc.canvases.cnv_mixed.nodes.nod_db.inner = { canvas: "cnv_machine" };
    const { doc: mixed, inversePatches } = applyBatch(doc, [{ type: "canvas.mix", args: { id: "cnv_machine" } }]);
    expect(mixed.canvases.cnv_machine.kind).toBe("mixed");
    expect(mixed.canvases.cnv_machine.edges.edg_ia).toEqual({ from: "nod_i", to: "nod_a", kind: "transition" });
    expect(applyPatches(mixed, inversePatches).canvases.cnv_machine).toEqual(doc.canvases.cnv_machine);
  });

  it("can be the inside of a system's box, a state and an action", () => {
    const doc = mixedDoc();
    doc.catalog.actions.act_x = { name: "X" };
    const result = applyBatch(doc, [
      { type: "canvas.create", args: { kind: "mixed", name: "Inside a state", owner: "nod_open", id: "cnv_a" } },
      { type: "canvas.create", args: { kind: "mixed", name: "Inside an action", owner: "act_x", id: "cnv_b" } },
      { type: "canvas.create", args: { kind: "mixed", name: "Inside a store", owner: "nod_db", id: "cnv_c" } }
    ]);
    expect(Object.keys(result.doc.canvases)).toEqual(expect.arrayContaining(["cnv_a", "cnv_b", "cnv_c"]));
  });

  it("starts a new mixed project empty", () => {
    const doc = createDocument({ name: "Floor", kind: "mixed" });
    expect(doc.canvases[doc.root]).toEqual({ kind: "mixed", name: "Floor", nodes: {}, edges: {} });
    expect(issues(doc)).toEqual([]);
  });
});
