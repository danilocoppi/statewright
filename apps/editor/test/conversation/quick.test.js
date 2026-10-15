import { describe, expect, it } from "vitest";

import { QUICK } from "@/conversation/quick";

describe("quick requests (collaboration spec §6.2)", () => {
  it("are the six the spec names, in its order", () => {
    expect(QUICK).toEqual(["explain", "review", "fill", "scenarios", "detail", "names"]);
  });
});
