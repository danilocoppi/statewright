import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { lockedBy } from "@/locks/locked";
import { diffOf } from "@/proposals/diff";

import { readExample } from "../fixtures.js";

const locked = (...targets) =>
  applyBatch(
    readExample("payments"),
    targets.map(target => ({ type: "lock.add", args: { target } }))
  ).doc;

describe("what a batch touches that is locked (collaboration spec §8.2)", () => {
  it("names a locked element it changes or removes", () => {
    const doc = locked("nod_paused");
    expect(
      lockedBy(doc, diffOf(doc, [{ type: "node.update", args: { id: "nod_paused", set: { name: "x" } } }]))
    ).toEqual([{ id: "nod_paused", name: "x" }]);
    expect(
      lockedBy(doc, diffOf(doc, [{ type: "node.update", args: { id: "nod_running", set: { name: "x" } } }]))
    ).toEqual([]);
  });

  it("names anything added, changed or removed on a locked level", () => {
    const doc = locked("cnv_expiryClock");
    const added = diffOf(doc, [
      { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } }
    ]);
    expect(lockedBy(doc, added).map(item => item.id)).toEqual(["nod_late"]);
    const elsewhere = diffOf(doc, [{ type: "node.update", args: { id: "nod_complianceHold", set: { name: "x" } } }]);
    expect(lockedBy(doc, elsewhere)).toEqual([]);
  });

  it("holds the locks themselves: removing or changing one is held", () => {
    const doc = locked("nod_paused");
    const [lock] = Object.keys(doc.annotations.locks);
    expect(lockedBy(doc, diffOf(doc, [{ type: "lock.remove", args: { id: lock } }])).map(item => item.id)).toEqual([
      lock
    ]);
  });

  it("holds what stands in a locked region", () => {
    const doc = locked("rgn_compliance");
    const inside = Object.entries(doc.canvases.cnv_lifecycle.nodes).find(
      ([, node]) => node.region === "rgn_compliance"
    )[0];
    const diff = diffOf(doc, [{ type: "node.update", args: { id: inside, set: { name: "x" } } }]);
    expect(lockedBy(doc, diff).map(item => item.id)).toEqual([inside]);
  });

  it("holds a move on a locked level", () => {
    const doc = locked("cnv_expiryClock");
    const diff = diffOf(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_expiryClock", id: "nod_paused", x: 10, y: 20 } }
    ]);
    expect(lockedBy(doc, diff).map(item => item.id)).toEqual(["nod_paused"]);
  });
});
