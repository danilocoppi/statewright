import { describe, expect, it } from "vitest";
import { associationsOf, check, partOf, stepText, toMarkdown, typedView } from "../../src/index.js";
import { toContract } from "../../src/contract/index.js";
import { createStyle } from "../../src/style/index.js";
import { start, step } from "../../src/simulate/index.js";
import { mixedDoc } from "../fixtures/mixed.js";

const AT = "2026-01-05T09:00:00Z";

describe("a mixed level, seen as the typed level its executable part is (mixed levels spec §4.5)", () => {
  it("is a machine when it has states, its IDs kept, its other elements set aside", () => {
    const view = typedView(mixedDoc()).canvases.cnv_mixed;
    expect(partOf(mixedDoc().canvases.cnv_mixed)).toBe("machine");
    expect(view.kind).toBe("machine");
    expect(Object.keys(view.nodes).sort()).toEqual(["nod_customer", "nod_init", "nod_open", "nod_paid"]);
    expect(view.edges.edg_pay).toEqual({ from: "nod_open", to: "nod_paid", on: ["evt_pay"] });
    expect(view.edges.edg_s1).toBeUndefined();
  });

  it("is a flow when it has steps and no states, and a system when it has neither", () => {
    let doc = mixedDoc();
    for (const id of ["nod_init", "nod_open", "nod_paid", "nod_customer", "nod_paidHere"]) {
      delete doc.canvases.cnv_mixed.nodes[id];
    }
    delete doc.canvases.cnv_mixed.edges.edg_init;
    delete doc.canvases.cnv_mixed.edges.edg_pay;
    expect(typedView(doc).canvases.cnv_mixed.kind).toBe("flow");
    // Documents are not changed in place (they are frozen): a changed one is another object.
    doc = structuredClone(doc);
    for (const id of ["nod_start", "nod_call", "nod_end"]) delete doc.canvases.cnv_mixed.nodes[id];
    delete doc.canvases.cnv_mixed.edges.edg_s1;
    delete doc.canvases.cnv_mixed.edges.edg_s2;
    expect(typedView(doc).canvases.cnv_mixed.kind).toBe("system");
  });

  it("leaves a document without mixed levels as it is", () => {
    const doc = mixedDoc();
    delete doc.canvases.cnv_mixed;
    delete doc.canvases.cnv_root.nodes.nod_shop.inner;
    expect(typedView(doc)).toBe(doc);
  });

  it("runs as its machine in the simulator", () => {
    const doc = mixedDoc();
    const begun = start(doc, { canvas: "cnv_mixed", at: AT });
    expect(begun.status).toBe("done");
    expect(begun.session.active).toEqual(["nod_open"]);
    expect(step(doc, begun.session, { do: { event: "evt_pay" } }).session.active).toEqual(["nod_paid"]);
  });

  it("is judged by the machine rules, and lists in the contract among machines", async () => {
    const doc = mixedDoc();
    doc.canvases.cnv_mixed.nodes.nod_lost = { kind: "state", name: "lost" };
    expect(check(doc).some(problem => problem.code === "machine.unreachable" && problem.target === "nod_lost")).toBe(
      true
    );
    const { contract } = await toContract(mixedDoc());
    expect(contract.machines.map(machine => machine.id)).toContain("cnv_mixed");
  });

  it("draws a state as a state, a call as a step, a box as a box, and a connection by what it is", () => {
    const style = createStyle(mixedDoc());
    expect(style.node("nod_open").key).toBe("state.plain");
    expect(style.node("nod_call").key).toBe("step.plain");
    expect(style.node("nod_db").key).toBe("node.store");
    expect(style.edgeLabel("edg_pay")).toBe("order.pay");
    expect(style.edgeLabel("edg_db")).toBe("order.pay");
    expect(stepText(mixedDoc(), mixedDoc().canvases.cnv_mixed.nodes.nod_call)).toBe("POST /pay");
  });

  it("lets a system's box with a party send a transition, as a participant does", () => {
    const doc = mixedDoc();
    doc.canvases.cnv_mixed.edges.edg_pay.by = "pty_customer";
    expect(associationsOf(doc, "cnv_mixed").map(item => item.id)).toEqual(
      expect.arrayContaining(
        ["sends:nod_customer:edg_pay", "sends:nod_web:edg_pay", "leadsTo:nod_call:nod_paidHere"].slice(0, 2)
      )
    );
  });

  it("documents a mixed level: its elements with their kinds, its connections with what they are", () => {
    const markdown = toMarkdown(mixedDoc());
    expect(markdown).toContain("Shop floor");
    expect(markdown).toMatch(/\| open \| state \|/);
    expect(markdown).toMatch(/\| Web \| service \|/);
  });
});

describe("drawing roles on a mixed level", () => {
  it("a system's box with a party onto a transition sends it; a call onto a participant is performed by it", async () => {
    const { associate, applyBatch } = await import("../../src/index.js");
    const doc = mixedDoc();
    const sends = associate(doc, "cnv_mixed", "nod_web", "edg_pay");
    expect(sends.role).toBe("sends");
    expect(applyBatch(doc, sends.commands).doc.canvases.cnv_mixed.edges.edg_pay.by).toBe("pty_customer");
    const performs = associate(doc, "cnv_mixed", "nod_call", "nod_customer");
    expect(performs.role).toBe("performs");
    expect(associate(doc, "cnv_mixed", "nod_open", "nod_call")).toEqual({ refusal: "noMeaning" });
  });
});
