import "../i18n.js";

import i18n from "i18next";
import { buildIndex } from "statewright";
import { describe, expect, it } from "vitest";

import { headingOf } from "@/inspector/describe";
import { fieldsOfKind } from "@/inspector/fields";

import { readExample } from "../fixtures.js";

const t = i18n.t.bind(i18n);

/** The payments example with a participant and embedded steps on its lifecycle. */
function withGuests() {
  const doc = readExample("payments");
  doc.catalog.parties.pty_payer = { kind: "human", name: "Payer" };
  const action = Object.keys(doc.catalog.actions)[0];
  Object.assign(doc.canvases.cnv_lifecycle.nodes, {
    nod_payer: {
      kind: "participant",
      party: "pty_payer",
      region: Object.keys(doc.canvases.cnv_lifecycle.regions ?? {})[0]
    },
    nod_steps: { kind: "steps", action }
  });
  return { doc, action };
}

describe("the inspector on guests (mixed levels spec §6)", () => {
  it("heads a guest with what it stands for", () => {
    const { doc, action } = withGuests();
    const index = buildIndex(doc);
    expect(headingOf(t, doc, index.get("nod_payer"))).toMatchObject({ title: "", stand: "Payer" });
    expect(headingOf(t, doc, index.get("nod_steps")).stand).toBe(doc.catalog.actions[action].name);
  });

  it("gives guests no connections section: they take no part in the level's transitions", () => {
    const keys = (canvasKind, kind) => fieldsOfKind("node", { canvasKind, kind }).map(field => field.key);
    expect(keys("machine", "participant")).not.toContain("connections");
    expect(keys("machine", "steps")).not.toContain("connections");
    expect(keys("flow", "state")).not.toContain("connections");
    expect(keys("machine", "state")).toContain("connections");
  });
});
