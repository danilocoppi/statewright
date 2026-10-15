import { describe, expect, it } from "vitest";
import { auditOf, coverageOf, toAuditReport } from "../../src/audit/index.js";
import { applyBatch } from "../../src/commands/index.js";
import { paymentsDoc, readExample } from "../helpers.js";

/** A level's coverage, in short: "covered / total" for its nodes and edges, and its percent. */
const short = level => [
  level.canvas,
  `${level.nodes.covered}/${level.nodes.total}`,
  `${level.edges.covered}/${level.edges.total}`,
  level.percent
];

describe("the coverage of a design by its scenarios (AI interface spec §8)", () => {
  it("marks the states and transitions the payments scenarios reach, level by level", () => {
    const coverage = coverageOf(paymentsDoc());
    expect(coverage.scenarios).toBe(2);
    expect(coverage.levels.map(short)).toEqual([
      ["cnv_complianceHold", "1/5", "1/8", 15],
      ["cnv_crossBorderSend", "4/9", "5/12", 43],
      ["cnv_expiryClock", "3/4", "4/6", 70],
      ["cnv_lifecycle", "3/3", "3/3", 100]
    ]);
    expect(coverage.percent).toBe(48);
    const clock = coverage.levels.find(level => level.canvas === "cnv_expiryClock");
    expect(clock.nodes.missed).toEqual(["nod_elapsed"]);
    expect(clock.edges.missed).toEqual(["edg_pausedStopped", "edg_runningElapsed"]);
  });

  it("counts a flow's nodes, the bodies its tokens run included, and a level no scenario reaches as not covered", () => {
    const coverage = coverageOf(JSON.parse(readExample("payout-batch.statewright.json")));
    expect(coverage.levels.map(short)).toEqual([
      ["cnv_payOne", "8/9", "7/11", 75],
      ["cnv_payOutBatch", "10/11", "10/11", 91],
      ["cnv_batch", "0/3", "0/3", 0]
    ]);
  });

  it("has nothing to cover without machines or flows, and covers nothing without scenarios", () => {
    const doc = paymentsDoc();
    delete doc.annotations.scenarios;
    expect(coverageOf(doc).levels.every(level => level.nodes.covered === 0 && level.edges.covered === 0)).toBe(true);
    expect(coverageOf(doc).percent).toBe(0);
  });
});

describe("the audit of a design (AI interface spec §8)", () => {
  it("gathers the Problems by severity, every scenario run again and the coverage", () => {
    const audit = auditOf(paymentsDoc());
    expect(audit.summary).toEqual({ error: 0, warning: 0, incomplete: 14, scenarios: 2, diverged: 0, coverage: 48 });
    expect(audit.scenarios).toEqual([
      { id: "scn_paysInTime", name: "Pays in time", canvas: "cnv_lifecycle", status: "same" },
      {
        id: "scn_verificationPausesTheClock",
        name: "Verification pauses the clock",
        canvas: "cnv_lifecycle",
        status: "same"
      }
    ]);
  });

  it("says which scenarios go elsewhere now, and where", () => {
    const doc = applyBatch(paymentsDoc(), [
      { type: "edge.update", args: { id: "edg_runningPaused", set: { to: "nod_stopped" } } }
    ]).doc;
    const audit = auditOf(doc);
    expect(audit.summary.diverged).toBe(1);
    expect(audit.scenarios.find(scenario => scenario.status === "diverged")).toMatchObject({
      id: "scn_verificationPausesTheClock",
      step: 1,
      reason: "reached"
    });
    expect(toAuditReport(doc)).toContain(
      "| `scn_verificationPausesTheClock` | Verification pauses the clock | `cnv_lifecycle` | goes elsewhere at step 1 (reached) |"
    );
  });

  it("audits one level: its Problems, the scenarios that start there and its coverage", () => {
    const audit = auditOf(paymentsDoc(), { canvas: "cnv_lifecycle" });
    expect(audit.problems.every(problem => problem.canvas === "cnv_lifecycle")).toBe(true);
    expect(audit.summary).toMatchObject({ incomplete: 3, scenarios: 2, coverage: 100 });
    expect(audit.coverage.levels.map(level => level.canvas)).toEqual(["cnv_lifecycle"]);
  });

  it("writes a report: the summary, then Problems, scenarios and coverage", () => {
    const report = toAuditReport(paymentsDoc());
    expect(report.split("\n").slice(0, 3)).toEqual([
      "# Audit of Payments",
      "",
      "0 errors, 0 warnings and 14 incomplete. 2 scenarios, none going elsewhere. The scenarios cover 48 % of the states, nodes and transitions."
    ]);
    expect(report.indexOf("## Problems")).toBeLessThan(report.indexOf("## Scenarios"));
    expect(report.indexOf("## Scenarios")).toBeLessThan(report.indexOf("## Coverage"));
    expect(report).toContain(
      "| Expiry clock (`cnv_expiryClock`) | machine | 3 / 4 | 4 / 6 | 70 % | `nod_elapsed` `edg_pausedStopped` `edg_runningElapsed` |"
    );
  });
});
