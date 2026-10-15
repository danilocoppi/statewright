import { describe, expect, it } from "vitest";
import { reachedOf, start, step } from "../../src/simulate/index.js";
import { addDuration, durationBetween } from "../../src/simulate/time.js";
import { paymentsDoc } from "../helpers.js";
import { AT, begin, docOf, events, machine, of, walk } from "./helpers.js";

/** An offer that expires: `open` until accepted or until its timer runs out. */
function offer(timers, { edges = {}, nodes = {} } = {}) {
  return docOf(
    {
      cnv_offer: machine(
        "Offer",
        {
          nod_start: { kind: "initial" },
          nod_open: { kind: "state", name: "open" },
          nod_accepted: { kind: "state", name: "accepted" },
          nod_expired: { kind: "state", name: "expired", terminal: true },
          ...nodes
        },
        {
          edg_begin: { from: "nod_start", to: "nod_open" },
          edg_accept: { from: "nod_open", to: "nod_accepted", on: ["evt_accepted"] },
          edg_expire: { from: "nod_open", to: "nod_expired", after: "tmr_ttl" },
          ...edges
        }
      )
    },
    { events: events("accepted"), timers }
  );
}

const wait = duration => ({ do: { wait: duration } });

describe("timers (spec §16.8)", () => {
  it("arms an after timer when its state is entered and fires its transition once it is due", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "PT2H" } });
    const started = begin(doc);
    expect(started.session.timers).toEqual([
      { kind: "after", state: "nod_open", edge: "edg_expire", timer: "tmr_ttl", due: "2026-01-05T11:00:00Z" }
    ]);
    const early = walk(doc, started, wait("PT1H"));
    expect(early.session).toMatchObject({ clock: "2026-01-05T10:00:00Z", active: ["nod_open"] });
    const late = walk(doc, early, wait("PT1H30M"));
    expect(late.session).toMatchObject({ clock: "2026-01-05T11:30:00Z", active: ["nod_expired"], timers: [] });
    expect(of(late.trace, "timerFired")).toEqual([
      {
        type: "timerFired",
        kind: "after",
        state: "nod_open",
        edge: "edg_expire",
        timer: "tmr_ttl",
        due: "2026-01-05T11:00:00Z"
      }
    ]);
  });

  it("cancels the timer when its state is left first", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "PT2H" } });
    const accepted = walk(doc, begin(doc), "evt_accepted");
    expect(accepted.session.timers).toEqual([]);
    expect(of(accepted.trace, "timerCancelled")).toMatchObject([{ timer: "tmr_ttl", state: "nod_open" }]);
    expect(walk(doc, accepted, wait("P1D")).session.active).toEqual(["nod_accepted"]);
  });

  it("reads a deadline from the context, moved by its offset", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", at: "context.deadline", offset: "-P1D" } });
    const started = begin(doc, { context: { cnv_offer: { deadline: "2026-01-20" } } });
    expect(started.session.timers[0].due).toBe("2026-01-19T00:00:00Z");
  });

  it("fires a deadline already past at the next wait, never moving the clock back", () => {
    // The state it leads to arms its SLA from the clock at that moment: now, not the past deadline.
    const doc = offer(
      { tmr_ttl: { name: "ttl", at: "context.deadline" }, tmr_sla: { name: "an hour", duration: "PT1H" } },
      { nodes: { nod_expired: { kind: "state", name: "expired", terminal: true, sla: "tmr_sla" } } }
    );
    const started = begin(doc, { context: { cnv_offer: { deadline: "2026-01-01" } } });
    expect(started.session.timers[0].due).toBe("2026-01-01T00:00:00Z");
    const next = walk(doc, started, wait("next"));
    expect(next.session).toMatchObject({ clock: AT, active: ["nod_expired"] });
    expect(next.session.timers).toEqual([
      { kind: "sla", state: "nod_expired", timer: "tmr_sla", due: "2026-01-05T10:00:00Z" }
    ]);
  });

  it("does not arm a timer whose deadline the context does not hold, and says so", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", at: "context.deadline" } });
    const started = begin(doc);
    expect(started.session.timers).toEqual([]);
    expect(of(started.trace, "warning")).toEqual([
      {
        type: "warning",
        code: "unevaluated",
        message: "ttl is not armed: context.deadline holds no date",
        timer: "ttl"
      }
    ]);
  });

  it("counts business days Monday to Friday, without holidays", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "P2D", calendar: "business" } });
    const friday = start(doc, { canvas: "cnv_offer", at: "2026-01-09T09:00:00Z" });
    expect(friday.session.timers[0].due).toBe("2026-01-13T09:00:00Z");
    expect(addDuration(new Date("2026-01-12T09:00:00Z"), "-P1D", "business").toISOString()).toBe(
      "2026-01-09T09:00:00.000Z"
    );
    expect(addDuration(new Date("2026-01-10T09:00:00Z"), "P1W", "business").toISOString()).toBe(
      "2026-01-16T09:00:00.000Z"
    );
  });

  it("counts a long span of business days at once, landing where counting day by day lands", () => {
    // Day by day, as the calendar is defined: each day that is not a Saturday or a Sunday counts.
    const dayByDay = (from, days, sign) => {
      const date = new Date(from.getTime());
      for (let left = days; left > 0;) {
        date.setTime(date.getTime() + sign * 86_400_000);
        if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) left--;
      }
      return date.toISOString();
    };
    for (let day = 0; day < 7; day++) {
      const from = new Date(Date.UTC(2026, 0, 5 + day, 9));
      for (const days of [0, 1, 4, 5, 6, 9, 10, 11, 23, 500_000]) {
        expect(addDuration(from, `P${days}D`, "business").toISOString()).toBe(dayByDay(from, days, 1));
        expect(addDuration(from, `-P${days}D`, "business").toISOString()).toBe(dayByDay(from, days, -1));
      }
    }
  });

  it("does not arm a timer that would fall due past the year 9999, and says so", () => {
    for (const ttl of [
      { name: "ttl", duration: "P10000Y" },
      { name: "ttl", duration: "P999999999Y" },
      { name: "ttl", duration: "P100000000D", calendar: "business" }
    ]) {
      const started = begin(offer({ tmr_ttl: ttl }));
      expect(started.session.timers).toEqual([]);
      expect(of(started.trace, "warning")).toMatchObject([
        { code: "unevaluated", message: "ttl is not armed: it would fall due past the year 9999" }
      ]);
      expect(walk(offer({ tmr_ttl: ttl }), started, wait("PT1H")).session.active).toEqual(["nod_open"]);
    }
  });

  it("refuses a wait that goes past the year 9999", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "PT2H" } });
    for (const duration of ["P8000Y", "P99999999999D"]) {
      expect(walk(doc, begin(doc), wait(duration))).toMatchObject({
        status: "error",
        code: "badInput",
        message: `A wait of ${duration} goes past the year 9999`
      });
    }
  });

  it("warns, without moving, when a state stays past its SLA and when a reminder falls due", () => {
    const doc = offer(
      {
        tmr_ttl: { name: "ttl", at: "context.deadline", reminders: ["-P2D", "-P1D"] },
        tmr_sla: { name: "four hours", duration: "PT4H" }
      },
      { nodes: { nod_open: { kind: "state", name: "open", sla: "tmr_sla" } } }
    );
    const started = begin(doc, { context: { cnv_offer: { deadline: "2026-01-08T09:00:00Z" } } });
    const result = walk(doc, started, wait("P2DT1H"));
    expect(result.session.active).toEqual(["nod_open"]);
    expect(of(result.trace, "warning").map(entry => [entry.code, entry.message])).toEqual([
      ["sla", "open is still active past its SLA (four hours)"],
      ["reminder", "ttl: reminder -P2D from its deadline"],
      ["reminder", "ttl: reminder -P1D from its deadline"]
    ]);
  });

  it("waits until the next timer, or does nothing when none is armed", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "PT45M" } });
    const result = walk(doc, begin(doc), wait("next"));
    expect(result.session).toMatchObject({ clock: "2026-01-05T09:45:00Z", active: ["nod_expired"] });
    expect(walk(doc, result, wait("next")).trace).toEqual([{ type: "nothing" }]);
  });

  it("re-arms a timer each time an external self-transition enters its state again", () => {
    const doc = offer(
      { tmr_ttl: { name: "ttl", duration: "P30D" }, tmr_refresh: { name: "refresh", duration: "PT15M" } },
      { edges: { edg_refresh: { from: "nod_open", to: "nod_open", after: "tmr_refresh" } } }
    );
    const result = walk(doc, begin(doc), wait("PT1H"));
    expect(of(result.trace, "timerFired")).toHaveLength(4);
    expect(result.session.timers.map(item => [item.timer, item.due])).toEqual([
      ["tmr_refresh", "2026-01-05T10:15:00Z"],
      ["tmr_ttl", "2026-02-04T10:00:00Z"]
    ]);
  });

  it("stops the clock after a thousand timers in one wait (simulator spec §5.6)", () => {
    const doc = offer(
      { tmr_ttl: { name: "ttl", duration: "P30D" }, tmr_tick: { name: "tick", duration: "PT1M" } },
      { edges: { edg_tick: { from: "nod_open", to: "nod_open", after: "tmr_tick" } } }
    );
    const result = walk(doc, begin(doc), wait("P1D"));
    // A thousand ticks a minute apart from 09:00: the last at 01:40 the next day.
    expect(result.session.clock).toBe("2026-01-06T01:40:00Z");
    expect(of(result.trace, "warning").at(-1)).toMatchObject({ code: "timerFlood" });
  });

  it("refuses a wait that is not a duration", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "PT2H" } });
    expect(walk(doc, begin(doc), wait("2 hours"))).toMatchObject({ status: "error", code: "badInput" });
    expect(walk(doc, begin(doc), wait("-PT1H"))).toMatchObject({ status: "error", code: "badInput" });
  });
});

