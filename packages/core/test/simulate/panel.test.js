import { describe, expect, it } from "vitest";
import { check } from "../../src/rules/index.js";
import { instancesOf, locate, moves, step } from "../../src/simulate/index.js";
import { paymentsDoc, readExample } from "../helpers.js";
import { AT, begin, docOf, events, machine } from "./helpers.js";

/** An order: created, then paid (two ways the document only names), cancelled through an endpoint, or expired. */
function order() {
  return docOf(
    {
      cnv_order: machine(
        "Order",
        {
          nod_start: { kind: "initial" },
          nod_created: { kind: "state", name: "created" },
          nod_paid: { kind: "state", name: "paid" },
          nod_partly: { kind: "state", name: "partly paid" },
          nod_cancelled: { kind: "state", name: "cancelled", terminal: true },
          nod_expired: { kind: "state", name: "expired", terminal: true },
          nod_check: { kind: "choice", name: "refund?" }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_created" },
          edg_pay: { from: "nod_created", to: "nod_paid", on: ["evt_paid"], guard: { text: "in full" }, name: "full" },
          edg_payPart: {
            from: "nod_created",
            to: "nod_partly",
            on: ["evt_paid"],
            guard: { text: "in part" },
            label: "part"
          },
          edg_cancel: { from: "nod_created", to: "nod_cancelled", via: "ept_cancel" },
          edg_expire: { from: "nod_created", to: "nod_expired", after: "tmr_ttl" },
          edg_refund: { from: "nod_paid", to: "nod_check", on: ["evt_refunded"] },
          edg_refundAll: { from: "nod_check", to: "nod_cancelled", guard: { expr: { "==": [1, 2] } } }
        }
      )
    },
    {
      events: events("paid", "refunded"),
      endpoints: { ept_cancel: { name: "Cancel", method: "POST", path: "/orders/{id}/cancel" } },
      timers: { tmr_ttl: { name: "ttl", duration: "PT2H" } }
    }
  );
}

describe("what the editor's panel reads from the engine (simulator spec §5.4, §6.2, §6.3)", () => {
  it("names the edge of each answer a question offers, as the figure labels it", () => {
    const doc = order();
    const asked = step(doc, begin(doc).session, { do: { event: "evt_paid" } });
    expect(asked.question.candidates).toEqual([
      { value: "edg_pay", to: "paid", guard: { text: "in full" }, name: "full" },
      { value: "edg_payPart", to: "partly paid", guard: { text: "in part" }, name: "part" },
      { value: null }
    ]);
  });

  it("says which edges each move takes from the states active now, and those a question chooses between", () => {
    const doc = order();
    expect(moves(doc, begin(doc).session).map(move => [move.label, move.edges])).toEqual([
      ["paid", ["edg_pay", "edg_payPart"]],
      ["POST /orders/{id}/cancel", ["edg_cancel"]],
      ["ttl", ["edg_expire"]]
    ]);
  });

  it("says where a run stops when it cannot go on", () => {
    const doc = order();
    const paid = step(doc, begin(doc).session, {
      do: { event: "evt_paid" },
      answers: [{ kind: "transition", at: "nod_created", value: "edg_pay" }]
    });
    const stuck = step(doc, paid.session, { do: { event: "evt_refunded" } });
    expect(stuck).toMatchObject({ status: "error", code: "stuck", details: { path: "nod_check" } });
  });

  it("keeps the engine's message in scenario.diverged, so Problems say why a step can no longer be taken", () => {
    const doc = paymentsDoc();
    const init = { at: AT, context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };
    doc.annotations.scenarios = {
      scn_gone: {
        name: "Gone",
        canvas: "cnv_lifecycle",
        start: init,
        steps: [{ do: { event: "evt_x" }, reached: { active: [] } }]
      }
    };
    expect(check(doc).find(problem => problem.code === "scenario.diverged").message).toBe(
      'scenario "Gone" goes elsewhere at step 1: it can no longer be taken. There is no event evt_x'
    );
  });

  it("locates a path level by level, and finds nothing for a path the document no longer has", () => {
    const doc = paymentsDoc();
    expect(locate(doc, "cnv_lifecycle", "nod_expiryClock/nod_running")).toEqual([
      { canvas: "cnv_lifecycle", node: "nod_expiryClock" },
      { canvas: "cnv_expiryClock", node: "nod_running" }
    ]);
    expect(locate(doc, "cnv_lifecycle", "nod_expiryClock/nod_gone")).toBeNull();
    expect(locate(doc, "cnv_lifecycle", "nod_clients")).toBeNull();
    const batch = JSON.parse(readExample("payout-batch.statewright.json"));
    expect(locate(batch, "cnv_payOutBatch", "nod_each/nod_pix")).toEqual([
      { canvas: "cnv_payOutBatch", node: "nod_each" },
      { canvas: "cnv_payOne", node: "nod_pix" }
    ]);
  });

  it("lists the machine instances a run has, each with its key, its name and the type of its context", () => {
    expect(instancesOf(paymentsDoc(), "cnv_lifecycle")).toEqual([
      { key: "cnv_lifecycle", path: "", canvas: "cnv_lifecycle", name: "Lifecycle engine" },
      { key: "nod_complianceHold", path: "nod_complianceHold", canvas: "cnv_complianceHold", name: "Compliance hold" },
      {
        key: "nod_expiryClock",
        path: "nod_expiryClock",
        canvas: "cnv_expiryClock",
        name: "Expiry clock",
        context: "typ_expiryContext"
      },
      {
        key: "nod_sendCrossBorder",
        path: "nod_sendCrossBorder",
        canvas: "cnv_crossBorderSend",
        name: "Cross-border send"
      }
    ]);
    const batch = JSON.parse(readExample("payout-batch.statewright.json"));
    expect(instancesOf(batch, "cnv_payOutBatch")).toEqual([]);
    expect(instancesOf(batch, "cnv_payOne")).toEqual([]);
  });
});
