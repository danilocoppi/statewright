import { describe, expect, it } from "vitest";

import { incompleteBecause, problemsOn } from "@/problems/details";

const problem = (target, severity, code = "x") => ({ code, severity, target, message: `${code} ${severity}` });

describe("an element's Problems", () => {
  it("are those about it, the worst first, in Core's order within each severity", () => {
    const list = [
      problem("a", "incomplete", "one"),
      problem("b", "error"),
      problem("a", "warning"),
      problem("a", "incomplete", "two"),
      problem("a", "error")
    ];
    expect(problemsOn(list, "a").map(item => `${item.severity} ${item.code}`)).toEqual([
      "error x",
      "warning x",
      "incomplete one",
      "incomplete two"
    ]);
    expect(problemsOn(list, "c")).toEqual([]);
  });

  it("are incomplete because their level shows only some transitions, or as a reminder", () => {
    // Rules "by level" are incomplete only on a level whose transitions are partial; the others always are.
    expect(incompleteBecause("machine.stuck")).toBe("level");
    expect(incompleteBecause("machine.unreachable")).toBe("level");
    expect(incompleteBecause("machine.noStart")).toBe("level");
    expect(incompleteBecause("transition.noTrigger")).toBe("reminder");
    expect(incompleteBecause("confidence.low")).toBe("reminder");
    expect(incompleteBecause("spec.unspecified")).toBe("reminder");
    expect(incompleteBecause("rule.unknown")).toBe("reminder");
  });
});
