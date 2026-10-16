import { describe, expect, it } from "vitest";
import { compareVersions, migrate } from "../src/migrate.js";
import { parse } from "../src/serialize/parse.js";
import { stringify } from "../src/serialize/stringify.js";
import { minimalDoc } from "./helpers.js";

describe("compareVersions", () => {
  it("compares MAJOR then MINOR numerically", () => {
    expect(compareVersions("1.0", "1.0")).toBe(0);
    expect(compareVersions("1.2", "1.10")).toBeLessThan(0);
    expect(compareVersions("2.0", "1.9")).toBeGreaterThan(0);
  });
});

describe("migrate", () => {
  it("passes the current version through untouched", () => {
    const doc = minimalDoc();
    expect(migrate(doc)).toEqual({ ok: true, doc, log: [] });
  });

  it("rejects missing or malformed versions", () => {
    expect(migrate({}).ok).toBe(false);
    expect(migrate({ statewright: "1" }).ok).toBe(false);
  });

  it("applies a chain of migrations in order and logs each step", () => {
    const migrations = [
      { from: "0.8", to: "0.9", up: doc => ({ ...doc, steps: ["0.9"] }) },
      { from: "0.9", to: "1.0", up: doc => ({ ...doc, steps: [...doc.steps, "1.0"] }) }
    ];
    const raw = { statewright: "0.8" };
    const result = migrate(raw, { migrations, target: "1.0" });
    expect(result).toEqual({
      ok: true,
      doc: { statewright: "1.0", steps: ["0.9", "1.0"] },
      log: ["0.8 → 0.9", "0.9 → 1.0"]
    });
    expect(raw).toEqual({ statewright: "0.8" });
  });

  it("fails when a step is missing", () => {
    expect(migrate({ statewright: "0.5" }).errors[0].message).toBe("No migration from format 0.5 to 1.4");
  });

  it("brings format 1.0 to 1.1, where only the version changes (simulator spec §4.1)", () => {
    const raw = { ...minimalDoc(), statewright: "1.0" };
    expect(migrate(raw)).toEqual({
      ok: true,
      doc: minimalDoc(),
      log: ["1.0 → 1.1", "1.1 → 1.2", "1.2 → 1.3", "1.3 → 1.4"]
    });
    expect(raw.statewright).toBe("1.0");
    const parsed = parse(JSON.stringify(raw));
    expect(parsed.migrations).toEqual(["1.0 → 1.1", "1.1 → 1.2", "1.2 → 1.3", "1.3 → 1.4"]);
    expect(stringify(parsed.doc)).toBe(stringify(minimalDoc()));
  });
});
