import { describe, expect, it } from "vitest";
import {
  CALL_ERRORS,
  documentOperations,
  operationNamed,
  problemsChange,
  runResultOf,
  runStateOf
} from "../../src/agent/index.js";
import { start, step } from "../../src/simulate/index.js";
import { paymentsDoc } from "../helpers.js";

describe("what every host of the agent contract shares", () => {
  it("answers from the document alone: reading, querying, the Problems, the scenarios run again, the audit", () => {
    expect(Object.keys(documentOperations).sort()).toEqual(
      [
        "document.summary",
        "document.get",
        "level.get",
        "query.find",
        "query.usages",
        "query.path",
        "problems.list",
        "scenario.replay",
        "audit.report"
      ].sort()
    );
    const doc = paymentsDoc();
    expect(documentOperations["level.get"]({ doc }, { canvas: "cnv_expiryClock" }).name).toBe("Expiry clock");
    expect(documentOperations["audit.report"]({ doc }, { format: "json" }).summary.coverage).toBe(48);
  });

  it("tells a run as an agent reads it, whatever the host keeps beside it", () => {
    const doc = paymentsDoc();
    const at = "2026-01-05T09:00:00Z";
    const first = start(doc, { canvas: "cnv_lifecycle", at });
    const second = step(doc, first.session, { do: { event: "evt_verifyStarted" } });
    // The Editor's panel keeps more in each point and failure (its trace, what it replays): agents get neither.
    const run = {
      canvas: "cnv_lifecycle",
      points: [
        { do: null, answers: [], session: first.session, trace: [] },
        { do: { event: "evt_verifyStarted" }, answers: [], session: second.session, trace: [], recorded: 1 }
      ],
      asking: null,
      failure: {
        do: { event: "evt_nope" },
        code: "dangling",
        message: "There is no event evt_nope",
        trace: [],
        replaying: null
      }
    };
    expect(runResultOf(run)).toEqual({
      point: {
        step: 1,
        do: { event: "evt_verifyStarted" },
        active: ["nod_complianceHold/nod_clear", "nod_expiryClock/nod_paused", "nod_sendCrossBorder/nod_awaitingFunds"],
        clock: at
      },
      question: null,
      failure: { do: { event: "evt_nope" }, code: "dangling", message: "There is no event evt_nope" }
    });
    expect(runStateOf(run, 1)).toMatchObject({
      canvas: "cnv_lifecycle",
      points: [{ step: 0, do: null }, { step: 1 }],
      question: null,
      failure: { code: "dangling" },
      unsaved: 1
    });
    expect(runResultOf({ points: [], asking: { question: { kind: "transition" } }, failure: null })).toEqual({
      point: null,
      question: { kind: "transition" }
    });
  });

  it("tells the Problems a change brought and took away", () => {
    const before = [{ code: "a", target: "x", message: "one" }];
    const after = [
      { code: "b", target: "y", message: "two" },
      { code: "a", target: "x", message: "one, renamed" }
    ];
    expect(problemsChange(before, after)).toEqual({ added: [after[0]], removed: [] });
  });

  it("lets any call answer NOT_ALLOWED: an Editor with no project open", () => {
    expect(CALL_ERRORS).toContain("NOT_ALLOWED");
    expect(operationNamed("run.step").errors).toEqual([]);
    expect(operationNamed("batch.apply").errors).not.toContain("NOT_ALLOWED");
  });
});