describe("effective periods", () => {
  it("enables a transition only within its period: from inclusive, until exclusive", () => {
    const doc = offer({ tmr_ttl: { name: "ttl", duration: "P30D" } });
    doc.canvases.cnv_offer.edges.edg_accept.effective = { from: "2026-01-05", until: "2026-01-06" };
    expect(walk(doc, begin(doc), "evt_accepted").session.active).toEqual(["nod_accepted"]);
    expect(walk(doc, begin(doc), wait("P1D"), "evt_accepted").session.active).toEqual(["nod_open"]);
  });
});

describe("durations", () => {
  it("writes the time between two instants as an ISO 8601 duration", () => {
    const at = value => new Date(value);
    expect(durationBetween(at("2026-01-05T09:00:00Z"), at("2026-01-15T09:00:00Z"))).toBe("P10D");
    expect(durationBetween(at("2026-01-05T09:00:00Z"), at("2026-01-06T11:30:00Z"))).toBe("P1DT2H30M");
    expect(durationBetween(at("2026-01-05T09:00:00Z"), at("2026-01-05T09:00:00Z"))).toBe("PT0S");
  });
});

describe("the payments example", () => {
  it("lets the expiry clock run out at the deadline the context holds", () => {
    const doc = paymentsDoc();
    const started = start(doc, {
      canvas: "cnv_lifecycle",
      at: AT,
      context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } }
    });
    const ran = step(doc, started.session, wait("P10D"));
    expect(reachedOf(ran.session).active).toContain("nod_expiryClock/nod_elapsed");
  });
});
