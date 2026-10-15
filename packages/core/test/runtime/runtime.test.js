// statewright/runtime (source-of-truth spec §7, §10): a design's machines run by a system — what createRuntime
// refuses, starting a record, sending events, calls and timers, each reason a trigger is refused, what can happen
// next, regions, and a design that changed under a stored snapshot.
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { createRuntime, RuntimeError } from "../../src/runtime/index.js";
import { parse } from "../../src/serialize/parse.js";
import { computeHashes } from "../../src/signature.js";
import { readExample } from "../helpers.js";
import { docOf, machine } from "../simulate/helpers.js";
import { small, tableDoc } from "./fixtures.js";

const AT = "2026-01-05T09:00:00Z";
const bookings = () => parse(readExample("bookings.sttw")).doc;
const table = async (guards = small) => (await createRuntime(tableDoc(), { guards })).machine("table.status");

/** What createRuntime throws, as plain data. */
async function refusalOf(doc, options) {
  try {
    await createRuntime(doc, options);
  } catch (error) {
    expect(error).toBeInstanceOf(RuntimeError);
    return { code: error.code, message: error.message, problems: error.problems };
  }
  throw new Error("createRuntime did not refuse");
}

describe("createRuntime (source-of-truth spec §7)", () => {
  it("refuses a design with errors, another design than expected, and guards it cannot decide", async () => {
    const broken = applyBatch(bookings(), [
      {
        type: "edge.add",
        args: {
          canvas: "cnv_booking",
          id: "edg_again",
          edge: { from: "nod_seated", to: "nod_requested", on: ["evt_bookingConfirmed"] }
        }
      }
    ]).doc;
    expect(await refusalOf(broken)).toMatchObject({
      code: "design",
      message: expect.stringMatching(/^The design has 1 error\(s\), the first: /),
      problems: [{ code: "machine.terminalWithExits", severity: "error" }]
    });

    const { content } = await computeHashes(bookings());
    expect((await createRuntime(bookings(), { expect: content })).content).toBe(content);
    expect(await refusalOf(bookings(), { expect: "0".repeat(64) })).toEqual({
      code: "expect",
      message: `The design is not the one expected: its content hash is ${content.slice(0, 12)}, not 000000000000`,
      problems: [{ expected: "0".repeat(64), found: content }]
    });

    expect(await refusalOf(tableDoc())).toEqual({
      code: "guards",
      message: "The guard party is small has no expression: bind a function to it",
      problems: [
        {
          guard: "party is small",
          problem: "unbound",
          message: "The guard party is small has no expression: bind a function to it"
        }
      ]
    });
    expect((await refusalOf(tableDoc(), { guards: { ...small, "party is large": () => true } })).problems).toEqual([
      { guard: "party is large", problem: "unknown", message: "The design has no guard party is large" }
    ]);
  });

  it("gives a machine that runs on its own by its subject or its level, and refuses one that does not", async () => {
    const runtime = await createRuntime(bookings());
    expect(runtime.machine("booking.status")).toMatchObject({ id: "cnv_booking", name: "Booking lifecycle" });
    expect(runtime.machine("cnv_booking")).toBe(runtime.machine("booking.status"));
    expect(() => runtime.machine("table.status")).toThrow(
      expect.objectContaining({ code: "machine", message: "No machine of the design runs on its own as table.status" })
    );
    const payments = await createRuntime(parse(readExample("payments.sttw")).doc, {
      guards: { "Scaled payout": () => false }
    });
    // The cross-border send is the interior of a state of the lifecycle: it runs inside it, not on its own.
    expect(() => payments.machine("transaction.status")).toThrow(RuntimeError);
  });
});

