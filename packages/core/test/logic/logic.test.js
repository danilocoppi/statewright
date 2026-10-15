import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { logic } from "../../src/index.js";

/**
 * The JSON Logic project's published test cases (https://jsonlogic.com/tests.json, from the MIT-licensed
 * jwadhams/json-logic repository; see jsonlogic-tests.LICENSE), grouped under the comment lines that head them.
 */
function publishedCases() {
  const groups = [];
  for (const item of JSON.parse(readFileSync(new URL("./jsonlogic-tests.json", import.meta.url), "utf8"))) {
    if (typeof item === "string") groups.push({ title: item.replace(/^#\s*/, ""), cases: [] });
    else groups.at(-1).cases.push(item);
  }
  return groups.filter(group => group.cases.length);
}

describe("JSON Logic, as published", () => {
  it.each(publishedCases().map(group => [group.title, group.cases]))("%s", (_, cases) => {
    for (const [rule, data, expected] of cases) {
      expect(logic.evaluate(rule, data), JSON.stringify(rule)).toEqual(expected);
    }
  });
});

describe("JSON Logic in Statewright", () => {
  const data = {
    event: { name: "payout.completed", payload: { amount: 120, currency: "EUR" } },
    context: { attempts: 2, expiresAt: "2026-01-15T09:00:00Z" },
    vars: { input: { items: [1, 2, 3] } }
  };

  it("reads what a guard sees: the event, the machine's context and the flow's variables (spec §16.10)", () => {
    expect(logic.evaluate({ "==": [{ var: "event.name" }, "payout.completed"] }, data)).toBe(true);
    expect(logic.evaluate({ ">": [{ var: "event.payload.amount" }, 100] }, data)).toBe(true);
    expect(logic.evaluate({ "<": [{ var: "context.attempts" }, 3] }, data)).toBe(true);
    expect(
      logic.evaluate(
        { reduce: [{ var: "vars.input.items" }, { "+": [{ var: "current" }, { var: "accumulator" }] }, 0] },
        data
      )
    ).toBe(6);
    expect(logic.evaluate({ var: "context.missing" }, data)).toBeNull();
  });

  it("refuses an operator outside the standard set, naming it", () => {
    expect(() => logic.evaluate({ regex: [{ var: "event.name" }, "^payout"] }, data)).toThrow(logic.LogicError);
    expect(() => logic.evaluate({ and: [true, { regex: ["a", "b"] }] }, data)).toThrow(
      '"regex" is not a standard JSON Logic operator'
    );
  });

  it("reports a rule that cannot be evaluated as a LogicError, never as another exception", () => {
    expect(() => logic.evaluate({ all: [{ var: "context.reviewers" }, true] }, data)).toThrow(logic.LogicError);
  });

  it('tells truthy from falsy as JSON Logic does: an empty list is false, the text "0" is true', () => {
    expect([[], 0, "", null, false].map(logic.truthy)).toEqual([false, false, false, false, false]);
    expect([[0], "0", 1, {}, true].map(logic.truthy)).toEqual([true, true, true, true, true]);
  });

  it("lists the standard operators, as the expr.operator rule knows them", () => {
    expect(logic.OPERATORS).toContain("var");
    expect(logic.OPERATORS).toContain("missing_some");
    expect(logic.OPERATORS).not.toContain("regex");
  });
});
