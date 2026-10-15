import { describe, expect, it } from "vitest";
import { toContract } from "../../src/contract/index.js";
import { toMarkdown } from "../../src/docs/document.js";
import { toDocumentPage } from "../../src/render/index.js";
import { parse } from "../../src/serialize/parse.js";
import { readExample } from "../helpers.js";

const order = () => parse(readExample("order-lifecycle.sttw")).doc;

describe("the roles in the documentation and the contract (mixed levels spec §7)", () => {
  it("lists a level's roles in the Markdown: who sends, who an action is for, where steps run", () => {
    const markdown = toMarkdown(order());
    expect(markdown).toContain("| From | Role | To | About |");
    expect(markdown).toMatch(/\| Customer \| sends \| order\.placed \|/);
    expect(markdown).toMatch(/\| order\.placed \| is for \| Payments \| Charge card \|/);
    expect(markdown).toMatch(/\| order\.placed \| runs \| Charge card \|/);
  });

  it("holds the same table in the HTML documentation", async () => {
    const page = await toDocumentPage(order());
    expect(page).toContain("<h4>Roles</h4>");
  });

  it("carries who receives each action and the flows that run within the step", async () => {
    const { contract } = await toContract(order());
    const machine = contract.machines.find(item => item.id === "cnv_order");
    const placed = machine.transitions.find(item => item.id === "edg_createdCharging");
    expect(placed).toMatchObject({
      receivedBy: { "Charge card": "Payments" },
      flows: { "Charge card": "Charge card" }
    });
    const paid = machine.states.find(item => item.id === "nod_paid");
    expect(paid.receivedBy).toEqual({ "Send receipt": "Customer" });
    expect(paid.flows).toBeUndefined();
  });

  it("leaves the other examples' documents without roles", () => {
    for (const name of ["bookings", "payments", "get-paid-as-built", "payout-batch"]) {
      expect(toMarkdown(parse(readExample(`${name}.sttw`)).doc)).not.toContain("| From | Role | To | About |");
    }
  });
});

describe("the roles in the AI pack (mixed levels spec §7)", () => {
  it("names guests and states each role with the field that holds it", async () => {
    const { toAIPack } = await import("../../src/docs/document.js");
    const pack = toAIPack(order());
    expect(pack).toContain("| `nod_customerHere` | participant node | Customer |");
    expect(pack).toContain("Roles (derived; change the field that holds them):");
    expect(pack).toContain("- `nod_customerHere` sends `edg_createdCharging` — `source` of `evt_orderPlaced`");
    expect(pack).toContain("- `edg_createdCharging` is for `nod_paymentsHere` — `party` of `act_chargeCard`");
    expect(pack).toContain("- `edg_createdCharging` runs `nod_chargeSteps` — `actions` of `edg_createdCharging`");
  });
});

describe("a lifecycle's drivers in the documentation (mixed levels spec §4.3)", () => {
  it("lists what the system's boxes drive in the system level's roles table", () => {
    expect(toMarkdown(order())).toMatch(/\| Customer \| drives \| order\.placed \|/);
  });

  it("states them in the AI pack too", async () => {
    const { toAIPack } = await import("../../src/docs/document.js");
    expect(toAIPack(order())).toContain(
      "- `nod_customer` drives `edg_createdCharging` — `source` of `evt_orderPlaced`"
    );
  });
});

describe("a flow's roles in the example (mixed levels spec §4.4)", () => {
  it("lists what leads to a state and who performs a step, and says who performs each step in the contract", async () => {
    const markdown = toMarkdown(order());
    expect(markdown).toMatch(/\| Place the order \| leads to \| charging \| order\.placed \|/);
    expect(markdown).toMatch(/\| Authorise payment \| is done by \| Payments \|/);
    const { contract } = await toContract(order());
    const steps = contract.flows.find(flow => flow.id === "cnv_checkout").steps;
    expect(Object.fromEntries(steps.map(step => [step.id, step.performedBy ?? step.party]))).toMatchObject({
      nod_payCall: "Payments",
      nod_placeOrder: "Customer"
    });
  });
});

describe("the example's mixed level (mixed levels spec §4.5)", () => {
  it("is documented with its roles, and simulates as its machine", async () => {
    const doc = order();
    const markdown = toMarkdown(doc);
    expect(markdown).toContain("Returns desk");
    expect(markdown).toMatch(/\| Customer \| sends \| return\.requested \|/);
    expect(markdown).toMatch(/\| return\.approved \| is for \| Payments \| Refund card \|/);
    const { replay } = await import("../../src/simulate/index.js");
    expect(replay(doc, doc.annotations.scenarios.scn_aRefundedReturn).first).toBeNull();
  });
});
