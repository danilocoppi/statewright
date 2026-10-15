// `statewright conform` (source-of-truth spec §6, §9, §10): the results a system's tests wrote, compared with the
// design; a planted bug becomes a finding on the transition it breaks, which --write keeps as the design's.
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runVectors, writeResults } from "../../src/conform/index.js";
import { toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { verify } from "../../src/signature.js";
import { bookingsDriver } from "../fixtures/bookings-api/driver.js";
import { cli, workspace } from "./helpers.js";

const BOOKINGS = fileURLToPath(new URL("../../../../examples/bookings.statewright.json", import.meta.url));

/** A directory with a copy of bookings and the results of the booking service, with or without the planted bug. */
async function system({ plantedBug = false } = {}) {
  const dir = await workspace();
  await copyFile(BOOKINGS, join(dir, "bookings.statewright.json"));
  const { contract } = await toContract(parse(await readFile(BOOKINGS, "utf8")).doc);
  const results = await runVectors(contract, bookingsDriver({ plantedBug }), {
    only: "booking.status",
    runner: "vitest"
  });
  await writeResults(join(dir, "results.json"), results);
  return dir;
}

const findingsOf = async dir =>
  parse(await readFile(join(dir, "bookings.statewright.json"), "utf8")).doc.annotations.findings ?? {};

describe("statewright conform (source-of-truth spec §6)", () => {
  it("passes when the code does what the design says, the vectors of other levels not run (exit 0)", async () => {
    const dir = await system();
    const run = await cli(["conform", "bookings.statewright.json", "results.json"], { cwd: dir });
    expect(run).toMatchObject({ code: 0, stderr: "" });
    expect(run.stdout).toBe(
      "# Conformance of Bookings\n\n" +
        "The results (vitest) are for this version of the design: 3 of 5 vectors passed, 2 not run.\n\n" +
        "## Findings\n\n" +
        '- **info** Scenario "The guest is told it is confirmed" was not run: not in this run (only booking.status) ' +
        "(`scn_theGuestIsToldItIsConfirmed`)\n" +
        '- **info** Scenario "The guest is told it is declined" was not run: not in this run (only booking.status) ' +
        "(`scn_theGuestIsToldItIsDeclined`)\n\n" +
        "## Transitions no passing vector proves\n\n" +
        "None: every transition of the machines is proved by a vector the code passed.\n"
    );
  });

  it("reports a planted bug on the transition it breaks (exit 1), and writes nothing without --write", async () => {
    const dir = await system({ plantedBug: true });
    const before = await readFile(join(dir, "bookings.statewright.json"), "utf8");
    const run = await cli(["conform", "bookings.statewright.json", "results.json"], { cwd: dir });
    expect(run.code).toBe(1);
    expect(run.stdout).toContain(
      '- **high** Scenario "A confirmed guest is seated", step 2 (guest.arrived): the design expects seated; the code ' +
        "is in confirmed (`edg_confirmedSeated`)\n"
    );
    expect(await readFile(join(dir, "bookings.statewright.json"), "utf8")).toBe(before);
  });

  it("keeps the findings with --write, source conformance, the specification's signature intact; the next run replaces them", async () => {
    const dir = await system({ plantedBug: true });
    const run = await cli(["conform", "bookings.statewright.json", "results.json", "--write"], { cwd: dir });
    expect(run.code).toBe(1);
    expect(run.stdout).toMatch(
      /\n\nWrote 3 finding\(s\) to bookings\.statewright\.json, source conformance: the Editor shows them\.\n$/
    );
    expect((await findingsOf(dir)).fnd_diverged).toEqual({
      code: "diverged",
      severity: "high",
      title:
        'Scenario "A confirmed guest is seated", step 2 (guest.arrived): the design expects seated; the code is in ' +
        "confirmed",
      targets: ["edg_confirmedSeated"],
      source: "conformance"
    });
    const doc = parse(await readFile(join(dir, "bookings.statewright.json"), "utf8")).doc;
    expect(await verify(doc)).toMatchObject({ content: "ok", annotations: "ok" });

    const fixed = await system();
    await copyFile(join(fixed, "results.json"), join(dir, "results.json"));
    expect((await cli(["conform", "bookings.statewright.json", "results.json", "--write"], { cwd: dir })).code).toBe(0);
    expect(Object.keys(await findingsOf(dir))).toEqual(["fnd_notRun", "fnd_notRun2"]);
  });

  it("prints the report as JSON with --json or --format json", async () => {
    const dir = await system({ plantedBug: true });
    const run = await cli(["conform", "bookings.statewright.json", "results.json", "--json"], { cwd: dir });
    expect(run.code).toBe(1);
    expect(run.json()).toMatchObject({
      ok: false,
      same: true,
      file: "bookings.statewright.json",
      results: { file: "results.json", runner: "vitest" },
      written: null,
      summary: { vectors: 5, passed: 2, diverged: 1, notRun: 2 },
      vectors: expect.arrayContaining([
        { id: "scn_aConfirmedGuestIsSeated", name: "A confirmed guest is seated", outcome: "diverged", step: 2 }
      ]),
      coverage: [expect.objectContaining({ machine: "cnv_booking", proved: 4 })]
    });
    const formatted = await cli(["conform", "bookings.statewright.json", "results.json", "--format", "json"], {
      cwd: dir
    });
    expect(JSON.parse(formatted.stdout)).toEqual(run.json());
  });

  it("compares nothing with results for another version of the design (exit 1)", async () => {
    const dir = await system();
    const results = JSON.parse(await readFile(join(dir, "results.json"), "utf8"));
    await writeFile(join(dir, "old.json"), JSON.stringify({ ...results, contract: "0".repeat(64) }));
    const run = await cli(["conform", "bookings.statewright.json", "old.json", "--json"], { cwd: dir });
    expect(run.code).toBe(1);
    expect(run.json()).toMatchObject({
      ok: false,
      same: false,
      findings: [{ code: "otherVersion", severity: "medium" }]
    });
  });

  it("refuses results that are not results, a format it does not know, and a design changed by hand (exit 2)", async () => {
    const dir = await system();
    await writeFile(join(dir, "nope.json"), '{ "results": "2" }');
    expect(await cli(["conform", "bookings.statewright.json", "nope.json"], { cwd: dir })).toMatchObject({
      code: 2,
      stderr: 'statewright: nope.json is not a results file of format 1 (format "2")\n'
    });
    await writeFile(join(dir, "steps.json"), '{ "results": "1", "contract": "x", "vectors": [{ "id": "scn_a" }] }');
    expect((await cli(["conform", "bookings.statewright.json", "steps.json"], { cwd: dir })).stderr).toBe(
      "statewright: steps.json vectors[0] needs steps (a list) or skipped (a reason)\n"
    );
    expect(
      (await cli(["conform", "bookings.statewright.json", "results.json", "--format", "html"], { cwd: dir })).stderr
    ).toBe('statewright: Unknown format "html"; use md or json\n');
    const raw = JSON.parse(await readFile(join(dir, "bookings.statewright.json"), "utf8"));
    raw.canvases.cnv_booking.nodes.nod_seated.name = "sat";
    await writeFile(join(dir, "bookings.statewright.json"), JSON.stringify(raw));
    const changed = await cli(["conform", "bookings.statewright.json", "results.json", "--write"], { cwd: dir });
    expect(changed.code).toBe(2);
    expect(changed.stderr).toMatch(/was changed outside Statewright; review the change and pass --accept-changes/);
  });
});
