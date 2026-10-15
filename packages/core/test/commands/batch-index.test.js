import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/engine.js";
import { createDocument } from "../../src/create.js";
import { buildIndex } from "../../src/query/build-index.js";
import { collectRefs } from "../../src/query/refs.js";
import { produce } from "immer";

/** `levels` machines of `states` states, each inside a service of the root (performance spec §2). */
function manyLevels(levels, states) {
  const doc = createDocument({ name: "Many levels" });
  doc.catalog.events = { evt_next: { name: "go.next" } };
  const root = doc.canvases[doc.root];
  for (let level = 0; level < levels; level += 1) {
    const canvas = `cnv_lvl${level}`;
    root.nodes[`nod_svc${level}`] = { kind: "service", name: `svc ${level}`, inner: { canvas } };
    const nodes = { [`nod_l${level}init`]: { kind: "initial" } };
    const edges = { [`edg_l${level}init`]: { from: `nod_l${level}init`, to: `nod_l${level}s0` } };
    for (let index = 0; index < states; index += 1) {
      nodes[`nod_l${level}s${index}`] = { kind: "state", name: `s${index}` };
      edges[`edg_l${level}n${index}`] = {
        from: `nod_l${level}s${index}`,
        to: `nod_l${level}s${(index + 1) % states}`,
        on: ["evt_next"]
      };
    }
    doc.canvases[canvas] = { kind: "machine", name: `Machine ${level}`, nodes, edges };
  }
  return applyBatch(doc, []).doc;
}

describe("a batch's own index (performance spec §3 P1)", () => {
  it("sees what earlier commands of the batch made", () => {
    const doc = createDocument({ name: "Paste" });
    const { doc: next } = applyBatch(doc, [
      { type: "node.add", args: { canvas: doc.root, id: "nod_box", node: { kind: "service", name: "Box" } } },
      { type: "canvas.create", args: { id: "cnv_inside", kind: "machine", name: "Inside", owner: "nod_box" } },
      { type: "node.add", args: { canvas: "cnv_inside", id: "nod_a", node: { kind: "state", name: "a" } } },
      { type: "node.add", args: { canvas: "cnv_inside", id: "nod_b", node: { kind: "state", name: "b" } } },
      { type: "edge.add", args: { canvas: "cnv_inside", id: "edg_ab", edge: { from: "nod_a", to: "nod_b" } } },
      { type: "node.update", args: { id: "nod_b", set: { name: "bee" } } }
    ]);
    expect(next.canvases.cnv_inside.edges.edg_ab).toEqual({ from: "nod_a", to: "nod_b" });
    expect(next.canvases.cnv_inside.nodes.nod_b.name).toBe("bee");
  });

  it("writes through an element it found, into the new document", () => {
    const doc = createDocument({ name: "Extract" });
    const { doc: next } = applyBatch(doc, [
      { type: "node.add", args: { canvas: doc.root, id: "nod_box", node: { kind: "service", name: "Box" } } },
      { type: "canvas.create", args: { id: "cnv_inside", kind: "flow", name: "Inside", owner: "nod_box" } },
      { type: "definition.extract", args: { owner: "nod_box", name: "Reused", id: "def_reused" } },
      { type: "node.update", args: { id: "nod_box", set: { name: "Renamed" } } }
    ]);
    expect(next.canvases[doc.root].nodes.nod_box).toMatchObject({
      name: "Renamed",
      inner: { definition: "def_reused" }
    });
    expect(Object.isFrozen(next.canvases[doc.root].nodes.nod_box)).toBe(true);
  });

  it("leaves the document untouched when a later command fails, naming it", () => {
    const doc = createDocument({ name: "Fails" });
    let error;
    try {
      applyBatch(doc, [
        { type: "node.add", args: { canvas: doc.root, id: "nod_a", node: { kind: "service", name: "A" } } },
        { type: "node.update", args: { id: "nod_a", set: { name: "AA" } } },
        { type: "node.update", args: { id: "nod_missing", set: { name: "x" } } }
      ]);
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: "NOT_FOUND", index: 2 });
    expect(doc.canvases[doc.root].nodes).toEqual({});
  });

  it("removes ten boxes of a 30-level document in one batch quickly", () => {
    const doc = manyLevels(30, 100);
    // Warmed up first, as a person's first edits warm the page.
    applyBatch(
      doc,
      Array.from({ length: 10 }, (_, index) => ({
        type: "node.remove",
        args: { id: `nod_l1s${index}`, cascade: true }
      }))
    );
    const start = performance.now();
    const { doc: next } = applyBatch(
      doc,
      Array.from({ length: 10 }, (_, index) => ({
        type: "node.remove",
        args: { id: `nod_l0s${index}`, cascade: true }
      }))
    );
    const elapsed = performance.now() - start;
    expect(next.canvases.cnv_lvl0.nodes.nod_l0s3).toBeUndefined();
    expect(next.canvases.cnv_lvl0.edges.edg_l0n3).toBeUndefined();
    expect(elapsed).toBeLessThan(150);
  });

  it("moves a hundred boxes of a 30-level document in one batch quickly", () => {
    const doc = manyLevels(30, 100);
    applyBatch(doc, [{ type: "layout.node.set", args: { canvas: "cnv_lvl1", id: "nod_l1s1", x: 1, y: 1 } }]);
    const start = performance.now();
    applyBatch(
      doc,
      Array.from({ length: 100 }, (_, index) => ({
        type: "layout.node.set",
        args: { canvas: "cnv_lvl0", id: `nod_l0s${index}`, x: index, y: 0 }
      }))
    );
    expect(performance.now() - start).toBeLessThan(150);
  });
});

describe("indexes and references kept per document", () => {
  it("are the same for the same frozen document, and new for another", () => {
    const doc = manyLevels(2, 5);
    expect(buildIndex(doc)).toBe(buildIndex(doc));
    expect(collectRefs(doc)).toBe(collectRefs(doc));
    const next = applyBatch(doc, [{ type: "node.update", args: { id: "nod_l0s1", set: { name: "x" } } }]).doc;
    expect(buildIndex(next)).not.toBe(buildIndex(doc));
    expect(buildIndex(next).get("nod_l0s1").value.name).toBe("x");
  });

  it("are never kept for a document that can still change", () => {
    const doc = structuredClone(manyLevels(1, 3));
    const first = buildIndex(doc);
    doc.canvases.cnv_lvl0.nodes.nod_l0s9 = { kind: "state", name: "late" };
    expect(buildIndex(doc)).not.toBe(first);
    expect(buildIndex(doc).has("nod_l0s9")).toBe(true);
    produce(manyLevels(1, 3), draft => {
      expect(buildIndex(draft)).not.toBe(buildIndex(draft));
    });
  });
});
