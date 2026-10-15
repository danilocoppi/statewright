import { describe, expect, it } from "vitest";
import { isId, makeId, prefixOf, toCamel } from "../src/ids.js";

describe("toCamel", () => {
  it.each([
    ["payin.confirmed", "payinConfirmed"],
    ["Expiry clock", "expiryClock"],
    ["awaiting_funds", "awaitingFunds"],
    ["POST /orders", "postOrders"],
    ["FORWARD RAIL", "forwardRail"],
    ["Ops REVIEW queue", "opsReviewQueue"],
    ["Ação pendente", "acaoPendente"],
    ["", ""],
    ["--", ""]
  ])("%j → %j", (input, expected) => {
    expect(toCamel(input)).toBe(expected);
  });
});

describe("makeId", () => {
  it("uses prefix + camelCase name", () => {
    expect(makeId("evt", "payin.confirmed", new Set())).toBe("evt_payinConfirmed");
  });

  it("appends a numeric suffix on collision", () => {
    const taken = new Set(["evt_payinConfirmed", "evt_payinConfirmed2"]);
    expect(makeId("evt", "payin.confirmed", taken)).toBe("evt_payinConfirmed3");
  });

  it('falls back to "item" for names without letters or digits', () => {
    expect(makeId("nod", "→", new Set())).toBe("nod_item");
  });
});

describe("prefixOf / isId", () => {
  it("recognises known prefixes only", () => {
    expect(prefixOf("evt_a1")).toBe("evt");
    expect(prefixOf("foo_a1")).toBeNull();
    expect(prefixOf("evt_")).toBeNull();
    expect(prefixOf(42)).toBeNull();
    expect(isId("nod_x")).toBe(true);
    expect(isId("nod_x-y")).toBe(false);
  });
});
