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

/** cleanDoc with an entry on cnv_m (its own fields `entry`) and these extra edges. */
function withEntry(edges = {}, entry = {}) {
  const doc = cleanDoc();
  doc.catalog.guards.grd_ready = { name: "ready", description: "Ready to go" };
  doc.canvases.cnv_m.nodes.nod_entry = { kind: "entry", name: "POST /machines", ...entry };
  Object.assign(doc.canvases.cnv_m.edges, edges);
  return doc;
}

/** cleanDoc whose nod_idle takes evt_go by edg_one (to nod_busy) and edg_two (to nod_done), with these fields. */
function twoOnGo(one = {}, two = {}) {
  const doc = cleanDoc();
  doc.catalog.guards.grd_a = { name: "a", description: "Condition a" };
  doc.catalog.guards.grd_b = { name: "b", description: "Condition b" };
  doc.catalog.guards.grd_n = { name: "n is one", description: "n is one", expr: { "==": [{ var: "context.n" }, 1] } };
  const edges = doc.canvases.cnv_m.edges;
  delete edges.edg_idleBusy;
  edges.edg_one = { from: "nod_idle", to: "nod_busy", on: ["evt_go"], ...one };
  edges.edg_two = { from: "nod_idle", to: "nod_done", on: ["evt_go"], ...two };
  return doc;
}

