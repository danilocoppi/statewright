import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { findInsertables, insertables } from "@/editing/insertables";
import { newProject } from "@/files/new-project";

import { placedExample } from "../fixtures.js";

const t = (key, values) => (values?.name ? `${key}:${values.name}` : key);

describe("what `/` can insert", () => {
  it("offers a flow its tools, the steps the dock leaves out, and a step for each catalog item a step can use", () => {
    let doc = newProject({ name: "Flow", kind: "flow", names: { state: "S", end: "Done" } }, new Set());
    doc = applyBatch(doc, [
      { type: "catalog.add", args: { collection: "events", id: "evt_pspRefund", item: { name: "psp.refund" } } },
      { type: "catalog.add", args: { collection: "actions", id: "act_charge", item: { name: "Charge" } } }
    ]).doc;
    const items = insertables(doc, doc.root, t);
    expect(items.filter(item => item.tool).map(item => item.tool.id)).toEqual([
      "action",
      "if",
      "switch",
      "while",
      "wait",
      "parallel",
      "end",
      "note"
    ]);
    expect(items.find(item => item.id === "emit:evt_pspRefund")).toMatchObject({
      label: "insert.emit:psp.refund",
      node: { kind: "emit", event: "evt_pspRefund" }
    });
    expect(items.find(item => item.id === "action:act_charge").node).toEqual({ kind: "action", action: "act_charge" });
    expect(items.map(item => item.id)).toEqual(expect.arrayContaining(["step:start", "step:forEach", "step:subflow"]));
  });

  it("offers the reusable parts that fit the level: machines inside states, anything inside a system's service", async () => {
    const doc = await placedExample("payments");
    const onMachine = insertables(doc, "cnv_lifecycle", t).filter(item => item.id.startsWith("definition:"));
    expect(onMachine.map(item => item.node.kind)).toEqual(["state", "state", "state"]);
    expect(onMachine[0].node.inner).toEqual({ definition: expect.stringMatching(/^def_/) });
    const onSystem = insertables(doc, "cnv_runtime", t).filter(item => item.id.startsWith("definition:"));
    expect(onSystem.map(item => item.node.kind)).toEqual(["service", "service", "service"]);
    expect(insertables(doc, "cnv_runtime", t).some(item => item.id.startsWith("emit:"))).toBe(false);
  });

  it("finds by what is typed, the names that start with it first", () => {
    const items = ["Join", "Emit a", "Start", "Subflow"].map(label => ({ id: label, label, meta: "" }));
    expect(findInsertables(items, "s").map(item => item.label)).toEqual(["Start", "Subflow"]);
    expect(findInsertables(items, "o").map(item => item.label)).toEqual(["Join", "Subflow"]);
    expect(findInsertables(items, "", 2).map(item => item.label)).toEqual(["Join", "Emit a"]);
  });
});
