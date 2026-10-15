// statewright/contract (source-of-truth spec §5): a design as a language-neutral contract — machines by the names code
// holds, flows as structure, scenarios as test vectors — written the same way for the same design.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { parseContract, stringifyContract, toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { readExample } from "../helpers.js";
import { clashingDoc, ordersDoc } from "./fixtures.js";

const example = name => parse(readExample(`${name}.sttw`)).doc;
const rendered = name =>
  readFileSync(new URL(`../../../../examples/rendered/${name}/contract.json`, import.meta.url), "utf8");

describe("toContract (source-of-truth spec §5)", () => {
  it.each(["bookings", "get-paid-as-built", "payments", "payout-batch"])(
    "writes the contract of %s as examples/rendered holds it (run npm run examples:render)",
    async name => {
      const { contract, problems } = await toContract(example(name));
      expect(stringifyContract(contract)).toBe(rendered(name));
      expect(problems).toEqual([]);
      expect(contract.stale).toEqual([]);
    }
  );

  it("says where it comes from: the project, the format and the specification's hash, which layout does not change", async () => {
    const doc = example("bookings");
    const { contract } = await toContract(doc);
    expect(contract.contract).toBe("1");
    expect(contract.source).toEqual({
      project: "prj_bookings",
      name: "Bookings",
      format: "1.2",
      content: doc.signature.content
    });
    const moved = applyBatch(doc, [
      { type: "layout.node.set", args: { canvas: "cnv_booking", id: "nod_seated", x: 1, y: 2 } }
    ]).doc;
    expect((await toContract(moved)).contract.source.content).toBe(doc.signature.content);
    const renamed = applyBatch(doc, [{ type: "node.update", args: { id: "nod_guest", set: { name: "Diner" } } }]).doc;
    expect((await toContract(renamed)).contract.source.content).not.toBe(doc.signature.content);
  });

  it("gives a machine's states by the values its field holds, how a record starts, and each transition's triggers by name", async () => {
    const [machine] = (await toContract(example("bookings"))).contract.machines;
    expect(machine).toMatchObject({
      id: "cnv_booking",
      name: "Booking lifecycle",
      subject: "booking.status",
      completeness: "complete",
      stage: "target",
      owner: "nod_bookingApi"
    });
    expect(machine.states.map(state => state.name)).toEqual([
      "confirmed",
      "declined",
      "no-show",
      "requested",
      "seated"
    ]);
    expect(machine.states.find(state => state.name === "seated")).toEqual({
      id: "nod_seated",
      name: "seated",
      outcome: "success",
      final: true
    });
    expect(machine.starts).toEqual([
      { id: "nod_book", kind: "entry", name: "POST /bookings", to: "requested", via: "POST /bookings", by: "Guest" }
    ]);
    expect(machine.transitions).toContainEqual({
      id: "edg_confirmedNoShow",
      from: "confirmed",
      to: "no-show",
      after: { timer: "grace period", duration: "PT30M" },
      intent: "failure"
    });
    expect(machine.transitions).toContainEqual({
      id: "edg_postBookingsRequested",
      from: "entry:nod_book",
      to: "requested"
    });
  });

  it("gives guards with their name and expression, else, effects by name, a state's entry, exit and SLA, webhooks, globs, choice and any nodes", async () => {
    const [machine] = (await toContract(ordersDoc())).contract.machines;
    expect(machine.states.find(state => state.name === "reserved")).toEqual({
      id: "nod_reserved",
      name: "reserved",
      onEntry: ["reserve stock"],
      onExit: ["emit order.paid"],
      sla: { timer: "handling", duration: "P1D" }
    });
    expect(machine.nodes).toEqual([
      { id: "nod_any", kind: "any", except: ["cancelled"] },
      { id: "nod_check", kind: "choice", name: "in stock?" }
    ]);
    const byId = Object.fromEntries(machine.transitions.map(transition => [transition.id, transition]));
    expect(byId.edg_paid).toEqual({
      id: "edg_paid",
      from: "pending",
      to: "choice:nod_check",
      via: "psp.notify",
      by: "PSP"
    });
    expect(byId.edg_inStock).toEqual({
      id: "edg_inStock",
      from: "choice:nod_check",
      to: "reserved",
      guard: { name: "in stock", expr: { "==": [{ var: "context.stock" }, true] } },
      actions: ["assign context.reservedAt", "assign context.by"]
    });
    expect(byId.edg_outOfStock).toMatchObject({ to: "backorder", else: true });
    expect(byId.edg_cancel).toMatchObject({ from: "any:nod_any", onMatch: ["order.cancel.*"] });
    expect(byId.edg_restock).toMatchObject({ always: true, guard: { text: "stock arrived" } });
  });

  it("places nested levels: a state's interior within its machine, a reusable part's level, regions by name", async () => {
    const getPaid = (await toContract(example("get-paid-as-built"))).contract.machines;
    expect(getPaid.find(machine => machine.id === "cnv_open")).toMatchObject({
      owner: "nod_open",
      within: { machine: "cnv_transaction", state: "open" }
    });
    expect(getPaid.find(machine => machine.id === "cnv_transaction").owner).toBe(null);
    const payments = (await toContract(example("payments"))).contract.machines;
    expect(payments.find(machine => machine.id === "cnv_expiryClock")).toMatchObject({
      owner: "def_expiryClock",
      definition: "def_expiryClock"
    });
    const lifecycle = payments.find(machine => machine.id === "cnv_lifecycle");
    expect(lifecycle.regions).toEqual([
      { id: "rgn_compliance", name: "Compliance hold" },
      { id: "rgn_expiry", name: "Expiry clock" },
      { id: "rgn_phase", name: "Phase" }
    ]);
    expect(lifecycle.states.find(state => state.id === "nod_expiryClock")).toEqual({
      id: "nod_expiryClock",
      name: "expiry_clock",
      region: "Expiry clock",
      inner: { definition: "def_expiryClock" }
    });
  });

  it("gives flows as structure: each step with what it does, the edges with their kind", async () => {
    const flows = (await toContract(example("payout-batch"))).contract.flows;
    const batch = flows.find(flow => flow.id === "cnv_payOutBatch");
    expect(batch.owner).toBe("act_payOutBatch");
    const steps = Object.fromEntries(batch.steps.map(step => [step.id, step]));
    expect(steps.nod_book).toEqual({
      id: "nod_book",
      kind: "call",
      name: "book the batch",
      endpoint: "POST /ledger/batches"
    });
    expect(steps.nod_confirm).toMatchObject({
      kind: "wait",
      on: ["bank.confirmed"],
      after: { timer: expect.any(String) }
    });
    expect(steps.nod_each).toMatchObject({ kind: "forEach", as: "payout", body: { flow: "cnv_payOne" } });
    expect(steps.nod_announce).toMatchObject({ kind: "emit", event: "batch.paid" });
    expect(batch.edges).toContainEqual({ id: "edg_checkReview", from: "nod_check", to: "nod_review", kind: "false" });
  });

  it("gives each scenario as a vector: the start, each step by name, the states expected by name, the transitions fired", async () => {
    const { vectors } = (await toContract(example("bookings"))).contract;
    expect(vectors.map(vector => vector.id)).toEqual([
      "scn_aBookingIsDeclined",
      "scn_aConfirmedGuestIsSeated",
      "scn_aGuestDoesNotCome",
      "scn_theGuestIsToldItIsConfirmed",
      "scn_theGuestIsToldItIsDeclined"
    ]);
    expect(vectors.find(vector => vector.id === "scn_aGuestDoesNotCome")).toEqual({
      id: "scn_aGuestDoesNotCome",
      name: "A guest does not come",
      level: "cnv_booking",
      kind: "machine",
      start: {
        at: "2026-01-09T19:00:00Z",
        entry: "POST /bookings",
        expect: { active: ["requested"] },
        fired: ["edg_postBookingsRequested"]
      },
      steps: [
        { do: { event: "booking.confirmed" }, expect: { active: ["confirmed"] }, fired: ["edg_requestedConfirmed"] },
        {
          do: { wait: "next", until: "2026-01-09T19:30:00Z" },
          expect: { active: ["no-show"], ended: "done" },
          fired: ["edg_confirmedNoShow"]
        }
      ]
    });
    expect(vectors.find(vector => vector.id === "scn_theGuestIsToldItIsConfirmed")).toMatchObject({
      kind: "flow",
      start: { input: { event: "booking.confirmed" }, expect: { active: [], ended: "success" } },
      steps: []
    });
  });

  it("names nested states by their path, and the answers a scenario gives by where they are asked", async () => {
    const getPaid = (await toContract(example("get-paid-as-built"))).contract.vectors[0];
    expect(getPaid.steps.map(step => step.expect.active)).toEqual([
      ["open/awaiting_payment"],
      ["processing"],
      ["completed"]
    ]);
    const payments = (await toContract(example("payments"))).contract.vectors[0];
    expect(payments.start.expect.active).toEqual([
      "compliance_hold/clear",
      "expiry_clock/running",
      "send_cross_border/awaiting_funds"
    ]);
    expect(payments.steps[3].given).toEqual([
      { kind: "transition", at: "send_cross_border/paying_out", value: "edg_payingOutCompleted" }
    ]);
  });

  it("lists a scenario that no longer replays as stale, with the step where it goes elsewhere, and makes no vector of it", async () => {
    const doc = applyBatch(example("bookings"), [{ type: "edge.remove", args: { id: "edg_confirmedSeated" } }]).doc;
    const { contract } = await toContract(doc);
    expect(contract.stale).toEqual([
      { id: "scn_aConfirmedGuestIsSeated", name: "A confirmed guest is seated", level: "cnv_booking", step: 2 }
    ]);
    expect(contract.vectors.map(vector => vector.id)).not.toContain("scn_aConfirmedGuestIsSeated");
  });

  it("reports two states of one level and region with one name, which code cannot tell apart (machine.sameName)", async () => {
    const { problems } = await toContract(clashingDoc());
    expect(problems).toEqual([
      {
        code: "machine.sameName",
        severity: "warning",
        target: "nod_reservedAgain",
        canvas: "cnv_orders",
        message:
          'state "reserved" has the name of state "reserved" in the same level: code that holds the state by its name ' +
          "cannot tell them apart; rename one",
        data: { same: "nod_reserved" }
      }
    ]);
    const regions = applyBatch(clashingDoc(), [
      { type: "region.add", args: { canvas: "cnv_orders", id: "rgn_main", name: "Main" } },
      { type: "region.add", args: { canvas: "cnv_orders", id: "rgn_other", name: "Other" } },
      { type: "node.update", args: { id: "nod_reservedAgain", set: { region: "rgn_other" } } }
    ]).doc;
    expect((await toContract(regions)).problems).toEqual([]);
  });

  it("says the region of each transition, so a name two regions share still tells them apart", async () => {
    const doc = applyBatch(clashingDoc(), [
      { type: "region.add", args: { canvas: "cnv_orders", id: "rgn_main", name: "Main" } },
      { type: "region.add", args: { canvas: "cnv_orders", id: "rgn_other", name: "Other" } },
      { type: "node.update", args: { id: "nod_reserved", set: { region: "rgn_main" } } },
      { type: "node.update", args: { id: "nod_reservedAgain", set: { region: "rgn_other" } } },
      {
        type: "edge.add",
        args: { canvas: "cnv_orders", id: "edg_recheck", edge: { from: "nod_reservedAgain", to: "nod_reservedAgain" } }
      }
    ]).doc;
    const { transitions } = (await toContract(doc)).contract.machines[0];
    expect(transitions.find(transition => transition.id === "edg_recheck")).toMatchObject({
      from: "reserved",
      to: "reserved",
      region: "Other"
    });
    expect(transitions.filter(transition => transition.to === "reserved" && transition.region === "Main")).not.toEqual(
      []
    );
  });

  it("names the region a done transition waits for, in the state's interior", async () => {
    const doc = applyBatch(clashingDoc(), [
      { type: "canvas.create", args: { kind: "machine", name: "Packing", id: "cnv_packing", owner: "nod_reserved" } },
      { type: "region.add", args: { canvas: "cnv_packing", id: "rgn_pick", name: "Pick" } },
      {
        type: "edge.add",
        args: {
          canvas: "cnv_orders",
          id: "edg_packed",
          edge: { from: "nod_reserved", to: "nod_cancelled", done: "rgn_pick" }
        }
      }
    ]).doc;
    const orders = (await toContract(doc)).contract.machines.find(machine => machine.id === "cnv_orders");
    expect(orders.transitions.find(transition => transition.id === "edg_packed")).toMatchObject({ done: "Pick" });
  });

  it("writes the same bytes for the same design, keys sorted, and reads back only a contract", async () => {
    const { contract } = await toContract(example("bookings"));
    const text = stringifyContract(contract);
    expect(stringifyContract((await toContract(example("bookings"))).contract)).toBe(text);
    expect(text.endsWith("}\n")).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual(["contract", "flows", "machines", "source", "stale", "vectors"]);
    expect(parseContract(text)).toEqual({ ok: true, contract: JSON.parse(text) });
    expect(parseContract("{")).toMatchObject({ ok: false, message: expect.stringMatching(/^is not JSON/) });
    expect(parseContract('{ "contract": "2" }')).toEqual({
      ok: false,
      message: "is not a contract of format 1 (format 2)"
    });
    expect(parseContract("{}")).toEqual({ ok: false, message: "is not a contract of format 1" });
  });
});
