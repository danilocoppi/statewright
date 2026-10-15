import { readdirSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { toJSONSchema } from "../src/schema/index.js";
import { parse } from "../src/serialize/parse.js";
import { stringify } from "../src/serialize/stringify.js";
import { verify } from "../src/signature.js";
import { replay } from "../src/simulate/index.js";
import { readExample } from "./helpers.js";

const validateJsonSchema = new Ajv2020({ strict: false, validateFormats: false }).compile(toJSONSchema());

describe("the examples", () => {
  it("are .sttw documents, the name Statewright saves under", () => {
    const files = readdirSync(new URL("../../../examples/", import.meta.url)).filter(name => name.includes("."));
    expect(files).toEqual(["bookings.sttw", "get-paid-as-built.sttw", "payments.sttw", "payout-batch.sttw"]);
  });
});

describe.each(["bookings.sttw", "get-paid-as-built.sttw", "payments.sttw", "payout-batch.sttw"])("%s", name => {
  const text = readExample(name);
  const result = parse(text);

  it("parses", () => {
    expect(result.errors).toEqual([]);
  });

  it("is valid against the published JSON Schema", () => {
    expect(validateJsonSchema(JSON.parse(text)), JSON.stringify(validateJsonSchema.errors)).toBe(true);
  });

  it("is normalized (run npm run examples:normalize)", () => {
    expect(stringify(result.doc)).toBe(text);
  });

  it("is signed and unchanged", async () => {
    expect(await verify(result.doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("replays each of its scenarios as recorded (simulator spec §13, S1)", () => {
    const scenarios = Object.entries(result.doc.annotations?.scenarios ?? {});
    expect(scenarios.length).toBeGreaterThan(0);
    for (const [id, scenario] of scenarios) expect(replay(result.doc, scenario).first, id).toBeNull();
  });
});
