import { describe, expect, it } from "vitest";
import { applyBatch, applyPatches } from "../../src/commands/index.js";
import { usagesOf } from "../../src/query/index.js";
import { check } from "../../src/rules/index.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";
import { cmd, failure, machineDoc, run } from "./helpers.js";

const lifecycle = ["nod_complianceHold/nod_clear", "nod_sendCrossBorder/nod_awaitingFunds"];

/** A scenario like the spec's (§4.2): the payer's verification pausing the clock, a call, and the clock again. */
function scenario(extra = {}) {
  return {
    name: "Verify, then resume",
    canvas: "cnv_lifecycle",
    start: { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } },
    steps: [
      { do: { event: "evt_verifyStarted" }, reached: { active: [...lifecycle, "nod_expiryClock/nod_paused"].sort() } },
      { do: { call: "whk_providerEvents" }, reached: { active: [...lifecycle, "nod_expiryClock/nod_paused"].sort() } },
      { do: { event: "evt_verifyEnded" }, reached: { active: [...lifecycle, "nod_expiryClock/nod_running"].sort() } }
    ],
    ...extra
  };
}

describe("scenario commands (simulator spec §4.4)", () => {
  it("adds a scenario with an ID from its name, and undoes it", () => {
    const before = paymentsDoc();
    const result = applyBatch(before, [cmd("scenario.add", { scenario: scenario() })]);
    expect(result.created).toEqual(["scn_verifyThenResume"]);
    expect(result.doc.annotations.scenarios.scn_verifyThenResume).toEqual(scenario());
    expect(applyPatches(result.doc, result.inversePatches)).toEqual(before);
  });

  it("changes and removes a scenario", () => {
    let doc = run(paymentsDoc(), cmd("scenario.add", { scenario: scenario(), id: "scn_pause" }));
    const steps = scenario()
      .steps.slice(0, 1)
      .map(item => ({ ...item, caption: "The clock stops." }));
    doc = run(doc, cmd("scenario.update", { id: "scn_pause", set: { steps, description: "Shorter." } }));
    expect(doc.annotations.scenarios.scn_pause).toMatchObject({ description: "Shorter.", steps });
    doc = run(doc, cmd("scenario.remove", { id: "scn_pause" }));
    expect(doc.annotations?.scenarios?.scn_pause).toBeUndefined();
  });

  it("refuses a scenario that starts inside another machine or on a system canvas", () => {
    const inner = failure(paymentsDoc(), cmd("scenario.add", { scenario: scenario({ canvas: "cnv_expiryClock" }) }));
    expect(inner).toMatchObject({ code: "NOT_ALLOWED" });
    expect(inner.message).toBe(
      "A scenario starts from a machine or flow that runs on its own; Expiry clock runs inside Lifecycle engine"
    );
    const system = failure(paymentsDoc(), cmd("scenario.add", { scenario: scenario({ canvas: "cnv_runtime" }) }));
    expect(system).toMatchObject({ code: "NOT_ALLOWED" });
  });

  it("refuses an input that does not exist, one of the wrong kind, and a scenario without its start", () => {
    const missing = scenario();
    missing.steps[0].do = { event: "evt_nope" };
    expect(failure(paymentsDoc(), cmd("scenario.add", { scenario: missing })).code).toBe("NOT_FOUND");
    const wrong = scenario();
    wrong.steps[0].do = { event: "tmr_expiry" };
    expect(failure(paymentsDoc(), cmd("scenario.add", { scenario: wrong })).code).toBe("SCHEMA");
    const shapeless = scenario();
    delete shapeless.start;
    expect(failure(paymentsDoc(), cmd("scenario.add", { scenario: shapeless })).code).toBe("SCHEMA");
  });

  it("accepts an entry of its canvas to start from, and nothing else there", () => {
    const doc = machineDoc(minimalDoc());
    doc.canvases.cnv_m.nodes.nod_api = { kind: "entry", name: "POST /m" };
    doc.canvases.cnv_m.edges.edg_api = { from: "nod_api", to: "nod_a" };
    const at = "2026-01-05T09:00:00Z";
    const started = entry => ({ name: "From the API", canvas: "cnv_m", start: { at, entry }, steps: [] });
    expect(run(doc, cmd("scenario.add", { scenario: started("nod_api") })).annotations.scenarios).toBeDefined();
    expect(failure(doc, cmd("scenario.add", { scenario: started("nod_a") }))).toMatchObject({
      code: "NOT_ALLOWED",
      message: "A scenario starts at an entry of M; nod_a is not one"
    });
  });
});

describe("what a scenario refers to (simulator spec §4.5)", () => {
  const withScenario = () => run(paymentsDoc(), cmd("scenario.add", { scenario: scenario(), id: "scn_pause" }));

  it("counts as a usage of its canvas, its events and its calls", () => {
    const doc = withScenario();
    const fields = id =>
      usagesOf(doc, id)
        .filter(ref => ref.source === "scn_pause")
        .map(ref => ref.field);
    expect(fields("cnv_lifecycle")).toEqual(["canvas"]);
    expect(fields("evt_verifyStarted")).toEqual(["steps.do.event"]);
    expect(fields("whk_providerEvents")).toEqual(["steps.do.call"]);
  });

  it("loses the steps that used an event when the event is removed, without blocking the removal", () => {
    const doc = run(withScenario(), cmd("catalog.remove", { id: "evt_verifyStarted", cascade: true }));
    expect(doc.annotations.scenarios.scn_pause.steps.map(item => item.do)).toEqual([
      { call: "whk_providerEvents" },
      { event: "evt_verifyEnded" }
    ]);
  });

  it("goes with the canvas it runs, and forgets an entry that is removed", () => {
    const base = machineDoc(minimalDoc());
    base.canvases.cnv_m.nodes.nod_api = { kind: "entry", name: "POST /m" };
    base.canvases.cnv_m.edges.edg_api = { from: "nod_api", to: "nod_a" };
    const at = "2026-01-05T09:00:00Z";
    const doc = run(
      base,
      cmd("scenario.add", {
        scenario: { name: "S", canvas: "cnv_m", start: { at, entry: "nod_api" }, steps: [] },
        id: "scn_s"
      })
    );
    expect(run(doc, cmd("node.remove", { id: "nod_api" })).annotations.scenarios.scn_s.start).toEqual({ at });
    expect(run(doc, cmd("canvas.remove", { id: "cnv_m" })).annotations).toBeUndefined();
  });

  it("is reported by the reference rules when a file names something that does not exist", () => {
    const doc = paymentsDoc();
    const broken = scenario();
    broken.steps[0].do = { event: "evt_nope" };
    doc.annotations = { ...doc.annotations, scenarios: { scn_broken: broken } };
    expect(
      check(doc)
        .filter(problem => problem.target === "scn_broken")
        .map(problem => problem.code)
    ).toContain("ref.dangling");
  });
});
