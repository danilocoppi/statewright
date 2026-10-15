import { describe, expect, it } from "vitest";
import { applyBatch, associate, associationRefusal, associationsOf, dissociateCommands } from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

/** A machine with two participants, an action run on entering `paid`, its embedded steps, and two transitions. */
function rolesDoc() {
  const doc = minimalDoc();
  Object.assign(doc.catalog.parties, {
    pty_customer: { kind: "human", name: "Customer" },
    pty_payments: { kind: "system", name: "Payments" }
  });
  Object.assign(doc.catalog.events, {
    evt_pay: { name: "order.pay" },
    evt_cancel: { name: "order.cancel", source: "pty_customer" }
  });
  Object.assign(doc.catalog.actions, {
    act_charge: { name: "Charge card" },
    act_notify: { name: "Notify" }
  });
  doc.canvases.cnv_root = {
    kind: "machine",
    name: "Order",
    nodes: {
      nod_init: { kind: "initial" },
      nod_open: { kind: "state", name: "open" },
      nod_paid: { kind: "state", name: "paid", onEntry: [{ action: "act_notify" }, { action: "act_charge" }] },
      nod_gone: { kind: "state", name: "gone" },
      nod_customer: { kind: "participant", party: "pty_customer" },
      nod_service: { kind: "participant", party: "pty_payments" },
      nod_steps: { kind: "steps", action: "act_charge" }
    },
    edges: {
      edg_start: { from: "nod_init", to: "nod_open" },
      edg_pay: { from: "nod_open", to: "nod_paid", on: ["evt_pay"] },
      edg_cancel: { from: "nod_open", to: "nod_gone", on: ["evt_cancel"] },
      edg_again: { from: "nod_paid", to: "nod_gone", on: ["evt_cancel"] }
    }
  };
  return doc;
}

const run = (doc, result) => applyBatch(doc, result.commands).doc;
const ids = (doc, canvas = "cnv_root") => associationsOf(doc, canvas).map(item => item.id);

describe("drawing a role (mixed levels spec §3: drawing writes the field)", () => {
  it("participant → transition: the transition's `by`", () => {
    const doc = rolesDoc();
    const result = associate(doc, "cnv_root", "nod_customer", "edg_pay");
    expect(result.role).toBe("sends");
    expect(run(doc, result).canvases.cnv_root.edges.edg_pay.by).toBe("pty_customer");
    const other = run(doc, associate(doc, "cnv_root", "nod_service", "edg_pay"));
    expect(run(other, associate(other, "cnv_root", "nod_customer", "edg_pay")).canvases.cnv_root.edges.edg_pay.by).toBe(
      "pty_customer"
    );
    const done = run(doc, result);
    expect(associate(done, "cnv_root", "nod_customer", "edg_pay")).toEqual({ refusal: "already" });
  });

  it("state → participant: the party of the action it receives, asking which when the state runs several", () => {
    const doc = rolesDoc();
    expect(associate(doc, "cnv_root", "nod_paid", "nod_service")).toEqual({
      needs: "action",
      actions: ["act_notify", "act_charge"]
    });
    const result = associate(doc, "cnv_root", "nod_paid", "nod_service", { action: "act_charge" });
    expect(result.role).toBe("receives");
    const after = run(doc, result);
    expect(after.catalog.actions.act_charge.party).toBe("pty_payments");
    expect(ids(after)).toContain("receives:nod_paid:nod_service");
    expect(associate(doc, "cnv_root", "nod_paid", "nod_service", { action: "act_gone" })).toEqual({
      refusal: "notRun"
    });
    expect(associate(doc, "cnv_root", "nod_open", "nod_service")).toEqual({ refusal: "nothingToReceive" });
  });

  it("steps → transition or state: the action runs there", () => {
    const doc = rolesDoc();
    const onEdge = run(doc, associate(doc, "cnv_root", "nod_steps", "edg_pay"));
    expect(onEdge.canvases.cnv_root.edges.edg_pay.actions).toEqual([{ action: "act_charge" }]);
    expect(associate(onEdge, "cnv_root", "nod_steps", "edg_pay")).toEqual({ refusal: "already" });
    const onState = run(doc, associate(doc, "cnv_root", "nod_steps", "nod_open"));
    expect(onState.canvases.cnv_root.nodes.nod_open.onEntry).toEqual([{ action: "act_charge" }]);
    expect(associate(doc, "cnv_root", "nod_steps", "nod_paid")).toEqual({ refusal: "already" });
  });

  it("refuses what means nothing, naming the roles a guest has", () => {
    const doc = rolesDoc();
    expect(associate(doc, "cnv_root", "nod_customer", "nod_service")).toEqual({ refusal: "noMeaning" });
    expect(associate(doc, "cnv_root", "nod_open", "nod_paid")).toEqual({ refusal: "noMeaning" });
    expect(associationRefusal(doc, "cnv_root", "nod_customer", "nod_open")).toBe("noMeaning");
    expect(associationRefusal(doc, "cnv_root", "nod_customer", "edg_pay")).toBeNull();
    expect(associationRefusal(doc, "cnv_root", "nod_paid", "nod_service")).toBeNull();
  });
});

describe("deleting a role's connector (spec §3: deleting clears the field)", () => {
  const find = (doc, id) => associationsOf(doc, "cnv_root").find(item => item.id === id);

  it("sends by `by`: unsets it", () => {
    const doc = run(rolesDoc(), associate(rolesDoc(), "cnv_root", "nod_customer", "edg_pay"));
    const { commands, alsoLoses } = dissociateCommands(doc, find(doc, "sends:nod_customer:edg_pay"));
    expect(alsoLoses).toEqual([]);
    expect(applyBatch(doc, commands).doc.canvases.cnv_root.edges.edg_pay.by).toBeUndefined();
  });

  it("sends by an event's source: unsets the source, and says which other transitions lose their sender", () => {
    const doc = rolesDoc();
    const { commands, alsoLoses } = dissociateCommands(doc, find(doc, "sends:nod_customer:edg_cancel"));
    expect(alsoLoses).toEqual(["edg_again"]);
    const after = applyBatch(doc, commands).doc;
    expect(after.catalog.events.evt_cancel.source).toBeUndefined();
    expect(ids(after).filter(id => id.startsWith("sends:"))).toEqual([]);
  });

  it("receives: unsets each action's party", () => {
    const doc = rolesDoc();
    const given = run(doc, associate(doc, "cnv_root", "nod_paid", "nod_service", { action: "act_charge" }));
    const { commands } = dissociateCommands(given, find(given, "receives:nod_paid:nod_service"));
    expect(applyBatch(given, commands).doc.catalog.actions.act_charge.party).toBeUndefined();
  });

  it("runs: takes the action out of the place that runs it", () => {
    const doc = rolesDoc();
    const { commands } = dissociateCommands(doc, find(doc, "runs:nod_paid:nod_steps"));
    expect(applyBatch(doc, commands).doc.canvases.cnv_root.nodes.nod_paid.onEntry).toEqual([{ action: "act_notify" }]);
    const single = run(doc, associate(doc, "cnv_root", "nod_steps", "edg_pay"));
    const removed = applyBatch(single, dissociateCommands(single, find(single, "runs:edg_pay:nod_steps")).commands).doc;
    expect(removed.canvases.cnv_root.edges.edg_pay.actions).toBeUndefined();
  });
});
