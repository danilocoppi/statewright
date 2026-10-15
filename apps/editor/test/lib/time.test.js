import { describe, expect, it } from "vitest";

import { describeTime } from "@/lib/time";

const now = new Date(2026, 9, 11, 12, 0).getTime();
const minutes = count => now - count * 60_000;

describe("describeTime", () => {
  it("says how long ago, in the interface language", () => {
    expect(describeTime(now - 10_000, now, "en")).toBe("now");
    expect(describeTime(minutes(2), now, "en")).toBe("2 minutes ago");
    expect(describeTime(minutes(2), now, "pt-BR")).toBe("há 2 minutos");
    expect(describeTime(minutes(3 * 60), now, "en")).toBe("3 hours ago");
    expect(describeTime(minutes(26 * 60), now, "es")).toBe("ayer");
  });

  it("shows a short date after a week, with the year only when it differs", () => {
    expect(describeTime(new Date(2026, 9, 2).getTime(), now, "en")).toBe("Oct 2");
    expect(describeTime(new Date(2025, 11, 31).getTime(), now, "en")).toBe("Dec 31, 2025");
  });

  it("never describes a time in the future", () => {
    expect(describeTime(now + 60_000, now, "en")).toBe("now");
  });
});
