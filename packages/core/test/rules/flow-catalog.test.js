import { describe, expect, it } from "vitest";
import { check } from "../../src/index.js";
import { paymentsDoc } from "../helpers.js";
import { cleanDoc, problems, targets } from "./fixtures.js";

/** cleanDoc whose flow cnv_f gets extra nodes and edges. */
function flowWith(nodes, edges = {}) {
  const doc = cleanDoc();
  Object.assign(doc.canvases.cnv_f.nodes, nodes);
  Object.assign(doc.canvases.cnv_f.edges, edges);
  return doc;
}

describe("flow rules", () => {
  it("flow.start: exactly one start", () => {
    const doc = flowWith({ nod_start2: { kind: "start" } }, { edg_start2Tell: { from: "nod_start2", to: "nod_tell" } });
    expect(problems(doc, "flow.start").map(problem => [problem.target, problem.data])).toEqual([
      ["cnv_f", { nodes: ["nod_start", "nod_start2"] }]
    ]);
    expect(targets(cleanDoc(), "flow.start")).toEqual([]);
  });

  it("flow.deadEnd: every node but end and ref leads somewhere", () => {
    const doc = flowWith({ nod_stuck: { kind: "parallel" }, nod_see: { kind: "ref", target: "cnv_m" } });
    doc.canvases.cnv_f.edges.edg_tellStuck = { from: "nod_tell", to: "nod_stuck" };
    expect(targets(doc, "flow.deadEnd")).toEqual(["nod_stuck"]);
    expect(targets(cleanDoc(), "flow.deadEnd")).toEqual([]);
  });

  it("flow.unreachable: every node but ref is reachable from start", () => {
    const doc = flowWith({ nod_alone: { kind: "end" }, nod_see: { kind: "ref", target: "cnv_m" } });
    expect(targets(doc, "flow.unreachable")).toEqual(["nod_alone"]);
    expect(targets(cleanDoc(), "flow.unreachable")).toEqual([]);
  });

  it("flow.branches: if needs true and false; loops and subflows need a body", () => {
    const doc = flowWith(
      {
        nod_check: { kind: "if", condition: { text: "paid" } },
        nod_loop: { kind: "while", condition: { text: "more" } }
      },
      {
        edg_checkTell: { from: "nod_check", to: "nod_tell", kind: "true" },
        edg_loopEnd: { from: "nod_loop", to: "nod_end" }
      }
    );
    expect(problems(doc, "flow.branches").map(problem => [problem.target, problem.data])).toEqual([
      ["nod_check", { missing: ["false"] }],
      ["nod_loop", undefined]
    ]);
    doc.canvases.cnv_f.edges.edg_checkEnd = { from: "nod_check", to: "nod_end", kind: "false" };
    doc.canvases.cnv_f.nodes.nod_loop.inner = { canvas: "cnv_body" };
    doc.canvases.cnv_body = { kind: "flow", name: "Body", nodes: { nod_bodyStart: { kind: "start" } }, edges: {} };
    expect(targets(doc, "flow.branches")).toEqual([]);
  });

  it("flow.switchDefault: a switch should say where everything else goes", () => {
    const doc = flowWith(
      { nod_route: { kind: "switch", on: { var: "vars.kind" } } },
      { edg_routeEnd: { from: "nod_route", to: "nod_end", kind: "case", case: "a" } }
    );
    expect(targets(doc, "flow.switchDefault")).toEqual(["nod_route"]);
    doc.canvases.cnv_f.edges.edg_routeTell = { from: "nod_route", to: "nod_tell", kind: "default" };
    expect(targets(doc, "flow.switchDefault")).toEqual([]);
  });
});

describe("catalog rules", () => {
  it("event.name: names are unique", () => {
    const doc = cleanDoc();
    doc.catalog.events.evt_go2 = { name: "go", payload: null };
    doc.canvases.cnv_m.edges.edg_busyDone.on.push("evt_go2");
    expect(targets(doc, "event.name")).toEqual(["evt_go", "evt_go2"]);
    expect(targets(cleanDoc(), "event.name")).toEqual([]);
  });

  it("catalog.unused: items nobody references, self-references aside", () => {
    const doc = cleanDoc();
    doc.catalog.types.typ_tree = {
      kind: "object",
      name: "Tree",
      fields: [{ name: "children", type: "typ_tree", list: true }]
    };
    doc.catalog.parties.pty_ops = { kind: "operator", name: "Ops" };
    expect(targets(doc, "catalog.unused")).toEqual(["pty_ops", "typ_tree"]);
    doc.catalog.events.evt_go.payload = "typ_tree";
    doc.canvases.cnv_m.edges.edg_idleBusy.by = "pty_ops";
    expect(targets(doc, "catalog.unused")).toEqual([]);
  });

  it("spec.unspecified: absent behavioural fields, while explicit empties count as specified", () => {
    const doc = cleanDoc();
    delete doc.catalog.events.evt_go.payload;
    doc.catalog.timers.tmr_ttl = { name: "ttl" };
    doc.catalog.guards.grd_ready = { name: "ready" };
    expect(problems(doc, "spec.unspecified").map(problem => [problem.target, problem.data])).toEqual([
      ["evt_go", { fields: ["payload"] }],
      ["grd_ready", { fields: ["expr or description"] }],
      ["tmr_ttl", { fields: ["duration or at"] }]
    ]);
    expect(targets(cleanDoc(), "spec.unspecified")).toEqual([]);
  });

  it("confidence.low: elements that need verification", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_idleBusy.confidence = "low";
    doc.canvases.cnv_m.nodes.nod_busy.confidence = "medium";
    expect(problems(doc, "confidence.low").map(problem => [problem.target, problem.canvas])).toEqual([
      ["edg_idleBusy", "cnv_m"]
    ]);
  });

  it("expr.operator: operators outside standard JSON Logic, wherever expressions live", () => {
    const doc = cleanDoc();
    doc.catalog.guards.grd_ready = { name: "ready", expr: { and: [{ var: "context.ok" }, { regex: ["a", "b"] }] } };
    doc.canvases.cnv_m.edges.edg_idleBusy.guard = { guard: "grd_ready", expr: { "==": [{ var: "event.name" }, "go"] } };
    doc.canvases.cnv_m.edges.edg_busyDone.actions = [{ assign: { "context.total": { sum: [1, 2] } } }];
    expect(problems(doc, "expr.operator").map(problem => [problem.target, problem.data])).toEqual([
      ["edg_busyDone", { operator: "sum", path: "/canvases/cnv_m/edges/edg_busyDone/actions/0/assign/context.total" }],
      ["grd_ready", { operator: "regex", path: "/catalog/guards/grd_ready/expr/and/1" }]
    ]);
  });
});

describe("the payments example", () => {
  it("has no errors or warnings, only open detail", () => {
    const found = check(paymentsDoc());
    expect(found.filter(problem => problem.severity !== "incomplete")).toEqual([]);
    expect([...new Set(found.map(problem => problem.code))]).toEqual(["machine.stuck", "spec.unspecified"]);
  });
});
