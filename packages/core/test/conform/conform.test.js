// Conformance (source-of-truth spec §6): the results a system's tests write, compared with the design's vectors —
// divergences, steps that threw, vectors not run, results of another version, and the transitions no passing step
// proves.
import { describe, expect, it } from "vitest";
import { checkResults, conformOf, contractDigest, parseResults, toConformReport } from "../../src/conform/index.js";
import { applyBatch } from "../../src/commands/index.js";
import { toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { readExample } from "../helpers.js";

const bookings = () => parse(readExample("bookings.statewright.json")).doc;

/** Results of code that reaches every state the design expects, as `change` then edits them. */
async function resultsOf(doc, change = results => results) {
  const { contract } = await toContract(doc);
  const results = {
    results: "1",
    contract: await contractDigest(contract),
    runner: "vitest",
    vectors: contract.vectors.map(vector => ({
      id: vector.id,
      steps: [vector.start, ...vector.steps].map(step => ({ active: [...step.expect.active] }))
    }))
  };
  change(results);
  return results;
}

const vectorOf = (results, id) => results.vectors.find(vector => vector.id === id);

describe("conformOf (source-of-truth spec §6)", () => {
  it("passes when the code reached every state the design expects, each transition proved", async () => {
    const report = await conformOf(bookings(), await resultsOf(bookings()));
    expect(report).toMatchObject({
      ok: true,
      same: true,
      design: { project: "prj_bookings", name: "Bookings" },
      results: { runner: "vitest" },
      summary: { vectors: 5, passed: 5, diverged: 0, threw: 0, incomplete: 0, notRun: 0, unknown: 0 },
      findings: []
    });
    expect(report.coverage).toEqual([
      { machine: "cnv_booking", name: "Booking lifecycle", transitions: 5, proved: 5, missed: [] }
    ]);
    expect(toConformReport(report)).toBe(
      "# Conformance of Bookings\n\n" +
        "The results (vitest) are for this version of the design: 5 of 5 vectors passed.\n\n" +
        "## Transitions no passing vector proves\n\n" +
        "None: every transition of the machines is proved by a vector the code passed.\n"
    );
  });

  it("compares the active states of regions in any order", async () => {
    const doc = parse(readExample("payments.statewright.json")).doc;
    const results = await resultsOf(doc, results => {
      for (const vector of results.vectors) for (const step of vector.steps) step.active.reverse();
    });
    expect(results.vectors.some(vector => vector.steps.some(step => step.active.length > 1))).toBe(true);
    expect(await conformOf(doc, results)).toMatchObject({ ok: true, findings: [] });
  });

  it("reports a step whose states differ as a high finding on the transition the design fires there", async () => {
    const results = await resultsOf(bookings(), results => {
      vectorOf(results, "scn_aConfirmedGuestIsSeated").steps[2] = { active: ["confirmed"] };
    });
    const report = await conformOf(bookings(), results);
    expect(report.ok).toBe(false);
    expect(report.summary).toMatchObject({ passed: 4, diverged: 1 });
    expect(report.vectors).toContainEqual({
      id: "scn_aConfirmedGuestIsSeated",
      name: "A confirmed guest is seated",
      outcome: "diverged",
      step: 2
    });
    expect(report.findings).toEqual([
      {
        code: "diverged",
        severity: "high",
        title:
          'Scenario "A confirmed guest is seated", step 2 (guest.arrived): the design expects seated; the code is in ' +
          "confirmed",
        targets: ["edg_confirmedSeated"]
      }
    ]);
    // The transitions before the divergence are proved by this vector or another; the one it breaks is not.
    expect(report.coverage[0]).toMatchObject({
      proved: 4,
      missed: [{ id: "edg_confirmedSeated", from: "confirmed", to: "seated" }]
    });
    expect(toConformReport(report)).toBe(
      "# Conformance of Bookings\n\n" +
        "The results (vitest) are for this version of the design: 4 of 5 vectors passed, 1 diverged.\n\n" +
        "## Findings\n\n" +
        '- **high** Scenario "A confirmed guest is seated", step 2 (guest.arrived): the design expects seated; the ' +
        "code is in confirmed (`edg_confirmedSeated`)\n\n" +
        "## Transitions no passing vector proves\n\n" +
        "- Booking lifecycle (`cnv_booking`), 4 of 5: `confirmed → seated` (`edg_confirmedSeated`)\n"
    );
  });

  it("points at the node the design expects when it fires nothing there, a flow's step among them", async () => {
    const doc = parse(readExample("payout-batch.statewright.json")).doc;
    const results = await resultsOf(doc, results => {
      vectorOf(results, "scn_aPayoutIsRefused").steps[0] = { active: [] };
    });
    expect((await conformOf(doc, results)).findings).toEqual([
      {
        code: "diverged",
        severity: "high",
        title:
          'Scenario "A payout is refused", start (start): the design expects the bank confirms; the code is in no state',
        targets: ["nod_confirm"]
      }
    ]);
  });

  it("reports a step that threw, a vector stopped early or not run, and results the design does not have", async () => {
    const results = await resultsOf(bookings(), results => {
      vectorOf(results, "scn_aBookingIsDeclined").steps[1] = { error: "booking 1 cannot be declined" };
      vectorOf(results, "scn_aGuestDoesNotCome").steps.splice(2);
      vectorOf(results, "scn_theGuestIsToldItIsConfirmed").skipped = "the notifier has no driver yet";
      delete vectorOf(results, "scn_theGuestIsToldItIsConfirmed").steps;
      results.vectors = results.vectors.filter(vector => vector.id !== "scn_theGuestIsToldItIsDeclined");
      results.vectors.push({ id: "scn_somethingElse", steps: [] });
    });
    const report = await conformOf(bookings(), results);
    expect(report.ok).toBe(false);
    expect(report.summary).toEqual({
      vectors: 5,
      passed: 1,
      diverged: 0,
      threw: 1,
      incomplete: 1,
      notRun: 2,
      unknown: 1
    });
    expect(report.findings).toEqual([
      {
        code: "threw",
        severity: "medium",
        title:
          'Scenario "A booking is declined", step 1 (booking.declined): the code threw "booking 1 cannot be ' +
          'declined"; the design expects declined',
        targets: ["edg_requestedDeclined"]
      },
      {
        code: "incomplete",
        severity: "info",
        title: 'Scenario "A guest does not come" stopped before step 2: the results have 2 of its 3 states',
        targets: ["scn_aGuestDoesNotCome"]
      },
      {
        code: "notRun",
        severity: "info",
        title: 'Scenario "The guest is told it is confirmed" was not run: the notifier has no driver yet',
        targets: ["scn_theGuestIsToldItIsConfirmed"]
      },
      {
        code: "notRun",
        severity: "info",
        title: 'Scenario "The guest is told it is declined" was not run; the results have no entry for it',
        targets: ["scn_theGuestIsToldItIsDeclined"]
      },
      {
        code: "unknownVector",
        severity: "info",
        title: "The results name scn_somethingElse, which is not among the design's vectors",
        targets: ["cnv_bookings"]
      }
    ]);
  });

  it("compares nothing when the results are for another version of the design", async () => {
    const results = await resultsOf(bookings(), results => {
      results.contract = "0123456789abcdef".repeat(4);
    });
    const report = await conformOf(bookings(), results);
    expect(report).toMatchObject({ ok: false, same: false, vectors: [], summary: { vectors: 5, passed: 0 } });
    expect(report.findings).toEqual([
      {
        code: "otherVersion",
        severity: "medium",
        title: expect.stringMatching(
          /^The results are for another version of the design or of its scenarios \(0123456789ab\), not this one \([0-9a-f]{12}\): run the vectors of its contract again$/
        ),
        targets: ["cnv_bookings"]
      }
    ]);
    expect(toConformReport(report)).toBe(
      "# Conformance of Bookings\n\n" +
        "The results (vitest) are for another version of the design: nothing was compared.\n\n" +
        "## Findings\n\n" +
        `- **medium** ${report.findings[0].title} (\`cnv_bookings\`)\n`
    );
  });

  it("compares nothing when a scenario changed after the results were written", async () => {
    const results = await resultsOf(bookings());
    // A scenario is an annotation: the specification's hash stays as it was, the contract's vectors do not.
    const changed = applyBatch(bookings(), [
      {
        type: "scenario.update",
        args: {
          id: "scn_aConfirmedGuestIsSeated",
          set: {
            steps: [
              { do: { event: "evt_bookingConfirmed" }, reached: { active: ["nod_confirmed"] } },
              { do: { event: "evt_bookingDeclined" }, reached: { active: ["nod_confirmed"] } }
            ]
          }
        }
      }
    ]).doc;
    const report = await conformOf(changed, results);
    expect(report).toMatchObject({ ok: false, same: false, findings: [{ code: "otherVersion", severity: "medium" }] });
  });

  it("fails a run that proves nothing: the design has vectors, and none ran", async () => {
    const results = await resultsOf(bookings(), results => {
      results.vectors = results.vectors.map(({ id }) => ({ id, skipped: "not in this run (only bookings.status)" }));
    });
    const report = await conformOf(bookings(), results);
    expect(report.ok).toBe(false);
    expect(report.findings.at(-1)).toEqual({
      code: "nothingRun",
      severity: "medium",
      title: "No vector of the design ran: the results prove nothing about the code",
      targets: ["cnv_bookings"]
    });
  });

  it("refuses results of another format, or malformed, naming the field", async () => {
    const valid = await resultsOf(bookings());
    expect(checkResults(valid)).toEqual({ ok: true });
    expect(parseResults(JSON.stringify(valid))).toEqual({ ok: true, results: valid });
    expect(parseResults("{")).toMatchObject({ ok: false, message: expect.stringMatching(/^is not JSON \(/) });
    for (const [value, message] of [
      [[], "is not a results object"],
      [{ ...valid, results: "2" }, 'is not a results file of format 1 (format "2")'],
      [{ ...valid, contract: undefined }, "needs contract, the SHA-256 of the contract run"],
      [
        { ...valid, vectors: [valid.vectors[1], valid.vectors[0], valid.vectors[1]] },
        "vectors[2].id repeats vectors[0].id"
      ],
      [{ ...valid, vectors: {} }, "needs vectors, a list"],
      [{ ...valid, vectors: [{ id: "scn_a" }] }, "vectors[0] needs steps (a list) or skipped (a reason)"],
      [
        { ...valid, vectors: [{ id: "scn_a", steps: [{ active: "requested" }] }] },
        "vectors[0].steps[0] needs active (a list of state names) or error (a message)"
      ]
    ]) {
      expect(checkResults(value)).toEqual({ ok: false, message });
    }
    await expect(conformOf(bookings(), { ...valid, results: "2" })).rejects.toThrow(
      'The results file is not a results file of format 1 (format "2")'
    );
  });
});
