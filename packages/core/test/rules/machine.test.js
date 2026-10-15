import { describe, expect, it } from "vitest";
import { cleanDoc, problems, targets } from "./fixtures.js";

/** cleanDoc with two regions on cnv_m: "main" (the existing nodes) and "side" (initial → waiting). */
function withRegions() {
  const doc = cleanDoc();
  const machine = doc.canvases.cnv_m;
  machine.regions = { rgn_main: { name: "main" }, rgn_side: { name: "side" } };
  for (const node of Object.values(machine.nodes)) node.region = "rgn_main";
  machine.nodes.nod_sideInit = { kind: "initial", region: "rgn_side" };
  machine.nodes.nod_waiting = { kind: "state", name: "waiting", region: "rgn_side", terminal: true };
  machine.edges.edg_sideInitWaiting = { from: "nod_sideInit", to: "nod_waiting" };
  return doc;
}

describe("machine.region", () => {
  it("requires a region on canvases with regions and forbids it on canvases without", () => {
    const doc = withRegions();
    delete doc.canvases.cnv_m.nodes.nod_idle.region;
    expect(targets(doc, "machine.region")).toEqual(["nod_idle"]);
    const plain = cleanDoc();
    plain.canvases.cnv_m.nodes.nod_idle.region = "rgn_main";
    expect(targets(plain, "machine.region")).toEqual(["nod_idle"]);
  });

  it("accepts consistent regions", () => {
    expect(targets(withRegions(), "machine.region")).toEqual([]);
  });
});

describe("machine.noStart", () => {
  it("reports a region without initial or entry, with the severity of the canvas level", () => {
    const doc = withRegions();
    delete doc.canvases.cnv_m.nodes.nod_sideInit;
    delete doc.canvases.cnv_m.edges.edg_sideInitWaiting;
    expect(problems(doc, "machine.noStart").map(problem => [problem.target, problem.severity])).toEqual([
      ["rgn_side", "error"]
    ]);
    doc.canvases.cnv_m.transitions = "partial";
    expect(problems(doc, "machine.noStart")[0].severity).toBe("incomplete");
    doc.canvases.cnv_m.transitions = "unknown";
    expect(targets(doc, "machine.noStart")).toEqual([]);
  });

  it("accepts an entry instead of an initial node", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_init = { kind: "entry", name: "POST /machines" };
    expect(targets(doc, "machine.noStart")).toEqual([]);
  });
});

describe("machine.multipleInitial / machine.initialEdge", () => {
  it("reports two initial nodes in one region", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_init2 = { kind: "initial" };
    doc.canvases.cnv_m.edges.edg_init2Idle = { from: "nod_init2", to: "nod_idle" };
    expect(problems(doc, "machine.multipleInitial").map(problem => [problem.target, problem.data])).toEqual([
      ["cnv_m", { nodes: ["nod_init", "nod_init2"] }]
    ]);
  });

  it("reports an initial node without exactly one transition, or whose transition has a trigger", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_initBusy = { from: "nod_init", to: "nod_busy" };
    expect(targets(doc, "machine.initialEdge")).toEqual(["nod_init"]);
    delete doc.canvases.cnv_m.edges.edg_initBusy;
    doc.canvases.cnv_m.edges.edg_initIdle.on = ["evt_go"];
    expect(targets(doc, "machine.initialEdge")).toEqual(["edg_initIdle"]);
  });

  it("accepts one initial with one triggerless transition", () => {
    const doc = cleanDoc();
    expect([...targets(doc, "machine.multipleInitial"), ...targets(doc, "machine.initialEdge")]).toEqual([]);
  });
});

describe("machine.unreachable", () => {
  it("reports states no path reaches", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_lost = { kind: "state", name: "lost", terminal: true };
    expect(targets(doc, "machine.unreachable")).toEqual(["nod_lost"]);
  });

  it("follows transitions from any nodes", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_lost = { kind: "state", name: "lost", terminal: true };
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any" };
    doc.canvases.cnv_m.edges.edg_anyLost = { from: "nod_any", to: "nod_lost", on: ["evt_stop"] };
    expect(targets(doc, "machine.unreachable")).toEqual([]);
  });
});

