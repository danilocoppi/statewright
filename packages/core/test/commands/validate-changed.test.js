import { enablePatches, produceWithPatches } from "immer";
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/engine.js";
import { documentSchema } from "../../src/schema/document.js";
import { validateChanged } from "../../src/schema/narrow.js";
import { flattenIssues } from "../../src/serialize/parse.js";
import { paymentsDoc } from "../helpers.js";

enablePatches();

const valid = applyBatch(paymentsDoc(), [
  { type: "layout.node.set", args: { canvas: "cnv_expiryClock", id: "nod_running", x: 10, y: 20 } }
]).doc;

/** The document after `change`, with its patches; and what full validation says of it. */
function changed(change) {
  const [doc, patches] = produceWithPatches(valid, change);
  const full = documentSchema.safeParse(doc);
  return { doc, patches, full: full.success ? [] : flattenIssues(full.error.issues) };
}

const sorted = errors => [...errors].sort((a, b) => `${a.path}${a.message}`.localeCompare(`${b.path}${b.message}`));

describe("a batch validates what it changed (performance spec §3 P1)", () => {
  it.each([
    ["the project", draft => void (draft.project.name = "")],
    ["an unknown key on the project", draft => void (draft.project.nickname = "x")],
    ["a catalog item", draft => void (draft.catalog.events.evt_expiryElapsed.name = 7)],
    ["a new catalog item under a bad ID", draft => void (draft.catalog.events.event1 = { name: "x" })],
    ["a node", draft => void (draft.canvases.cnv_expiryClock.nodes.nod_running.kind = "planet")],
    [
      "an edge's list",
      draft =>
        void Object.values(draft.canvases.cnv_expiryClock.edges)
          .find(edge => edge.on)
          .on.push(42)
    ],
    ["a whole canvas", draft => void (draft.canvases.cnv_new = { kind: "machine", name: "", nodes: {}, edges: {} })],
    ["a definition", draft => void (draft.definitions.def_x = { kind: "wizard", name: "x", canvas: "cnv_lifecycle" })],
    ["the focus list", draft => void (draft.annotations.focus = ["not an id"])],
    ["a note", draft => void (draft.annotations.notes = { nte_x: { canvas: "cnv_lifecycle" } })],
    ["a node's place", draft => void (draft.layout.canvases.cnv_expiryClock.nodes.nod_running.x = 1.5)],
    ["the legend", draft => void (draft.layout.legend = { labels: { bad: "" } })],
    ["the format", draft => void (draft.statewright = "0.9")]
  ])("reports %s as full validation does", (_, change) => {
    const { doc, patches, full } = changed(change);
    expect(full.length).toBeGreaterThan(0);
    expect(sorted(validateChanged(doc, patches))).toEqual(sorted(full));
  });

  it("says nothing of a valid change, nor of what was removed", () => {
    const { doc, patches } = changed(draft => {
      draft.canvases.cnv_expiryClock.nodes.nod_running.name = "running!";
      delete draft.layout.canvases.cnv_expiryClock.nodes.nod_running;
    });
    expect(validateChanged(doc, patches)).toEqual([]);
  });

  it("does not look at parts the batch left alone", () => {
    // An invalid part already there (documents are valid on entry; this one is not) is not reported again.
    const broken = structuredClone(valid);
    broken.canvases.cnv_lifecycle.name = "";
    // (the batch below touches only the project)
    const [doc, patches] = produceWithPatches(Object.freeze(broken), draft => {
      draft.project.name = "Renamed";
    });
    expect(validateChanged(doc, patches)).toEqual([]);
  });

  it("refuses a batch that leaves the document invalid, with full validation's details", () => {
    let error;
    try {
      applyBatch(valid, [{ type: "canvas.update", args: { id: "cnv_lifecycle", set: { transitions: "most" } } }]);
    } catch (caught) {
      error = caught;
    }
    expect(error?.code).toMatch(/SCHEMA|INVALID_ARGS/);
  });
});
