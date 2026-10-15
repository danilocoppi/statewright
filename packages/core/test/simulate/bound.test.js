// What the runtime asks of the engine (source-of-truth spec §7): named guards without an expression decided by
// functions the caller binds, and one armed timer fired when the system says it is due.
import { describe, expect, it } from "vitest";
import { fire, moves, step } from "../../src/simulate/index.js";
import { AT, begin, docOf, events, machine, of } from "./helpers.js";

/** A table booking: `requested` until confirmed (only for a small party) or until its hold runs out. */
function booking() {
  return docOf(
    {
      cnv_booking: machine(
        "Booking",
        {
          nod_start: { kind: "initial" },
          nod_requested: { kind: "state", name: "requested" },
          nod_confirmed: { kind: "state", name: "confirmed" },
          nod_lapsed: { kind: "state", name: "lapsed", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_requested" },
          edg_confirm: {
            from: "nod_requested",
            to: "nod_confirmed",
            on: ["evt_confirmed"],
            guard: { guard: "grd_small" }
          },
          edg_lapse: { from: "nod_requested", to: "nod_lapsed", after: "tmr_hold" }
        }
      )
    },
    {
      events: events("confirmed"),
      guards: { grd_small: { name: "party is small" } },
      timers: { tmr_hold: { name: "hold", duration: "PT2H" } }
    }
  );
}

const guests = count => ({ context: { cnv_booking: { guests: count } } });

describe("guards bound to functions (source-of-truth spec §7)", () => {
  it("asks about a named guard without an expression, unless a function decides it", () => {
    const doc = booking();
    const { session } = begin(doc, guests(4));
    expect(step(doc, session, { do: { event: "evt_confirmed" } })).toMatchObject({
      status: "needs",
      question: { kind: "transition", at: "nod_requested" }
    });
    const seen = [];
    const guards = {
      grd_small: (context, input) => {
        seen.push({ context, input });
        return context.guests <= 8;
      }
    };
    const confirmed = step(doc, session, { do: { event: "evt_confirmed", payload: { by: "staff" } } }, { guards });
    expect(confirmed.session.active).toEqual(["nod_confirmed"]);
    expect(seen).toEqual([{ context: { guests: 4 }, input: { name: "confirmed", payload: { by: "staff" } } }]);
    const large = begin(doc, guests(12)).session;
    const refused = step(doc, large, { do: { event: "evt_confirmed" } }, { guards });
    expect(refused).toMatchObject({ status: "done", session: { active: ["nod_requested"] } });
    expect(of(refused.trace, "nothing")).toHaveLength(1);
  });

  it("stops with an error when a bound guard throws, the session as it was", () => {
    const doc = booking();
    const { session } = begin(doc, guests(4));
    const guards = {
      grd_small: () => {
        throw new Error("no table plan");
      }
    };
    expect(step(doc, session, { do: { event: "evt_confirmed" } }, { guards })).toMatchObject({
      status: "error",
      code: "guard",
      message: "The guard party is small failed: no table plan"
    });
  });

  it("offers a move only when the bound guard lets it through", () => {
    const doc = booking();
    const guards = { grd_small: context => context.guests <= 8 };
    const offered = session => moves(doc, session, { guards }).map(move => move.label);
    expect(offered(begin(doc, guests(4)).session)).toEqual(["confirmed", "hold"]);
    expect(offered(begin(doc, guests(12)).session)).toEqual(["hold"]);
  });
});

describe("fire: one armed timer, when the system says (source-of-truth spec §7)", () => {
  it("fires the timer once the clock reaches it, without moving the clock", () => {
    const doc = booking();
    const { session } = begin(doc, guests(4));
    expect(fire(doc, session, { timer: "tmr_hold" })).toEqual({
      status: "error",
      code: "notDue",
      message: "hold is due at 2026-01-05T11:00:00Z",
      details: { due: "2026-01-05T11:00:00Z" },
      trace: []
    });
    const later = { ...session, clock: "2026-01-05T11:05:00Z" };
    const fired = fire(doc, later, { timer: "tmr_hold" });
    expect(fired.session).toMatchObject({ clock: "2026-01-05T11:05:00Z", active: ["nod_lapsed"], timers: [] });
    expect(of(fired.trace, "transition")).toEqual([
      { type: "transition", edge: "edg_lapse", from: "nod_requested", to: "nod_lapsed" }
    ]);
    expect(session.active).toEqual(["nod_requested"]);
  });

  it("refuses a timer no active state arms, and a flow's", () => {
    const doc = booking();
    const confirmed = step(
      doc,
      begin(doc, guests(4)).session,
      { do: { event: "evt_confirmed" } },
      {
        guards: { grd_small: () => true }
      }
    ).session;
    expect(fire(doc, confirmed, { timer: "tmr_hold" })).toMatchObject({
      status: "error",
      code: "notArmed",
      message: "hold is not armed by the states active now"
    });
    const flowDoc = docOf({ cnv_f: { kind: "flow", name: "F", nodes: {}, edges: {} } });
    expect(fire(flowDoc, { canvas: "cnv_f", clock: AT, timers: [] }, { timer: "tmr_hold" })).toMatchObject({
      status: "error",
      code: "badInput"
    });
  });
});
