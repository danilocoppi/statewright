import { describe, expect, it } from "vitest";
import { slug } from "../src/names.js";

describe("slug", () => {
  it("makes a safe file-name stem from any name", () => {
    expect(slug("Get paid / v2 – ü")).toBe("get-paid-v2-u");
    expect(slug("Verification pauses the clock")).toBe("verification-pauses-the-clock");
    expect(slug("→ ←")).toBe("project");
    expect(slug("x".repeat(80))).toHaveLength(60);
  });
});