describe("a machine of the runtime (source-of-truth spec §7)", () => {
  it("starts a record at its initial state, or at an entry by its name or the call that reaches it", async () => {
    const booking = (await createRuntime(bookings())).machine("booking.status");
    const started = booking.start({ entry: "POST /bookings", at: AT, context: { guests: 2 } });
    expect(started).toMatchObject({ state: "requested", snapshot: { machine: "cnv_booking" } });
    expect(started.snapshot.session.context).toEqual({ cnv_booking: { guests: 2 } });
    expect(booking.start({ entry: "the front door", at: AT })).toEqual({
      refused: { reason: "noEntry", message: "Booking lifecycle has no entry the front door" },
      snapshot: undefined
    });
    expect(booking.start({ entry: "POST /bookings", at: "tonight" }).refused.reason).toBe("badInput");
    expect((await table()).start({ at: AT, context: { guests: 4 } })).toMatchObject({
      state: "requested",
      effects: {
        actions: [],
        events: [],
        timers: { schedule: [{ timer: "hold", kind: "after", state: "requested", due: "2026-01-05T11:00:00Z" }] }
      }
    });
  });

  it("sends an event by name: a new snapshot, the state, and the effects in order", async () => {
    const machine = await table();
    const { snapshot } = machine.start({ at: AT, context: { guests: 4 } });
    const before = structuredClone(snapshot);
    const sent = machine.send(snapshot, { event: "confirmed", at: "2026-01-05T09:10:00Z" });
    expect(sent.state).toBe("confirmed");
    expect(sent.effects).toEqual({
      actions: [
        { action: "notify guest", args: { guests: 4 }, transition: "edg_confirm" },
        { action: "send confirmation", args: {}, state: "confirmed", on: "entry" }
      ],
      events: [{ event: "table.held", payload: null }],
      timers: { schedule: [], cancel: [{ timer: "hold", kind: "after", state: "requested" }] }
    });
    expect(sent.snapshot.session.clock).toBe("2026-01-05T09:10:00Z");
    expect(snapshot).toEqual(before);
    expect(JSON.parse(JSON.stringify(sent.snapshot))).toEqual(sent.snapshot);
  });

  it("refuses what the design does not allow, saying why, with the snapshot as it was", async () => {
    const machine = await table();
    const { snapshot } = machine.start({ at: AT, context: { guests: 4 } });
    const at = "2026-01-05T09:10:00Z";
    const refused = (from, input) => {
      const result = machine.send(from, input);
      expect(result.snapshot).toBe(from);
      return result.refused;
    };
    expect(refused(snapshot, { event: "seated", at })).toEqual({
      reason: "noTransition",
      message: "Nothing in the design takes seated from requested"
    });
    expect(refused(snapshot, { event: "order.paid", at })).toEqual({
      reason: "noTransition",
      message: "The design has no event order.paid"
    });
    const large = machine.start({ at: AT, context: { guests: 12 } }).snapshot;
    expect(refused(large, { event: "confirmed", at })).toEqual({
      reason: "guard",
      message: "Every transition confirmed takes from requested is guarded, and no guard holds"
    });
    const confirmed = machine.send(snapshot, { event: "confirmed", at }).snapshot;
    expect(refused(confirmed, { event: "seated", at })).toMatchObject({
      reason: "needs",
      message: "The design asks a question no bound guard answers",
      question: {
        kind: "transition",
        candidates: [{ value: "edg_seat", guard: { text: "a table is free" } }, { value: null }]
      }
    });
    const lapsed = machine.send(snapshot, { timer: "hold", at: "2026-01-05T11:00:00Z" }).snapshot;
    expect(refused(lapsed, { event: "confirmed", at: "2026-01-05T11:01:00Z" })).toEqual({
      reason: "final",
      message: "lapsed is final: nothing leaves it"
    });
    expect(refused(snapshot, { event: "confirmed" }).reason).toBe("badInput");
    expect(refused(snapshot, { event: "confirmed", timer: "hold", at }).reason).toBe("badInput");
    const failing = await table({
      "party is small": () => {
        throw new Error("no table plan");
      }
    });
    const started = failing.start({ at: AT }).snapshot;
    expect(failing.send(started, { event: "confirmed", at }).refused).toEqual({
      reason: "error",
      message: "The guard party is small failed: no table plan",
      code: "guard",
      guard: "grd_small"
    });
  });

  it("never moves time back, and refuses a snapshot of another machine", async () => {
    const machine = await table();
    const { snapshot } = machine.start({ at: "2026-01-05T10:00:00Z", context: { guests: 4 } });
    const late = machine.send(snapshot, { event: "confirmed", at: "2026-01-05T09:30:00Z" });
    expect(late).toMatchObject({ state: "confirmed", snapshot: { session: { clock: "2026-01-05T10:00:00Z" } } });
    const booking = (await createRuntime(bookings())).machine("booking.status");
    expect(booking.send(snapshot, { event: "booking.confirmed", at: AT }).refused).toEqual({
      reason: "unknownState",
      message: "This snapshot is not one of Booking lifecycle's"
    });
  });

  it("fires a timer the system sends once it is due, and refuses it before or when nothing arms it", async () => {
    const machine = await table();
    const { snapshot } = machine.start({ at: AT, context: { guests: 4 } });
    expect(machine.send(snapshot, { timer: "hold", at: "2026-01-05T10:00:00Z" }).refused).toEqual({
      reason: "notDue",
      message: "hold is due at 2026-01-05T11:00:00Z",
      due: "2026-01-05T11:00:00Z"
    });
    const lapsed = machine.send(snapshot, { timer: "hold", at: "2026-01-05T11:00:30Z" });
    expect(lapsed).toMatchObject({
      state: "lapsed",
      snapshot: { session: { clock: "2026-01-05T11:00:30Z", timers: [] } }
    });
    const confirmed = machine.send(snapshot, { event: "confirmed", at: "2026-01-05T09:10:00Z" }).snapshot;
    expect(machine.send(confirmed, { timer: "hold", at: "2026-01-05T11:00:00Z" }).refused).toEqual({
      reason: "noTransition",
      message: "hold is not armed by the states active now"
    });
  });

  it("says what can happen next, with where each leads, and whether a trigger can be sent now", async () => {
    const machine = await table();
    const four = machine.start({ at: AT, context: { guests: 4 } }).snapshot;
    expect(machine.moves(four)).toEqual([
      { event: "confirmed", to: ["confirmed"] },
      { timer: "hold", due: "2026-01-05T11:00:00Z", to: ["lapsed"] }
    ]);
    const twelve = machine.start({ at: AT, context: { guests: 12 } }).snapshot;
    expect(machine.moves(twelve)).toEqual([{ timer: "hold", due: "2026-01-05T11:00:00Z", to: ["lapsed"] }]);
    expect(machine.can(four, { event: "confirmed" })).toEqual({ ok: true });
    expect(machine.can(twelve, { event: "confirmed" })).toMatchObject({ ok: false, reason: "guard" });
    expect(machine.can(four, { timer: "hold" })).toMatchObject({ ok: false, reason: "notDue" });
  });

  it("runs a machine with regions: its state is the list of the active ones, by path", async () => {
    const runtime = await createRuntime(parse(readExample("payments.sttw")).doc, {
      guards: { "Scaled payout": () => false }
    });
    const lifecycle = runtime.machine("cnv_lifecycle");
    const started = lifecycle.start({ at: AT });
    expect(started.state).toEqual([
      "compliance_hold/clear",
      "expiry_clock/running",
      "send_cross_border/awaiting_funds"
    ]);
    const held = lifecycle.send(started.snapshot, { event: "hold.opened", at: "2026-01-05T09:01:00Z" });
    expect(held.state).toEqual([
      "compliance_hold/in_review",
      "expiry_clock/running",
      "send_cross_border/awaiting_funds"
    ]);
  });

  it("follows a changed design after a restart, and refuses a snapshot whose state the design lost", async () => {
    const before = await createRuntime(bookings());
    const booking = before.machine("booking.status");
    const started = booking.start({ entry: "POST /bookings", at: AT });
    const confirmed = booking.send(started.snapshot, { event: "booking.confirmed", at: AT }).snapshot;

    const changed = applyBatch(bookings(), [
      {
        type: "catalog.add",
        args: { collection: "events", id: "evt_guestCameLate", item: { name: "guest.came.late" } }
      },
      {
        type: "edge.add",
        args: {
          canvas: "cnv_booking",
          id: "edg_late",
          edge: { from: "nod_confirmed", to: "nod_seated", on: ["evt_guestCameLate"] }
        }
      }
    ]).doc;
    const after = await createRuntime(changed);
    const late = after
      .machine("booking.status")
      .send(confirmed, { event: "guest.came.late", at: "2026-01-05T09:40:00Z" });
    expect(late.state).toBe("seated");
    expect(late.snapshot.design).toBe(after.content);
    expect(after.content).not.toBe(before.content);

    // The design drops `confirmed` (and the no-show it led to): a guest is seated from `requested`.
    const lost = applyBatch(bookings(), [
      { type: "node.remove", args: { id: "nod_noShow", cascade: true } },
      { type: "node.remove", args: { id: "nod_confirmed", cascade: true } },
      {
        type: "edge.add",
        args: {
          canvas: "cnv_booking",
          id: "edg_requestedSeated",
          edge: { from: "nod_requested", to: "nod_seated", on: ["evt_guestArrived"] }
        }
      }
    ]).doc;
    const without = (await createRuntime(lost)).machine("booking.status");
    expect(without.send(confirmed, { event: "guest.arrived", at: AT }).refused).toEqual({
      reason: "unknownState",
      message: "The design no longer has the state nod_confirmed: migrate the record",
      states: ["nod_confirmed"]
    });
    expect(without.moves(confirmed)).toEqual([]);
  });
});