/** cleanDoc whose nod_busy has the interior cnv_inner: initial → working, and working → paused on stop (with `inner`). */
function withInterior(inner = {}) {
  const doc = cleanDoc();
  doc.catalog.guards.grd_a = { name: "a", description: "Condition a" };
  doc.catalog.timers.tmr_t = { name: "t", duration: "PT1H" };
  doc.canvases.cnv_m.nodes.nod_busy.inner = { canvas: "cnv_inner" };
  doc.canvases.cnv_inner = {
    kind: "machine",
    name: "Inner",
    nodes: {
      nod_innerInit: { kind: "initial" },
      nod_working: { kind: "state", name: "working" },
      nod_paused: { kind: "state", name: "paused" }
    },
    edges: {
      edg_innerInitWorking: { from: "nod_innerInit", to: "nod_working" },
      edg_workingPaused: { from: "nod_working", to: "nod_paused", on: ["evt_stop"], ...inner }
    }
  };
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

describe("machine.entryEdge", () => {
  it("reports an entry without exactly one transition: none, or two", () => {
    expect(targets(withEntry(), "machine.entryEdge")).toEqual(["nod_entry"]);
    const two = withEntry({
      edg_entryIdle: { from: "nod_entry", to: "nod_idle" },
      edg_entryBusy: { from: "nod_entry", to: "nod_busy" }
    });
    expect(problems(two, "machine.entryEdge").map(p => [p.target, p.severity])).toEqual([["nod_entry", "error"]]);
  });
  it("reports the transition of an entry that has a trigger", () => {
    const doc = withEntry({ edg_entryIdle: { from: "nod_entry", to: "nod_idle", on: ["evt_go"] } });
    expect(targets(doc, "machine.entryEdge")).toEqual(["edg_entryIdle"]);
  });
  it("reports a guarded transition leaving an entry or an initial node: nothing judges it", () => {
    const doc = withEntry({ edg_entryIdle: { from: "nod_entry", to: "nod_idle", guard: { guard: "grd_ready" } } });
    doc.canvases.cnv_m.edges.edg_initIdle.guard = { text: "always" };
    expect(problems(doc, "machine.entryEdge").map(p => [p.target, p.severity])).toEqual([
      ["edg_entryIdle", "error"],
      ["edg_initIdle", "error"]
    ]);
  });
  it("reports a guarded transition leaving a history node, and accepts an unguarded one", () => {
    const doc = withInterior();
    doc.canvases.cnv_inner.nodes.nod_resume = { kind: "history" };
    doc.canvases.cnv_inner.edges.edg_resumeWorking = {
      from: "nod_resume",
      to: "nod_working",
      guard: { guard: "grd_a" }
    };
    expect(problems(doc, "machine.entryEdge").map(p => [p.target, p.severity])).toEqual([
      ["edg_resumeWorking", "error"]
    ]);
    delete doc.canvases.cnv_inner.edges.edg_resumeWorking.guard;
    expect(targets(doc, "machine.entryEdge")).toEqual([]);
  });
  it("accepts one untriggered, unguarded transition, and a guard on the entry itself", () => {
    const doc = withEntry({ edg_entryIdle: { from: "nod_entry", to: "nod_idle" } }, { guard: { guard: "grd_ready" } });
    expect(targets(doc, "machine.entryEdge")).toEqual([]);
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

describe("machine.timerSelfLoop", () => {
  const loop = (timer, fields = {}) => {
    const doc = cleanDoc();
    doc.catalog.timers.tmr_due = { name: "due", ...timer };
    doc.canvases.cnv_m.edges.edg_idleAgain = { from: "nod_idle", to: "nod_idle", after: "tmr_due", ...fields };
    return doc;
  };
  it("reports an external self-transition on a timer whose date comes from the context", () => {
    expect(
      problems(loop({ at: "context.dueAt" }), "machine.timerSelfLoop").map(p => [p.target, p.severity, p.data])
    ).toEqual([["edg_idleAgain", "error", { timer: "tmr_due" }]]);
    expect(targets(loop({ at: "context.dueAt", offset: "PT1H" }), "machine.timerSelfLoop")).toEqual(["edg_idleAgain"]);
  });
  it("accepts an internal one, and one on a duration", () => {
    expect(targets(loop({ at: "context.dueAt" }, { internal: true }), "machine.timerSelfLoop")).toEqual([]);
    expect(targets(loop({ duration: "PT1H" }), "machine.timerSelfLoop")).toEqual([]);
  });
  it("accepts one that can end: a guard, or the date moved by its actions, the state's or a flow they run", () => {
    const due = { at: "context.dueAt" };
    const moved = [{ assign: { "context.dueAt": "2027-01-01T00:00:00Z" } }];
    expect(
      targets(loop(due, { guard: { expr: { "<": [{ var: "context.n" }, 3] } } }), "machine.timerSelfLoop")
    ).toEqual([]);
    expect(targets(loop(due, { actions: moved }), "machine.timerSelfLoop")).toEqual([]);
    for (const hook of ["onEntry", "onExit"]) {
      const doc = loop(due);
      doc.canvases.cnv_m.nodes.nod_idle[hook] = moved;
      expect(targets(doc, "machine.timerSelfLoop")).toEqual([]);
    }
    const byFlow = loop(due, { actions: [{ action: "act_work" }] });
    byFlow.canvases.cnv_f.nodes.nod_tell = { kind: "assign", set: { "context.dueAt": "2027-01-01T00:00:00Z" } };
    expect(targets(byFlow, "machine.timerSelfLoop")).toEqual([]);
  });

  it("still reports one whose actions write something else", () => {
    const doc = loop({ at: "context.dueAt" }, { actions: [{ assign: { "context.n": 1 } }, { action: "act_work" }] });
    expect(targets(doc, "machine.timerSelfLoop")).toEqual(["edg_idleAgain"]);
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

describe("machine.ambiguous, by what the runtime evaluates", () => {
  it("reports one guard written twice, with and without a text", () => {
    const doc = twoOnGo({ guard: { guard: "grd_a" } }, { guard: { guard: "grd_a", text: "a, in words" } });
    expect(problems(doc, "machine.ambiguous").map(p => [p.target, p.data])).toEqual([
      ["nod_idle", { trigger: "on:evt_go", edges: ["edg_one", "edg_two"] }]
    ]);
  });
  it("reports a catalog guard beside its own expression written inline", () => {
    const doc = twoOnGo({ guard: { guard: "grd_n" } }, { guard: { expr: { "==": [{ var: "context.n" }, 1] } } });
    expect(targets(doc, "machine.ambiguous")).toEqual(["nod_idle"]);
  });
  it("accepts different guards, different texts, and a condition whose own expression differs", () => {
    expect(targets(twoOnGo({ guard: { guard: "grd_a" } }, { guard: { guard: "grd_b" } }), "machine.ambiguous")).toEqual(
      []
    );
    expect(targets(twoOnGo({ guard: { text: "a" } }, { guard: { text: "b" } }), "machine.ambiguous")).toEqual([]);
    const own = twoOnGo(
      { guard: { guard: "grd_a" } },
      { guard: { guard: "grd_a", expr: { "==": [{ var: "context.n" }, 2] } } }
    );
    expect(targets(own, "machine.ambiguous")).toEqual([]);
  });
});

describe("machine.unguardedBesideGuarded", () => {
  it("reports an unguarded transition beside a guarded one on the same trigger", () => {
    const doc = twoOnGo({ guard: { guard: "grd_a" } }, {});
    expect(problems(doc, "machine.unguardedBesideGuarded").map(p => [p.target, p.severity, p.data])).toEqual([
      ["nod_idle", "warning", { trigger: "on:evt_go", edges: ["edg_one", "edg_two"] }]
    ]);
  });
  it("counts a self-transition", () => {
    const doc = twoOnGo({ guard: { guard: "grd_a" } }, { to: "nod_idle", internal: true });
    expect(targets(doc, "machine.unguardedBesideGuarded")).toEqual(["nod_idle"]);
  });
  it("counts an edge with two events once per event", () => {
    const doc = twoOnGo({ on: ["evt_go", "evt_stop"] }, { guard: { guard: "grd_a" } });
    expect(problems(doc, "machine.unguardedBesideGuarded").map(p => p.data.trigger)).toEqual(["on:evt_go"]);
  });
  it("treats an any node's transitions as each state's own, except where it says", () => {
    const doc = cleanDoc();
    doc.catalog.guards.grd_a = { name: "a", description: "Condition a" };
    doc.canvases.cnv_m.edges.edg_idleBusy.guard = { guard: "grd_a" };
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any" };
    doc.canvases.cnv_m.edges.edg_anyDone = { from: "nod_any", to: "nod_done", on: ["evt_go"] };
    expect(problems(doc, "machine.unguardedBesideGuarded").map(p => [p.target, p.data.edges])).toEqual([
      ["nod_idle", ["edg_anyDone", "edg_idleBusy"]]
    ]);
    doc.canvases.cnv_m.nodes.nod_any.except = ["nod_idle"];
    expect(targets(doc, "machine.unguardedBesideGuarded")).toEqual([]);
  });
  it("accepts guarded transitions only, and transitions in different validity periods", () => {
    const guarded = twoOnGo({ guard: { guard: "grd_a" } }, { guard: { guard: "grd_b" } });
    expect(targets(guarded, "machine.unguardedBesideGuarded")).toEqual([]);
    const periods = twoOnGo(
      { guard: { guard: "grd_a" }, effective: { until: "2027-01-01" } },
      { effective: { from: "2027-01-01" } }
    );
    expect(targets(periods, "machine.unguardedBesideGuarded")).toEqual([]);
  });
});

describe("machine.innerShadowsOuter", () => {
  it("reports an unguarded inner transition on a trigger an enclosing state also takes", () => {
    expect(problems(withInterior(), "machine.innerShadowsOuter").map(p => [p.target, p.severity, p.data])).toEqual([
      ["edg_workingPaused", "warning", { trigger: "on:evt_stop", outer: ["edg_busyDone"] }]
    ]);
  });
  it("sees an enclosing state's any transitions", () => {
    const doc = withInterior({ on: ["evt_go"] });
    doc.canvases.cnv_m.nodes.nod_any = { kind: "any", except: ["nod_idle"] };
    doc.canvases.cnv_m.edges.edg_anyDone = { from: "nod_any", to: "nod_done", on: ["evt_go"] };
    expect(problems(doc, "machine.innerShadowsOuter").map(p => p.data.outer)).toEqual([["edg_anyDone"]]);
  });
  it("climbs through every enclosing state, guarded transitions included", () => {
    const doc = withInterior({ guard: { guard: "grd_a" } });
    doc.canvases.cnv_inner.nodes.nod_working.inner = { canvas: "cnv_deep" };
    doc.canvases.cnv_deep = {
      kind: "machine",
      name: "Deep",
      nodes: {
        nod_deepInit: { kind: "initial" },
        nod_step: { kind: "state", name: "step" },
        nod_stepped: { kind: "state", name: "stepped" }
      },
      edges: {
        edg_deepInitStep: { from: "nod_deepInit", to: "nod_step" },
        edg_stepStepped: { from: "nod_step", to: "nod_stepped", on: ["evt_stop"] }
      }
    };
    expect(problems(doc, "machine.innerShadowsOuter").map(p => [p.target, p.data.outer])).toEqual([
      ["edg_stepStepped", ["edg_busyDone", "edg_workingPaused"]]
    ]);
  });
  it("accepts a guarded inner transition, another trigger, and a timer", () => {
    expect(targets(withInterior({ guard: { guard: "grd_a" } }), "machine.innerShadowsOuter")).toEqual([]);
    expect(targets(withInterior({ on: ["evt_go"] }), "machine.innerShadowsOuter")).toEqual([]);
    const timers = withInterior({ after: "tmr_t" });
    delete timers.canvases.cnv_inner.edges.edg_workingPaused.on;
    timers.canvases.cnv_m.edges.edg_busyDone = { from: "nod_busy", to: "nod_done", after: "tmr_t" };
    expect(targets(timers, "machine.innerShadowsOuter")).toEqual([]);
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

describe("machine.elseOutsideChoice", () => {
  it("reports else on a transition that does not leave a choice, and leaves choices to choice.else", () => {
    const doc = cleanDoc();
    doc.catalog.guards.grd_ready = { name: "ready", description: "Ready to go" };
    const machine = doc.canvases.cnv_m;
    machine.nodes.nod_pick = { kind: "choice" };
    machine.edges.edg_idleBusy.to = "nod_pick";
    machine.edges.edg_pickBusy = { from: "nod_pick", to: "nod_busy", guard: { guard: "grd_ready" } };
    machine.edges.edg_pickDone = { from: "nod_pick", to: "nod_done", else: true };
    machine.edges.edg_busyIdleElse = { from: "nod_busy", to: "nod_idle", on: ["evt_go"], else: true };
    expect(targets(doc, "machine.elseOutsideChoice")).toEqual(["edg_busyIdleElse"]);
    machine.edges.edg_pickIdle = { from: "nod_pick", to: "nod_idle", else: true };
    expect(targets(doc, "machine.elseOutsideChoice")).toEqual(["edg_busyIdleElse"]);
    expect(targets(doc, "choice.else")).toEqual(["nod_pick"]);
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
