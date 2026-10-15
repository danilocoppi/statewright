import { describe, expect, it } from "vitest";
import { applyBatch, check, computeHashes, parse, partOf, toAIPack, typedView } from "../../src/index.js";
import { toContract } from "../../src/contract/index.js";
import { createRuntime } from "../../src/runtime/index.js";
import { mixedDoc } from "../fixtures/mixed.js";
import { readExample } from "../helpers.js";

const order = () => parse(readExample("order-lifecycle.sttw")).doc;

describe("M5 review", () => {
  it("runs the shipped example in the runtime, checked and hashed as the document is", async () => {
    const doc = order();
    const { content } = await computeHashes(doc);
    const runtime = await createRuntime(doc, { expect: content });
    expect(runtime.content).toBe(content);
    expect((await toContract(doc)).contract.source.content).toBe(content);
  });

  it("runs a mixed level with no states left as a flow", () => {
    const doc = mixedDoc();
    for (const id of ["nod_open", "nod_paid", "nod_paidHere"]) delete doc.canvases.cnv_mixed.nodes[id];
    delete doc.canvases.cnv_mixed.edges.edg_init;
    delete doc.canvases.cnv_mixed.edges.edg_pay;
    expect(partOf(doc.canvases.cnv_mixed)).toBe("flow");
  });

  it("says a mixed level's transitions in the AI pack: triggers, guards, effects", () => {
    expect(toAIPack(order())).toMatch(
      /`edg_returnRefund` \| `nod_returnRequested` \| `nod_returnRefunded` \| on:evt_returnApproved/
    );
  });

  it("gives a mixed level regions", () => {
    const doc = mixedDoc();
    const { doc: next } = applyBatch(doc, [
      { type: "region.add", args: { canvas: "cnv_mixed", id: "rgn_a", name: "A" } }
    ]);
    expect(next.canvases.cnv_mixed.regions.rgn_a.name).toBe("A");
  });

  it("keeps a definition's kind with its body when the body is mixed", () => {
    const doc = mixedDoc();
    doc.canvases.cnv_part = {
      kind: "machine",
      name: "Part",
      nodes: { nod_pi: { kind: "initial" }, nod_ps: { kind: "state", name: "s" } },
      edges: { edg_p: { from: "nod_pi", to: "nod_ps" } }
    };
    doc.definitions.def_part = { kind: "machine", name: "Part", canvas: "cnv_part" };
    const { doc: next } = applyBatch(doc, [{ type: "canvas.mix", args: { id: "cnv_part" } }]);
    expect(next.definitions.def_part.kind).toBe("mixed");
    expect(check(next).filter(problem => problem.code === "ref.kind")).toEqual([]);
  });

  it("keeps a lifecycle's drivers when its machine is changed to mixed", async () => {
    const { associationsOf } = await import("../../src/index.js");
    const doc = order();
    const before = associationsOf(doc, "cnv_orderLifecycle")
      .filter(item => item.role === "drives")
      .map(item => item.id);
    const { doc: mixed } = applyBatch(doc, [{ type: "canvas.mix", args: { id: "cnv_order" } }]);
    const after = associationsOf(mixed, "cnv_orderLifecycle")
      .filter(item => item.role === "drives")
      .map(item => item.id);
    expect(before.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });

  it("reports a mixed level's connection whose ends say it is something else", () => {
    const doc = mixedDoc();
    doc.canvases.cnv_mixed.edges.edg_init = { from: "nod_init", to: "nod_open" };
    expect(check(doc).some(problem => problem.code === "edge.mixed" && problem.target === "edg_init")).toBe(true);
    expect(check(typedView(mixedDoc()) && mixedDoc()).some(problem => problem.code === "edge.mixed")).toBe(false);
  });

  it("counts a mixed level on the documentation's cover", async () => {
    const { toDocumentPage } = await import("../../src/render/index.js");
    expect(await toDocumentPage(order())).toContain("1 mixed");
  });
});
