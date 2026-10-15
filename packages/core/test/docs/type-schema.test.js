import { describe, expect, it } from "vitest";
import { applyBatch, typeSchema } from "../../src/index.js";
import { paymentsDoc } from "../helpers.js";

/** Payments with a few types of each kind. */
function withTypes() {
  return applyBatch(paymentsDoc(), [
    {
      type: "catalog.add",
      args: {
        collection: "types",
        id: "typ_currency",
        item: { kind: "enum", name: "Currency", values: [{ value: "USD" }, { value: "BRL" }] }
      }
    },
    {
      type: "catalog.add",
      args: {
        collection: "types",
        id: "typ_money",
        item: {
          kind: "object",
          name: "Money",
          fields: [
            { name: "amount", type: "decimal", required: true, description: "In the currency's units" },
            { name: "currency", type: "typ_currency", required: true }
          ]
        }
      }
    },
    {
      type: "catalog.add",
      args: { collection: "types", id: "typ_payerRef", item: { kind: "alias", name: "PayerRef", of: "uuid" } }
    },
    {
      type: "catalog.add",
      args: {
        collection: "types",
        id: "typ_instruction",
        item: {
          kind: "object",
          name: "Instruction",
          description: "What the payer receives",
          fields: [
            { name: "amounts", type: "typ_money", list: true },
            { name: "expiresAt", type: "datetime" },
            { name: "payer", type: "typ_payerRef" }
          ]
        }
      }
    },
    {
      type: "catalog.add",
      args: {
        collection: "types",
        id: "typ_raw",
        item: { kind: "object", name: "Raw", jsonSchema: { type: "object", minProperties: 1 } }
      }
    }
  ]).doc;
}

describe("typeSchema", () => {
  it("gives an object type its fields as properties, the required ones listed, the types it names under $defs", () => {
    const schema = typeSchema(withTypes(), "typ_instruction");
    expect(schema).toEqual({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Instruction",
      type: "object",
      description: "What the payer receives",
      properties: {
        amounts: { type: "array", items: { $ref: "#/$defs/Money" } },
        expiresAt: { type: "string", format: "date-time" },
        payer: { $ref: "#/$defs/PayerRef" }
      },
      additionalProperties: false,
      $defs: {
        Money: {
          type: "object",
          properties: {
            amount: { type: "string", pattern: "^-?\\d+(\\.\\d+)?$", description: "In the currency's units" },
            currency: { $ref: "#/$defs/Currency" }
          },
          required: ["amount", "currency"],
          additionalProperties: false
        },
        Currency: { type: "string", enum: ["USD", "BRL"] },
        PayerRef: { type: "string", format: "uuid" }
      }
    });
  });

  it("gives enum values their descriptions, and keeps a type's own schema as it is", () => {
    const doc = applyBatch(withTypes(), [
      {
        type: "catalog.update",
        args: { id: "typ_currency", set: { values: [{ value: "USD", description: "US dollar" }, { value: "BRL" }] } }
      }
    ]).doc;
    expect(typeSchema(doc, "typ_currency")).toMatchObject({
      title: "Currency",
      type: "string",
      oneOf: [{ const: "USD", description: "US dollar" }, { const: "BRL" }]
    });
    expect(typeSchema(doc, "typ_raw")).toEqual({ type: "object", minProperties: 1 });
    expect(typeSchema(doc, "typ_nothing")).toBeNull();
  });

  it("describes a type that refers to itself once", () => {
    const doc = applyBatch(paymentsDoc(), [
      {
        type: "catalog.add",
        args: {
          collection: "types",
          id: "typ_node",
          item: { kind: "object", name: "Node", fields: [{ name: "children", type: "typ_node", list: true }] }
        }
      }
    ]).doc;
    const schema = typeSchema(doc, "typ_node");
    expect(schema.properties.children).toEqual({ type: "array", items: { $ref: "#/$defs/Node" } });
    expect(schema.$defs.Node.properties.children.items).toEqual({ $ref: "#/$defs/Node" });
  });
});
