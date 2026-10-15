import { describe, expect, it } from "vitest";

import { dressedAs, same, steadier } from "@/canvas/steady";

describe("parts that did not change keep their objects", () => {
  it("compares parts all the way down", () => {
    expect(same({ a: 1, b: [1, { c: "x" }] }, { a: 1, b: [1, { c: "x" }] })).toBe(true);
    expect(same({ a: 1, b: [1, { c: "x" }] }, { a: 1, b: [1, { c: "y" }] })).toBe(false);
    expect(same({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(same([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it("gives back the part shown before when it is the same, and the new one when it moved", () => {
    const steady = steadier();
    const first = steady([
      { id: "nod_steadyA", position: { x: 0, y: 0 }, data: { part: { svg: "<rect/>" } } },
      { id: "nod_steadyB", position: { x: 200, y: 0 }, data: { part: { svg: "<rect/>" } } }
    ]);
    const next = steady([
      { id: "nod_steadyA", position: { x: 0, y: 0 }, data: { part: { svg: "<rect/>" } } },
      { id: "nod_steadyB", position: { x: 210, y: 0 }, data: { part: { svg: "<rect/>" } } }
    ]);
    expect(next[0]).toBe(first[0]);
    expect(next[1]).not.toBe(first[1]);
    expect(steady([{ ...next[1] }])[0]).toBe(next[1]);
  });

  it("keeps only the parts it gave back last, so what was shown long ago is let go", () => {
    const steady = steadier();
    const box = { id: "nod_kept", position: { x: 0, y: 0 } };
    const [shown] = steady([box]);
    steady([{ id: "nod_elsewhere", position: { x: 0, y: 0 } }]);
    expect(steady([{ ...box }])[0]).not.toBe(shown);
    // Each keeps its own: the boxes' and the arrows' do not push each other out.
    const arrows = steadier();
    const [arrow] = arrows([{ id: "edg_kept", points: [1, 2] }]);
    steady([{ id: "nod_other" }]);
    expect(arrows([{ id: "edg_kept", points: [1, 2] }])[0]).toBe(arrow);
  });

  it("dresses a node once for each state it is shown in", () => {
    const node = { id: "nod_dressed" };
    let made = 0;
    const dress = () => ({ ...node, selected: true, made: ++made });
    const selected = dressedAs(node, "selected", dress);
    expect(dressedAs(node, "selected", dress)).toBe(selected);
    expect(dressedAs(node, "dragged", dress)).not.toBe(selected);
    expect(made).toBe(2);
  });
});
