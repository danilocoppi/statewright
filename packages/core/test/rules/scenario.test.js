import { describe, expect, it } from "vitest";
import { check, listRules } from "../../src/rules/index.js";
import { reachedOf, start, step } from "../../src/simulate/index.js";
import { paymentsDoc } from "../helpers.js";

const AT = "2026-01-05T09:00:00Z";
const init = { at: AT, context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };

/** The payments example with the spec's scenario (§4.2), recorded from a run. */
function withScenario(doc = paymentsDoc()) {
  let result = start(doc, { canvas: "cnv_lifecycle", ...init });
  const steps = [];
  for (const input of [{ event: "evt_verifyStarted" }, { wait: "P2D" }, { event: "evt_verifyEnded" }]) {
    result = step(doc, result.session, { do: input });
    steps.push({ do: input, reached: reachedOf(result.session) });
  }
  const scenario = { name: "Verification pauses the clock", canvas: "cnv_lifecycle", start: init, steps };
  doc.annotations = { ...doc.annotations, scenarios: { scn_pause: scenario } };
  return doc;
}

const diverged = doc => check(doc).filter(problem => problem.code === "scenario.diverged");

describe("scenario.diverged (simulator spec §4.6)", () => {
  it("is a warning in the rule list", () => {
    expect(listRules().find(rule => rule.code === "scenario.diverged")).toEqual({
      code: "scenario.diverged",
      severity: "warning",
      description: "Running a saved scenario again no longer gives what it recorded."
    });
  });

  it("says nothing while the scenario still goes where it went", () => {
    expect(diverged(withScenario())).toEqual([]);
  });

  it("reports the first step that goes elsewhere once the design changes", () => {
    const doc = withScenario();
    doc.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped";
    expect(diverged(doc)).toEqual([
      {
        code: "scenario.diverged",
        severity: "warning",
        target: "scn_pause",
        canvas: "cnv_lifecycle",
        message: 'scenario "Verification pauses the clock" goes elsewhere at step 3: it reaches other states',
        data: { step: 3, reason: "reached" }
      }
    ]);
  });

  it("reports a scenario that can no longer start", () => {
    const doc = withScenario();
    delete doc.canvases.cnv_lifecycle.nodes.nod_phaseInitial;
    delete doc.canvases.cnv_lifecycle.edges.edg_phaseStart;
    expect(diverged(doc)[0]).toMatchObject({
      message:
        'scenario "Verification pauses the clock" goes elsewhere at its start: it can no longer be taken. Region Phase ' +
        "of Lifecycle engine has no initial node",
      data: { step: 0, reason: "error" }
    });
  });
});