describe("machine.stuck", () => {
  it("reports a non-terminal state without a way out", () => {
    const doc = cleanDoc();
    delete doc.canvases.cnv_m.nodes.nod_done.terminal;
    expect(problems(doc, "machine.stuck").map(problem => [problem.target, problem.severity])).toEqual([
      ["nod_done", "error"]
    ]);
  });

  it("counts any transitions and the enclosing state's transitions as ways out", () => {
    const doc = cleanDoc();
    delete doc.canvases.cnv_m.nodes.nod_done.terminal;
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any" };
    doc.canvases.cnv_m.edges.edg_anyIdle = { from: "nod_any", to: "nod_idle", on: ["evt_go"] };
    expect(targets(doc, "machine.stuck")).toEqual([]);

    const nested = cleanDoc();
    nested.canvases.cnv_m.nodes.nod_busy.inner = { canvas: "cnv_sub" };
    nested.canvases.cnv_sub = {
      kind: "machine",
      name: "Sub",
      transitions: "complete",
      nodes: { nod_subInit: { kind: "initial" }, nod_working: { kind: "state", name: "working" } },
      edges: { edg_subInitWorking: { from: "nod_subInit", to: "nod_working" } }
    };
    expect(targets(nested, "machine.stuck")).toEqual([]);
  });
});

describe("machine.terminalWithExits", () => {
  it("reports a terminal state with outgoing transitions", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_doneIdle = { from: "nod_done", to: "nod_idle", on: ["evt_go"] };
    expect(problems(doc, "machine.terminalWithExits").map(problem => [problem.target, problem.data])).toEqual([
      ["nod_done", { edges: ["edg_doneIdle"] }]
    ]);
  });

  it("allows a final-coloured state with exits when it is not terminal", () => {
    const doc = cleanDoc();
    delete doc.canvases.cnv_m.nodes.nod_done.terminal;
    doc.canvases.cnv_m.edges.edg_doneIdle = { from: "nod_done", to: "nod_idle", on: ["evt_go"] };
    expect(targets(doc, "machine.terminalWithExits")).toEqual([]);
  });
});

describe("machine.ambiguous", () => {
  it("reports two transitions on the same trigger that no guard tells apart", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_idleDone = { from: "nod_idle", to: "nod_done", on: ["evt_go"] };
    expect(problems(doc, "machine.ambiguous").map(problem => [problem.target, problem.data])).toEqual([
      ["nod_idle", { trigger: "on:evt_go", edges: ["edg_idleBusy", "edg_idleDone"] }]
    ]);
  });

  it("treats any transitions as the state's own", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any" };
    doc.canvases.cnv_m.edges.edg_anyDone = { from: "nod_any", to: "nod_done", on: ["evt_go"] };
    expect(targets(doc, "machine.ambiguous")).toEqual(["nod_idle"]);
    doc.canvases.cnv_m.nodes.nod_any.except = ["nod_idle"];
    expect(targets(doc, "machine.ambiguous")).toEqual([]);
  });

  it("accepts transitions told apart by guards or validity periods", () => {
    const doc = cleanDoc();
    doc.catalog.guards.grd_ready = { name: "ready", description: "Ready to go" };
    doc.canvases.cnv_m.edges.edg_idleDone = {
      from: "nod_idle",
      to: "nod_done",
      on: ["evt_go"],
      guard: { guard: "grd_ready" }
    };
    expect(targets(doc, "machine.ambiguous")).toEqual([]);
    doc.canvases.cnv_m.edges.edg_idleDone = {
      from: "nod_idle",
      to: "nod_done",
      on: ["evt_go"],
      effective: { from: "2027-01-01" }
    };
    expect(targets(doc, "machine.ambiguous")).toEqual([]);
  });
});

describe("machine.crossRegion", () => {
  it("reports a transition between regions", () => {
    const doc = withRegions();
    doc.canvases.cnv_m.edges.edg_idleWaiting = { from: "nod_idle", to: "nod_waiting", on: ["evt_stop"] };
    expect(targets(doc, "machine.crossRegion")).toEqual(["edg_idleWaiting"]);
  });

  it("accepts transitions inside a region", () => {
    expect(targets(withRegions(), "machine.crossRegion")).toEqual([]);
  });
});

