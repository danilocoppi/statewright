import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { buildIndex, documentSchema, FORMAT_VERSION, parse, stringify, toJSONSchema } from "../../src/index.js";
import { minimalDoc, paymentsDoc } from "../helpers.js";

const validateJsonSchema = new Ajv2020({ strict: false, validateFormats: false }).compile(toJSONSchema());

/** The spec's example (§4.2): the payments example's lifecycle, the payer's verification pausing the clock. */
function scenario() {
  const lifecycle = ["nod_complianceHold/nod_clear", "nod_sendCrossBorder/nod_awaitingFunds"];
  return {
    name: "Verification pauses the clock",
    description: "While the payer verifies their identity, the expiry deadline stops counting.",
    canvas: "cnv_lifecycle",
    start: { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } },
    steps: [
      {
        do: { event: "evt_verifyStarted" },
        caption: "The payer starts identity verification. The clock stops.",
        reached: { active: [...lifecycle, "nod_expiryClock/nod_paused"].sort() }
      },
      { do: { wait: "P2D" }, reached: { active: [...lifecycle, "nod_expiryClock/nod_paused"].sort() } },
      {
        do: { event: "evt_payoutCompleted" },
        answers: [{ kind: "transition", at: "nod_sendCrossBorder/nod_payingOut", value: null }],
        reached: { active: [...lifecycle, "nod_expiryClock/nod_paused"].sort() }
      }
    ]
  };
}

/** The payments example with one scenario. */
function withScenario(value) {
  const doc = paymentsDoc();
  doc.annotations = { ...doc.annotations, scenarios: { scn_pausesTheClock: value } };
  return doc;
}

describe("scenarios in the document (format 1.1, spec §4)", () => {
  it("is format 1.1 or later", () => {
    expect(FORMAT_VERSION).toBe("1.2");
  });

  it("accepts a scenario: where it starts, what was done, what was answered and where each step got to", () => {
    const doc = withScenario(scenario());
    expect(documentSchema.safeParse(doc).error).toBeUndefined();
    expect(validateJsonSchema(doc), JSON.stringify(validateJsonSchema.errors)).toBe(true);
  });

  it("accepts the other inputs: a call with a payload, a wait until the next timer, a start at an entry", () => {
    const value = scenario();
    value.start.entry = "nod_orderPosted";
    value.steps.push(
      { do: { call: "whk_providerEvent", payload: { status: "settled" } }, reached: { active: [] } },
      { do: { wait: "next" }, reached: { active: [], ended: "done" } }
    );
    const doc = withScenario(value);
    expect(documentSchema.safeParse(doc).error).toBeUndefined();
    expect(validateJsonSchema(doc)).toBe(true);
  });

  it.each([
    ["a step that does two things", value => (value.steps[0].do = { event: "evt_verifyStarted", wait: "P1D" })],
    ["a wait that is not a duration", value => (value.steps[1].do = { wait: "2 days" })],
    ["a step without its recording", value => delete value.steps[0].reached],
    ["a start without its instant", value => delete value.start.at],
    ["a start instant that is a date, not a UTC date-time", value => (value.start.at = "2026-01-05")],
    ["an answer of an unknown kind", value => (value.steps[2].answers[0].kind = "guess")],
    ["an ending that is not done, success or failure", value => (value.steps[0].reached.ended = "stopped")],
    ["an empty name", value => (value.name = "")],
    ["an unknown key", value => (value.steps[0].note = "remember")]
  ])("refuses %s", (_, change) => {
    const value = scenario();
    change(value);
    const doc = withScenario(value);
    expect(documentSchema.safeParse(doc).success).toBe(false);
    expect(validateJsonSchema(doc)).toBe(false);
  });

  it("keeps a scenario's keys in a fixed order and its own extension keys", () => {
    const value = scenario();
    const { name, description, canvas, start, steps } = value;
    const shuffled = { "x-owner": "qa", steps, start, canvas, description, name };
    const text = stringify(withScenario(shuffled));
    const written = JSON.parse(text).annotations.scenarios.scn_pausesTheClock;
    expect(Object.keys(written)).toEqual(["name", "description", "canvas", "start", "steps", "x-owner"]);
    expect(parse(text).ok).toBe(true);
  });

  it("indexes scenarios with the other elements of the document", () => {
    const entry = buildIndex(withScenario(scenario())).get("scn_pausesTheClock");
    expect(entry).toMatchObject({ type: "scenario", path: ["annotations", "scenarios", "scn_pausesTheClock"] });
  });

  it("keeps format 1.0's JSON Schema published as it was: it reads 1.0 files and knows no scenarios", () => {
    const frozen = JSON.parse(readFileSync(new URL("../../schema/1.0.json", import.meta.url), "utf8"));
    const validate = new Ajv2020({ strict: false, validateFormats: false }).compile(frozen);
    expect(frozen.title).toBe("Statewright document (format 1.0)");
    expect(validate({ ...minimalDoc(), statewright: "1.0" })).toBe(true);
    expect(validate({ ...withScenario(scenario()), statewright: "1.0" })).toBe(false);
  });
});
