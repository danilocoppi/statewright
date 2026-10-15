// A table booking: what the runtime's tests need that the bookings example does not have — a named guard without an
// expression, a condition only in words, actions on a transition and on entry, an emitted event and a timer.
import { docOf, events, machine } from "../simulate/helpers.js";

export function tableDoc() {
  return docOf(
    {
      cnv_table: machine(
        "Table",
        {
          nod_start: { kind: "initial" },
          nod_requested: { kind: "state", name: "requested" },
          nod_confirmed: {
            kind: "state",
            name: "confirmed",
            onEntry: [{ action: "act_sendConfirmation" }, { emit: "evt_tableHeld" }]
          },
          nod_seated: { kind: "state", name: "seated", terminal: true },
          nod_lapsed: { kind: "state", name: "lapsed", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_requested" },
          edg_confirm: {
            from: "nod_requested",
            to: "nod_confirmed",
            on: ["evt_confirmed"],
            guard: { guard: "grd_small" },
            actions: [{ action: "act_notify", args: { guests: { var: "context.guests" } } }]
          },
          edg_lapse: { from: "nod_requested", to: "nod_lapsed", after: "tmr_hold" },
          edg_seat: { from: "nod_confirmed", to: "nod_seated", on: ["evt_seated"], guard: { text: "a table is free" } }
        },
        { subject: "table.status" }
      )
    },
    {
      events: events("confirmed", "seated", "table.held"),
      actions: { act_notify: { name: "notify guest" }, act_sendConfirmation: { name: "send confirmation" } },
      guards: { grd_small: { name: "party is small" } },
      timers: { tmr_hold: { name: "hold", duration: "PT2H" } }
    }
  );
}

/** The party-size guard the table needs. */
export const small = { "party is small": context => context.guests <= 8 };
