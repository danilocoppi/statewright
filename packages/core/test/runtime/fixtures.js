// A table booking: what the runtime's tests need that the bookings example does not have — a named guard without an
// expression, a condition only in words, actions on a transition and on entry, an emitted event and a timer.
import { docOf, events, flow, machine } from "../simulate/helpers.js";

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

/** Timers whose dates come from the context: one at the top level, one in the interior of "holding". */
export function timedDoc() {
  return docOf(
    {
      cnv_timed: machine(
        "Timed",
        {
          nod_start: { kind: "initial" },
          nod_waiting: { kind: "state", name: "waiting" },
          nod_due: { kind: "state", name: "due" },
          nod_snoozed: { kind: "state", name: "snoozed" },
          nod_holding: { kind: "state", name: "holding", inner: { canvas: "cnv_holding" } }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_waiting" },
          edg_due: { from: "nod_waiting", to: "nod_due", after: "tmr_due" },
          edg_snooze: {
            from: "nod_due",
            to: "nod_snoozed",
            on: ["evt_snooze"],
            actions: [{ assign: { "context.snoozeUntil": { var: "event.payload.until" } } }]
          },
          edg_wake: { from: "nod_snoozed", to: "nod_due", after: "tmr_snooze" },
          edg_hold: {
            from: "nod_due",
            to: "nod_holding",
            on: ["evt_hold"],
            actions: [{ assign: { "context.releaseAt": { var: "event.payload.releaseAt" } } }]
          }
        },
        { subject: "timed.status" }
      ),
      cnv_holding: machine(
        "Holding",
        {
          nod_holdStart: { kind: "initial" },
          nod_inside: { kind: "state", name: "inside" },
          nod_released: { kind: "state", name: "released", terminal: true }
        },
        {
          edg_holdBegin: { from: "nod_holdStart", to: "nod_inside" },
          edg_release: { from: "nod_inside", to: "nod_released", after: "tmr_release" }
        }
      )
    },
    {
      events: events("snooze", "hold"),
      timers: {
        tmr_due: { name: "due", at: "context.dueAt" },
        tmr_snooze: { name: "snooze", at: "context.snoozeUntil" },
        tmr_release: { name: "release", at: "context.releaseAt" }
      }
    }
  );
}

/** Ties: two transitions on go, a choice on decide whose branches can both hold, two transitions on the timer t. */
export function tieDoc() {
  return docOf(
    {
      cnv_tie: machine(
        "Tie",
        {
          nod_start: { kind: "initial" },
          nod_waiting: { kind: "state", name: "waiting" },
          nod_which: { kind: "choice", name: "which?" },
          nod_timed: { kind: "state", name: "timed" },
          nod_first: { kind: "state", name: "first", terminal: true },
          nod_second: { kind: "state", name: "second", terminal: true },
          nod_neither: { kind: "state", name: "neither", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_waiting" },
          edg_first: { from: "nod_waiting", to: "nod_first", on: ["evt_go"], guard: { guard: "grd_first" } },
          edg_second: { from: "nod_waiting", to: "nod_second", on: ["evt_go"], guard: { guard: "grd_second" } },
          edg_decide: { from: "nod_waiting", to: "nod_which", on: ["evt_decide"] },
          edg_whichFirst: { from: "nod_which", to: "nod_first", guard: { guard: "grd_first" } },
          edg_whichSecond: { from: "nod_which", to: "nod_second", guard: { guard: "grd_second" } },
          edg_whichNeither: { from: "nod_which", to: "nod_neither", else: true },
          edg_wait: { from: "nod_waiting", to: "nod_timed", on: ["evt_wait"] },
          edg_timedFirst: { from: "nod_timed", to: "nod_first", after: "tmr_t", guard: { guard: "grd_first" } },
          edg_timedSecond: { from: "nod_timed", to: "nod_second", after: "tmr_t", guard: { guard: "grd_second" } }
        },
        { subject: "tie.status" }
      )
    },
    {
      events: events("go", "decide", "wait"),
      guards: { grd_first: { name: "first" }, grd_second: { name: "second" } },
      timers: { tmr_t: { name: "t", duration: "PT1H" } }
    }
  );
}

/** A choice decided by the trigger's payload, through bound guards. */
export function pickDoc() {
  return docOf(
    {
      cnv_pick: machine(
        "Pick",
        {
          nod_start: { kind: "initial" },
          nod_waiting: { kind: "state", name: "waiting" },
          nod_which: { kind: "choice", name: "which?" },
          nod_big: { kind: "state", name: "big", terminal: true },
          nod_positive: { kind: "state", name: "positive", terminal: true },
          nod_none: { kind: "state", name: "none", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_waiting" },
          edg_decide: { from: "nod_waiting", to: "nod_which", on: ["evt_decide"] },
          edg_whichBig: { from: "nod_which", to: "nod_big", guard: { guard: "grd_big" } },
          edg_whichPositive: { from: "nod_which", to: "nod_positive", guard: { guard: "grd_positive" } },
          edg_whichNone: { from: "nod_which", to: "nod_none", else: true }
        },
        { subject: "pick.status" }
      )
    },
    { events: events("decide"), guards: { grd_big: { name: "big" }, grd_positive: { name: "positive" } } }
  );
}

/** A transition on check whose action runs a flow within the step: two edges leave the flow's node check. */
export function flowTieDoc() {
  return docOf(
    {
      cnv_flowTie: machine(
        "Flow tie",
        {
          nod_start: { kind: "initial" },
          nod_waiting: { kind: "state", name: "waiting" },
          nod_checked: { kind: "state", name: "checked", terminal: true }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_waiting" },
          edg_check: { from: "nod_waiting", to: "nod_checked", on: ["evt_check"], actions: [{ action: "act_check" }] }
        },
        { subject: "flowTie.status" }
      ),
      cnv_check: flow(
        "Check",
        {
          nod_s: { kind: "start" },
          nod_check: { kind: "action", name: "check", action: "act_log" },
          nod_a: { kind: "end" },
          nod_b: { kind: "end" }
        },
        {
          edg_s: { from: "nod_s", to: "nod_check" },
          edg_a: { from: "nod_check", to: "nod_a" },
          edg_b: { from: "nod_check", to: "nod_b" }
        }
      )
    },
    {
      events: events("check"),
      actions: { act_check: { name: "Check", inner: { canvas: "cnv_check" } }, act_log: { name: "Log" } }
    }
  );
}