/** A payment waiting for its deadline: two `after` transitions on one timer, decided by the context. */
function deadlineDoc() {
  return docOf(
    {
      cnv_payment: machine(
        "Payment",
        {
          nod_start: { kind: "initial" },
          nod_waiting: { kind: "state", name: "waiting", sla: "tmr_watch" },
          nod_ok: { kind: "state", name: "ok", terminal: true },
          nod_expired: { kind: "state", name: "expired", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_waiting" },
          edg_ok: {
            from: "nod_waiting",
            to: "nod_ok",
            after: "tmr_deadline",
            guard: { expr: { "==": [{ var: "context.paid" }, true] } }
          },
          edg_expired: {
            from: "nod_waiting",
            to: "nod_expired",
            after: "tmr_deadline",
            guard: { expr: { "==": [{ var: "context.paid" }, false] } }
          }
        },
        { subject: "payment.status" }
      )
    },
    {
      timers: { tmr_deadline: { name: "deadline", duration: "PT1H" }, tmr_watch: { name: "watch", duration: "PT30M" } }
    }
  );
}

describe("what systems in production meet (S4's final review)", () => {
  it("fires every transition a timer drives, as the Simulator does, and consumes a timer whose guards all fail", async () => {
    const payment = (await createRuntime(deadlineDoc())).machine("payment.status");
    const unpaid = payment.start({ at: AT, context: { paid: false } });
    // Only the `after` timers are the system's to send: an SLA is the Simulator's warning.
    expect(unpaid.effects.timers.schedule).toEqual([
      { timer: "deadline", kind: "after", state: "waiting", due: "2026-01-05T10:00:00Z" }
    ]);
    expect(payment.send(unpaid.snapshot, { timer: "deadline", at: "2026-01-05T10:00:00Z" }).state).toBe("expired");
    const paid = payment.start({ at: AT, context: { paid: true } }).snapshot;
    expect(payment.send(paid, { timer: "deadline", at: "2026-01-05T10:00:00Z" }).state).toBe("ok");
    const unknown = payment.start({ at: AT, context: {} }).snapshot;
    const fell = payment.send(unknown, { timer: "deadline", at: "2026-01-05T10:00:00Z" });
    expect(fell).toMatchObject({ state: "waiting", effects: { actions: [], events: [] } });
    expect(fell.snapshot.session.timers.filter(armed => armed.kind === "after")).toEqual([]);
  });

  it("refuses a guard function that returns a promise: guards are synchronous", async () => {
    await expect(createRuntime(tableDoc(), { guards: { "party is small": async () => false } })).rejects.toThrow(
      expect.objectContaining({ code: "guards", message: "party is small is asynchronous: guards are synchronous" })
    );
    const promising = await table({ "party is small": () => Promise.resolve(false) });
    const { snapshot } = promising.start({ at: AT, context: { guests: 20 } });
    expect(promising.send(snapshot, { event: "confirmed", at: AT }).refused).toMatchObject({
      reason: "error",
      code: "guard",
      message: "The guard party is small failed: it returned a promise, and guards are synchronous"
    });
  });

  it("decides an entry's guard before a record starts there", async () => {
    const guarded = applyBatch(bookings(), [
      { type: "catalog.add", args: { collection: "guards", id: "grd_small", item: { name: "party is small" } } },
      { type: "node.update", args: { id: "nod_book", set: { guard: { guard: "grd_small" } } } }
    ]).doc;
    const booking = (await createRuntime(guarded, { guards: small })).machine("booking.status");
    expect(booking.start({ entry: "POST /bookings", at: AT, context: { guests: 4 } }).state).toBe("requested");
    expect(booking.start({ entry: "POST /bookings", at: AT, context: { guests: 20 } })).toEqual({
      refused: { reason: "guard", message: "The entry POST /bookings is guarded, and its guard does not hold" },
      snapshot: undefined
    });
    const inWords = applyBatch(bookings(), [
      { type: "node.update", args: { id: "nod_book", set: { guard: { text: "a table is free" } } } }
    ]).doc;
    const asked = (await createRuntime(inWords)).machine("booking.status");
    expect(asked.start({ entry: "POST /bookings", at: AT }).refused).toMatchObject({
      reason: "needs",
      question: { kind: "entry", guard: { text: "a table is free" } }
    });
  });

  it("refuses a record whose state gained an inner level it never entered, so the system migrates it", async () => {
    const booking = (await createRuntime(bookings())).machine("booking.status");
    const started = booking.start({ entry: "POST /bookings", at: AT });
    const confirmed = booking.send(started.snapshot, { event: "booking.confirmed", at: AT }).snapshot;
    const deeper = applyBatch(bookings(), [
      {
        type: "canvas.create",
        args: { kind: "machine", name: "Confirmed", id: "cnv_confirmed", owner: "nod_confirmed" }
      },
      { type: "node.add", args: { canvas: "cnv_confirmed", id: "nod_in", node: { kind: "initial" } } },
      {
        type: "node.add",
        args: { canvas: "cnv_confirmed", id: "nod_holding", node: { kind: "state", name: "holding" } }
      },
      { type: "edge.add", args: { canvas: "cnv_confirmed", id: "edg_in", edge: { from: "nod_in", to: "nod_holding" } } }
    ]).doc;
    const after = (await createRuntime(deeper)).machine("booking.status");
    expect(after.send(confirmed, { event: "guest.arrived", at: AT }).refused).toEqual({
      reason: "unknownState",
      message: "confirmed now has an inner level the record never entered: migrate the record",
      states: ["nod_confirmed"]
    });
  });
});