describe("choice.else", () => {
  const withChoice = () => {
    const doc = cleanDoc();
    doc.catalog.guards.grd_ready = { name: "ready", description: "Ready to go" };
    const machine = doc.canvases.cnv_m;
    machine.nodes.nod_pick = { kind: "choice" };
    machine.edges.edg_idleBusy.to = "nod_pick";
    machine.edges.edg_pickBusy = { from: "nod_pick", to: "nod_busy", guard: { guard: "grd_ready" } };
    machine.edges.edg_pickDone = { from: "nod_pick", to: "nod_done", else: true };
    return doc;
  };

  it("reports a choice without exactly one else, and branches with triggers", () => {
    const doc = withChoice();
    delete doc.canvases.cnv_m.edges.edg_pickDone.else;
    doc.canvases.cnv_m.edges.edg_pickBusy.on = ["evt_go"];
    expect(targets(doc, "choice.else")).toEqual(["edg_pickBusy", "nod_pick"]);
  });

  it("accepts guarded branches with one else", () => {
    expect(targets(withChoice(), "choice.else")).toEqual([]);
  });
});

describe("transition.noTrigger", () => {
  it("reports transitions out of states without any trigger, including explicitly empty ones", () => {
    const doc = cleanDoc();
    delete doc.canvases.cnv_m.edges.edg_idleBusy.on;
    doc.canvases.cnv_m.edges.edg_busyDone.on = [];
    expect(problems(doc, "transition.noTrigger").map(problem => [problem.target, problem.severity])).toEqual([
      ["edg_busyDone", "incomplete"],
      ["edg_idleBusy", "incomplete"]
    ]);
  });

  it("accepts any trigger kind", () => {
    const doc = cleanDoc();
    doc.catalog.timers.tmr_ttl = { name: "ttl", duration: "PT1H" };
    doc.canvases.cnv_m.edges.edg_idleBusy = { from: "nod_idle", to: "nod_busy", after: "tmr_ttl" };
    doc.canvases.cnv_m.edges.edg_busyDone = { from: "nod_busy", to: "nod_done", always: true };
    expect(targets(doc, "transition.noTrigger")).toEqual([]);
  });
});

describe("history.outsideCompound", () => {
  it("warns about history nodes in a machine no state contains", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_back = { kind: "history" };
    expect(targets(doc, "history.outsideCompound")).toEqual(["nod_back"]);
  });

  it("accepts history nodes inside a state's interior", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_busy.inner = { canvas: "cnv_sub" };
    doc.canvases.cnv_sub = {
      kind: "machine",
      name: "Sub",
      transitions: "unknown",
      nodes: { nod_back: { kind: "history" } },
      edges: {}
    };
    expect(targets(doc, "history.outsideCompound")).toEqual([]);
  });
});

describe("edge.link / edge.target", () => {
  it("requires links exactly where a ref node is touched", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.nodes.nod_toRoot = { kind: "ref", target: "cnv_root" };
    doc.canvases.cnv_m.edges.edg_busyToRoot = { from: "nod_busy", to: "nod_toRoot" };
    doc.canvases.cnv_m.edges.edg_idleBusy.kind = "link";
    expect(targets(doc, "edge.link")).toEqual(["edg_busyToRoot", "edg_idleBusy"]);
    doc.canvases.cnv_m.edges.edg_busyToRoot.kind = "link";
    delete doc.canvases.cnv_m.edges.edg_idleBusy.kind;
    expect(targets(doc, "edge.link")).toEqual([]);
  });

  it("forbids edges into initial, entry and any nodes", () => {
    const doc = cleanDoc();
    doc.canvases.cnv_m.edges.edg_busyInit = { from: "nod_busy", to: "nod_init", on: ["evt_go"] };
    expect(targets(doc, "edge.target")).toEqual(["edg_busyInit"]);
    expect(targets(cleanDoc(), "edge.target")).toEqual([]);
  });
});
