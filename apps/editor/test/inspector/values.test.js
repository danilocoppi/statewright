import { describe, expect, it } from "vitest";

import { compact, parseJson } from "@/inspector/values";

describe("composite values", () => {
  it("reads JSON, or says what is wrong with it", () => {
    expect(parseJson('{ "amount": 10 }')).toEqual({ ok: true, value: { amount: 10 } });
    expect(parseJson("[1, 2]")).toEqual({ ok: true, value: [1, 2] });
    const wrong = parseJson("{ amount: 10 }");
    expect(wrong.ok).toBe(false);
    expect(wrong.message).toBeTruthy();
  });

  it("leaves out the parts that say nothing, keeping JSON parts as they are", () => {
    expect(compact({ text: "", guard: "grd_covered", expr: undefined })).toEqual({ guard: "grd_covered" });
    expect(compact({ text: "", guard: undefined })).toBeUndefined();
    expect(compact({ expr: { var: "" }, note: "" })).toEqual({ expr: { var: "" } });
    expect(compact({ maxAttempts: 0, list: [] })).toEqual({ maxAttempts: 0 });
  });
});
