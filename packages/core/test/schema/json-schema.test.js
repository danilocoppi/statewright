import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { toJSONSchema } from "../../src/schema/index.js";
import { minimalDoc } from "../helpers.js";

const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(toJSONSchema());

describe("toJSONSchema", () => {
  it("accepts the minimal document", () => {
    expect(validate(minimalDoc())).toBe(true);
  });

  it("rejects unknown keys but allows x- keys", () => {
    const unknown = minimalDoc();
    unknown.canvases.cnv_root.colour = "red";
    expect(validate(unknown)).toBe(false);

    const extended = minimalDoc();
    extended.canvases.cnv_root["x-owner"] = "team-a";
    expect(validate(extended)).toBe(true);
  });

  it("sets $id from baseUrl", () => {
    expect(toJSONSchema({ baseUrl: "https://example.com/" }).$id).toBe("https://example.com/schema/1.4.json");
    expect(toJSONSchema().$id).toBeUndefined();
  });

  it("matches the committed schema/1.4.json (run npm run build:schema after schema changes)", () => {
    const committed = JSON.parse(readFileSync(new URL("../../schema/1.4.json", import.meta.url), "utf8"));
    expect(committed).toEqual(toJSONSchema());
  });
});
