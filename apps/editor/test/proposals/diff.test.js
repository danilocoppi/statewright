import { describe, expect, it } from "vitest";

import { diffOf, removes, summaryOf } from "@/proposals/diff";

import { readExample } from "../fixtures.js";

const ids = list => list.map(item => item.id).sort();

describe("the difference a batch makes (collaboration spec §7)", () => {
  it("names what it adds, with their levels, and changes nothing yet", () => {
    const doc = readExample("payments");
    const diff = diffOf(doc, [
      { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } },
      { type: "edge.add", args: { canvas: "cnv_expiryClock", id: "edg_runningLate", edge: { from: "nod_running", to: "nod_late" } } }
    ]);
    expect(diff.ok).toBe(true);
    expect(diff.added).toEqual([
      { id: "nod_late", name: "late", kind: "state", level: "cnv_expiryClock" },
      expect.objectContaining({ id: "edg_runningLate", level: "cnv_expiryClock" })
    ]);
    expect(diff.removed).toEqual([]);
    expect(diff.levels).toEqual(["cnv_expiryClock"]);
    expect(diff.preview.canvases.cnv_expiryClock.nodes.nod_late).toBeTruthy();
    expect(doc.canvases.cnv_expiryClock.nodes.nod_late).toBeUndefined();
    expect(summaryOf(diff)).toEqual({ added: 2, removed: 0, changed: 0, levels: 1 });
  });

  it("names what it removes, the transitions that go with a state included", () => {
    const doc = readExample("payments");
    const diff = diffOf(doc, [{ type: "node.remove", args: { id: "nod_elapsed" } }]);
    expect(ids(diff.removed)).toContain("nod_elapsed");
    expect(diff.removed.some(item => item.id.startsWith("edg_"))).toBe(true);
    expect(removes(diff)).toBe(true);
  });

  it("names each field it changes, before and after", () => {
    const doc = readExample("payments");
    const diff = diffOf(doc, [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }]);
    expect(diff.changed).toEqual([
      {
        id: "nod_paused",
        name: "on hold",
        kind: "state",
        level: "cnv_expiryClock",
        fields: [{ path: "name", before: "paused", after: "on hold" }]
      }
    ]);
    expect(removes(diff)).toBe(false);
  });

  it("counts a move as no change of meaning, and nothing removed", () => {
    const doc = readExample("payments");
    const diff = diffOf(doc, [{ type: "layout.node.set", args: { canvas: "cnv_expiryClock", id: "nod_paused", x: 10, y: 20 } }]);
    expect(diff).toMatchObject({ ok: true, added: [], removed: [], changed: [] });
    expect(removes(diff)).toBe(false);
  });

  it("says why a batch Core refuses cannot be proposed", () => {
    const doc = readExample("payments");
    expect(diffOf(doc, [{ type: "node.remove", args: { id: "nod_nothing" } }])).toMatchObject({
      ok: false,
      error: { code: expect.any(String) }
    });
  });
});
