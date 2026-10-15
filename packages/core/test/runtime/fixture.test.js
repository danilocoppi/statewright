// The fixture system on the runtime (source-of-truth spec §2, §10, §12 row S4): the booking service running the design
// itself passes every vector of bookings; a trigger the design forbids is refused; the grace period fires through
// send; and a changed design changes what the service does, with no change to its code.
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { conformOf, runVectors } from "../../src/conform/index.js";
import { toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { fakeClock } from "../fixtures/bookings-api/bookings.js";
import { createBookingsOnRuntime } from "../fixtures/bookings-api/runtime.js";
import { runtimeDriver } from "../fixtures/bookings-api/runtime-driver.js";
import { readExample } from "../helpers.js";

const bookings = () => parse(readExample("bookings.sttw")).doc;
const AT = "2026-01-09T19:00:00Z";
const minutes = count => new Date(Date.parse(AT) + count * 60_000).toISOString().replace(".000Z", "Z");

describe("the booking service on the runtime (source-of-truth spec §7)", () => {
  it("passes every vector of the booking lifecycle", async () => {
    const doc = bookings();
    const { contract } = await toContract(doc);
    const results = await runVectors(contract, { "booking.status": runtimeDriver(doc) }, { runner: "vitest" });
    expect(await conformOf(doc, results)).toMatchObject({
      ok: true,
      summary: { passed: 3, diverged: 0, threw: 0, notRun: 2 }
    });
  });

  it("refuses a trigger the design does not allow, and says why", async () => {
    const service = await createBookingsOnRuntime({ doc: bookings(), clock: fakeClock(AT) });
    const id = service.book({ guests: 2 });
    expect(() => service.arrive(id)).toThrow("Booking bk_1: Nothing in the design takes guest.arrived from requested");
    expect(service.status(id)).toBe("requested");
  });

  it("schedules the grace period, and the timer fires through send once it is due", async () => {
    const clock = fakeClock(AT);
    const service = await createBookingsOnRuntime({ doc: bookings(), clock });
    const id = service.book({ guests: 2 });
    service.confirm(id);
    clock.set(minutes(29));
    service.sweep();
    expect(service.status(id)).toBe("confirmed");
    clock.set(minutes(30));
    service.sweep();
    expect(service.status(id)).toBe("no-show");
  });

  it("follows a changed design after a restart, with no change to its code", async () => {
    const longer = applyBatch(bookings(), [
      { type: "catalog.update", args: { id: "tmr_grace", set: { duration: "PT45M" } } }
    ]).doc;
    const clock = fakeClock(AT);
    const service = await createBookingsOnRuntime({ doc: longer, clock });
    const id = service.book({ guests: 2 });
    service.confirm(id);
    clock.set(minutes(30));
    service.sweep();
    expect(service.status(id)).toBe("confirmed");
    clock.set(minutes(45));
    service.sweep();
    expect(service.status(id)).toBe("no-show");
  });
});
