import { describe, expect, it } from "vitest";

import { cn } from "@/lib/cn";

describe("cn", () => {
  it("keeps a token size and a token colour together", () => {
    expect(cn("text-ui", "text-ink")).toBe("text-ui text-ink");
  });

  it("lets a later class of the same kind win", () => {
    expect(cn("text-ui", "text-title")).toBe("text-title");
    expect(cn("rounded-control", "rounded-island")).toBe("rounded-island");
    expect(cn("px-2", false, "px-4")).toBe("px-4");
  });
});
