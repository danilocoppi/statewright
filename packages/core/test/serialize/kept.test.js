import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/engine.js";
import { canonicalize } from "../../src/serialize/canonical.js";
import { parse } from "../../src/serialize/parse.js";
import { stringify, stringifyWhole } from "../../src/serialize/stringify.js";
import { sign } from "../../src/signature.js";
import { readExample } from "../helpers.js";

/** The airport example, frozen as the Editor holds it, and a copy edited in one level. */
function airport() {
  const doc = applyBatch(parse(readExample("airport-operations.sttw")).doc, []).doc;
  const edited = applyBatch(doc, [
    { type: "node.update", args: { id: "nod_mainLineA3", set: { name: "Main line A3 (east)" } } },
    { type: "layout.node.set", args: { canvas: "cnv_beltNetwork", id: "nod_mainLineA3", x: 530, y: 2400 } }
  ]).doc;
  return { doc, edited };
}

const time = fn => {
  const start = performance.now();
  fn();
  return performance.now() - start;
};

describe("serializing what changed (performance spec §3 P3)", () => {
  it("writes an edited document exactly as a fresh copy of it", async () => {
    const { doc, edited } = airport();
    stringify(doc);
    canonicalize(doc);
    expect(stringify(edited)).toBe(stringify(structuredClone(edited)));
    expect(canonicalize(edited)).toBe(canonicalize(structuredClone(edited)));
    const now = new Date("2026-10-15T12:00:00Z");
    expect(await sign(edited, { channel: "editor" }, { now })).toEqual(
      await sign(structuredClone(edited), { channel: "editor" }, { now })
    );
  });

  it("revisits only what changed", () => {
    const { doc, edited } = airport();
    stringify(doc);
    canonicalize(doc);
    const fresh = structuredClone(edited);
    const kept = time(() => (stringify(edited), canonicalize(edited)));
    const whole = time(() => (stringify(fresh), canonicalize(fresh)));
    expect(kept).toBeLessThan(whole / 2);
  });

  it("never keeps what can still change", () => {
    const doc = structuredClone(applyBatch(parse(readExample("payments.sttw")).doc, []).doc);
    const first = canonicalize(doc);
    doc.project.name = "Renamed";
    expect(canonicalize(doc)).not.toBe(first);
    expect(stringify(doc)).toContain('"name": "Renamed"');
  });

  it.each(["airport-operations", "bookings", "get-paid-as-built", "order-lifecycle", "payments", "payout-batch"])(
    "writes %s as before, frozen or not",
    name => {
      const plain = parse(readExample(`${name}.sttw`)).doc;
      expect(stringify(plain)).toBe(stringifyWhole(plain));
      const frozen = applyBatch(plain, []).doc;
      expect(stringify(frozen)).toBe(stringifyWhole(frozen));
    }
  );

  it("writes keys that are numbers first, as before", () => {
    const doc = applyBatch(parse(readExample("payments.sttw")).doc, [
      {
        type: "catalog.add",
        args: {
          collection: "endpoints",
          id: "ept_x",
          item: {
            name: "X",
            method: "GET",
            path: "/x",
            responses: { "1XX": null, 200: null }
          }
        }
      }
    ]).doc;
    expect(stringify(doc)).toBe(stringifyWhole(doc));
    // As JavaScript enumerates them: "200" before "1XX".
    expect(stringify(doc).indexOf('"200"')).toBeLessThan(stringify(doc).indexOf('"1XX"'));
  });
});
