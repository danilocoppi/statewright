import { describe, expect, it } from "vitest";

import { chipsOf, contextOf } from "@/conversation/context";

import { readExample } from "../fixtures.js";

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

describe("what goes with a message (collaboration spec §5.4)", () => {
  it("names the project, the level and what is selected", () => {
    const doc = readExample("payments");
    expect(contextOf(doc, "cnv_lifecycle", ["nod_complianceHold", "nod_expiryClock"])).toEqual({
      project: { id: "prj_payments", name: "Payments" },
      level: { id: "cnv_lifecycle", name: "Lifecycle engine" },
      selection: [
        { id: "nod_complianceHold", name: "compliance_hold", kind: "state", level: "cnv_lifecycle" },
        { id: "nod_expiryClock", name: "expiry_clock", kind: "state", level: "cnv_lifecycle" }
      ]
    });
  });

  it("leaves out what the person took off, and an empty selection", () => {
    const doc = readExample("payments");
    expect(contextOf(doc, "cnv_lifecycle", ["nod_expiryClock"], { leave: new Set(["selection"]) })).toEqual({
      project: { id: "prj_payments", name: "Payments" },
      level: { id: "cnv_lifecycle", name: "Lifecycle engine" }
    });
    expect(contextOf(doc, "cnv_lifecycle", [], { leave: new Set(["level"]) })).toEqual({
      project: { id: "prj_payments", name: "Payments" }
    });
  });

  it("shows what goes as chips: the level and how many are selected", () => {
    const doc = readExample("payments");
    expect(chipsOf(contextOf(doc, "cnv_lifecycle", ["nod_expiryClock"]), t)).toEqual([
      { key: "level", label: "Lifecycle engine" },
      { key: "selection", label: 'conversation.chips.selection {"count":1}' }
    ]);
  });
});
