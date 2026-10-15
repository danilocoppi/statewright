import { describe, expect, it } from "vitest";

import { itemsOf, typeLine, usageRows } from "@/catalog/items";

import { readExample } from "../fixtures.js";
import i18n from "../i18n.js";

const t = i18n.t.bind(i18n);

describe("what the catalog sheet lists", () => {
  it("says what a type is in a few words", () => {
    const doc = readExample("payments");
    expect(typeLine(t, doc, { kind: "object", fields: [{ name: "a", type: "string" }] })).toBe("object · 1 field");
    expect(typeLine(t, doc, { kind: "enum", values: [{ value: "USD" }, { value: "BRL" }] })).toBe("enum · USD, BRL");
    expect(typeLine(t, doc, { kind: "alias", of: "string" })).toBe("alias of string");
  });

  it("lists a collection's items by name, found by what is typed, with how often each is used", () => {
    const doc = readExample("payments");
    const all = itemsOf(t, doc, "events");
    expect(all.map(item => item.name)).toEqual([...all.map(item => item.name)].sort((a, b) => a.localeCompare(b)));
    const ops = itemsOf(t, doc, "events", "ops.");
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.every(item => item.name.startsWith("ops."))).toBe(true);
    expect(ops[0].line).toMatch(/used|not used/);
  });

  it("says where an item is used: by which element, on which level, in which field", () => {
    const doc = readExample("payments");
    const rows = usageRows(t, doc, "typ_expiryContext", {
      name: entry => entry.value.name,
      kind: entry => entry.type
    });
    expect(rows).toEqual([
      {
        source: "cnv_expiryClock",
        name: "Expiry clock",
        kind: "canvas",
        level: undefined,
        canvas: "cnv_expiryClock",
        key: "context",
        field: "Context type"
      }
    ]);
  });
});
