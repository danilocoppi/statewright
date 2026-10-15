import { describe, expect, it } from "vitest";

import { defaultStart, fieldsOf, instantText, parseInstant, readField, readForm } from "@/simulate/values";

import { readExample } from "../fixtures.js";

/** A document whose catalog has an object type with every kind of field. */
function withTypes() {
  const doc = structuredClone(readExample("payments"));
  doc.catalog.types = {
    ...doc.catalog.types,
    typ_rail: { kind: "enum", name: "Rail", values: [{ value: "pix" }, { value: "ted" }] },
    typ_money: { kind: "alias", name: "Money", of: "decimal" },
    typ_address: { kind: "object", name: "Address", fields: [{ name: "city", type: "string", required: true }] },
    typ_raw: { kind: "object", name: "Raw", jsonSchema: { type: "object" } },
    typ_payout: {
      kind: "object",
      name: "Payout",
      fields: [
        { name: "id", type: "uuid", required: true, description: "The payout's ID" },
        { name: "amount", type: "typ_money" },
        { name: "count", type: "integer" },
        { name: "urgent", type: "boolean" },
        { name: "rail", type: "typ_rail" },
        { name: "due", type: "date" },
        { name: "at", type: "datetime" },
        { name: "window", type: "duration" },
        { name: "tags", type: "string", list: true },
        { name: "extra", type: "json" },
        { name: "address", type: "typ_address" },
        { name: "raw", type: "typ_raw" }
      ]
    }
  };
  return doc;
}

describe("values typed for a run (simulator spec §6.2)", () => {
  it("makes a field of each field of an object type, aliases followed and nested objects as groups", () => {
    expect(fieldsOf(withTypes(), "typ_payout")).toEqual([
      { name: "id", kind: "text", required: true, description: "The payout's ID" },
      { name: "amount", kind: "number", required: false },
      { name: "count", kind: "integer", required: false },
      { name: "urgent", kind: "boolean", required: false },
      { name: "rail", kind: "choice", required: false, options: ["pix", "ted"] },
      { name: "due", kind: "date", required: false },
      { name: "at", kind: "datetime", required: false },
      { name: "window", kind: "duration", required: false },
      { name: "tags", kind: "json", required: false },
      { name: "extra", kind: "json", required: false },
      { name: "address", kind: "group", required: false, fields: [{ name: "city", kind: "text", required: true }] },
      { name: "raw", kind: "json", required: false }
    ]);
  });

  it("has no fields for a type a form cannot show: none, an enum, a raw JSON Schema", () => {
    const doc = withTypes();
    expect(fieldsOf(doc, undefined)).toBeNull();
    expect(fieldsOf(doc, "typ_rail")).toBeNull();
    expect(fieldsOf(doc, "typ_raw")).toBeNull();
    expect(fieldsOf(doc, "typ_gone")).toBeNull();
  });

  it("reads what was typed into JSON, leaving out what is not set, and says what cannot be read", () => {
    const fields = fieldsOf(withTypes(), "typ_payout");
    expect(
      readForm(fields, {
        id: "pay_1",
        amount: "12.5",
        count: "3",
        urgent: "false",
        rail: "pix",
        due: "2026-01-20",
        at: "2026-01-15 09:00",
        window: "2 days",
        tags: '["a"]',
        "address.city": "Recife",
        extra: ""
      })
    ).toEqual({
      value: {
        id: "pay_1",
        amount: 12.5,
        count: 3,
        urgent: false,
        rail: "pix",
        due: "2026-01-20",
        at: "2026-01-15T09:00:00Z",
        window: "P2D",
        tags: ["a"],
        address: { city: "Recife" }
      },
      errors: {}
    });
    const typed = { count: "2.5", amount: "x", at: "tomorrow", window: "soon", tags: "[", due: "2026-13-01" };
    expect(readForm(fields, typed).errors).toEqual({
      count: "integer",
      amount: "number",
      at: "datetime",
      window: "duration",
      tags: "json",
      due: "date"
    });
  });

  it("reads a date and time in UTC as the format writes it, and refuses a day that does not exist", () => {
    expect(parseInstant("2026-01-05 09:00")).toBe("2026-01-05T09:00:00Z");
    expect(parseInstant("2026-01-05T09:00:30Z")).toBe("2026-01-05T09:00:30Z");
    expect(parseInstant("2026-02-30 09:00")).toBeNull();
    expect(readField({ kind: "date" }, "2026-02-30")).toEqual({ ok: false, error: "date" });
    expect(parseInstant("9am")).toBeNull();
    expect(readField({ kind: "text" }, "  ")).toEqual({ ok: true });
    expect(instantText("2026-01-05T09:00:00Z")).toBe("2026-01-05 09:00");
    expect(instantText("2026-01-05T09:00:30Z")).toBe("2026-01-05 09:00:30");
  });

  it("starts the clock now, rounded to the hour, in UTC", () => {
    expect(defaultStart(Date.parse("2026-01-05T09:12:00Z"))).toBe("2026-01-05T09:00:00Z");
    expect(defaultStart(Date.parse("2026-01-05T09:40:00Z"))).toBe("2026-01-05T10:00:00Z");
  });
});
