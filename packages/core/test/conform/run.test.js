// Running the vectors through a system's own code (source-of-truth spec §6, §10): a small booking service with a fake
// clock passes every vector of bookings through its driver; with a bug planted, the vector it breaks fails, and
// conformance reports it on the transition it breaks.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  conformOf,
  contractDigest,
  parseResults,
  runVector,
  runVectors,
  writeResults
} from "../../src/conform/index.js";
import { stringifyContract } from "../../src/contract/index.js";
import { sha256Hex } from "../../src/signature.js";
import { toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { workspace } from "../cli/helpers.js";
import { bookingsDriver } from "../fixtures/bookings-api/driver.js";
import { readExample } from "../helpers.js";

const bookings = () => parse(readExample("bookings.statewright.json")).doc;
const contractOf = async () => (await toContract(bookings())).contract;
const machineVectors = contract => contract.vectors.filter(vector => vector.level === "cnv_booking");

describe("runVector and runVectors (source-of-truth spec §6)", () => {
  it("runs every vector of the booking lifecycle through the booking service, each one passing", async () => {
    const contract = await contractOf();
    expect(machineVectors(contract).map(vector => vector.id)).toEqual([
      "scn_aBookingIsDeclined",
      "scn_aConfirmedGuestIsSeated",
      "scn_aGuestDoesNotCome"
    ]);
    for (const vector of machineVectors(contract)) {
      expect((await runVector(vector, bookingsDriver())).failure).toBeUndefined();
    }
    expect(await runVector(machineVectors(contract)[2], bookingsDriver())).toEqual({
      id: "scn_aGuestDoesNotCome",
      steps: [{ active: ["requested"] }, { active: ["confirmed"] }, { active: ["no-show"] }]
    });
  });

  it("fails the vector a planted bug breaks, and conformance reports it on the transition it breaks", async () => {
    const contract = await contractOf();
    const seated = contract.vectors.find(vector => vector.id === "scn_aConfirmedGuestIsSeated");
    expect(await runVector(seated, bookingsDriver({ plantedBug: true }))).toEqual({
      id: "scn_aConfirmedGuestIsSeated",
      steps: [{ active: ["requested"] }, { active: ["confirmed"] }, { active: ["confirmed"] }],
      failure:
        'Scenario "A confirmed guest is seated", step 2 (guest.arrived): the design expects seated; the code is in ' +
        "confirmed"
    });
    const results = await runVectors(contract, bookingsDriver({ plantedBug: true }), {
      only: "booking.status",
      runner: "vitest"
    });
    const report = await conformOf(bookings(), results);
    expect(report.summary).toMatchObject({ passed: 2, diverged: 1, notRun: 2 });
    expect(report.findings[0]).toEqual({
      code: "diverged",
      severity: "high",
      title: expect.stringContaining("step 2 (guest.arrived)"),
      targets: ["edg_confirmedSeated"]
    });
  });

  it("keeps the states for the results file: the start, each step, a step that threw, the vectors not run", async () => {
    const contract = await contractOf();
    const driver = bookingsDriver();
    const throwing = {
      ...driver,
      apply: (handle, step) => {
        if (step.event === "guest.arrived") throw new Error("the table service is down");
        return driver.apply(handle, step);
      },
      skip: vector => (vector.id === "scn_aGuestDoesNotCome" ? "the clock cannot be moved yet" : undefined)
    };
    const results = await runVectors(contract, throwing, { only: ["cnv_booking"] });
    expect(results).toEqual({
      results: "1",
      contract: await contractDigest(contract),
      vectors: [
        { id: "scn_aBookingIsDeclined", steps: [{ active: ["requested"] }, { active: ["declined"] }] },
        {
          id: "scn_aConfirmedGuestIsSeated",
          steps: [{ active: ["requested"] }, { active: ["confirmed"] }, { error: "the table service is down" }]
        },
        { id: "scn_aGuestDoesNotCome", skipped: "the clock cannot be moved yet" },
        { id: "scn_theGuestIsToldItIsConfirmed", skipped: "not in this run (only cnv_booking)" },
        { id: "scn_theGuestIsToldItIsDeclined", skipped: "not in this run (only cnv_booking)" }
      ]
    });
    expect((await conformOf(bookings(), results)).findings.map(finding => finding.code)).toEqual([
      "threw",
      "notRun",
      "notRun",
      "notRun"
    ]);
  });

  it("names the contract it ran by the SHA-256 of its file, as statewright contract -o writes it", async () => {
    const contract = await contractOf();
    expect(await contractDigest(contract)).toBe(await sha256Hex(stringifyContract(contract)));
    expect((await runVectors(contract, bookingsDriver(), { only: "booking.status" })).contract).toBe(
      await contractDigest(contract)
    );
  });

  it("runs each machine with its own driver, keyed by level ID or subject, into one results file", async () => {
    const contract = await contractOf();
    const results = await runVectors(contract, { "booking.status": bookingsDriver() }, { runner: "vitest" });
    expect(results.vectors.slice(0, 3)).toEqual(
      (await runVectors(contract, bookingsDriver(), { only: "cnv_booking" })).vectors.slice(0, 3)
    );
    expect(results.vectors.slice(3)).toEqual([
      { id: "scn_theGuestIsToldItIsConfirmed", skipped: "no driver for its level (cnv_textGuest)" },
      { id: "scn_theGuestIsToldItIsDeclined", skipped: "no driver for its level (cnv_textGuest)" }
    ]);
  });

  it("refuses an only, or a driver's key, that names no level of the contract", async () => {
    const contract = await contractOf();
    await expect(runVectors(contract, bookingsDriver(), { only: "bookings.status" })).rejects.toThrow(
      "bookings.status is no level ID or subject of the contract"
    );
    await expect(runVectors(contract, { "bookings.status": bookingsDriver() })).rejects.toThrow(
      "bookings.status is no level ID or subject of the contract"
    );
  });

  it("writes the results file the tests leave, and refuses to write what is not results", async () => {
    const contract = await contractOf();
    const results = await runVectors(contract, bookingsDriver(), { only: "cnv_booking", runner: "vitest" });
    const file = join(await workspace(), "bookings.results.json");
    await writeResults(file, results);
    const text = await readFile(file, "utf8");
    expect(text).toBe(`${JSON.stringify(results, null, 2)}\n`);
    expect(parseResults(text)).toEqual({ ok: true, results });
    expect((await conformOf(bookings(), results)).summary).toMatchObject({ passed: 3, notRun: 2 });
    await expect(writeResults(file, { ...results, vectors: undefined })).rejects.toThrow(
      `Cannot write ${file}: the value given needs vectors, a list`
    );
  });
});
