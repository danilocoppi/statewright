import { describe, expect, it } from "vitest";
import { canonicalize } from "../../src/serialize/canonical.js";

describe("canonicalize (RFC 8785)", () => {
  it("matches the RFC 8785 §3.2.4 example", () => {
    const input = JSON.parse(
      '{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],' +
        '"string":"\\u20ac$\\u000F\\u000aA\'\\u0042\\u0022\\u005c\\\\\\"\\/","literals":[null,true,false]}'
    );
    expect(canonicalize(input)).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],' +
        '"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}'
    );
  });

  it("sorts keys by UTF-16 code units at every level", () => {
    // U+1F600 is stored as the surrogate pair D83D DE00, so it sorts before U+FB33 in UTF-16 (not in code points).
    const emoji = String.fromCodePoint(0x1f600);
    const hebrew = String.fromCodePoint(0xfb33);
    const input = { b: 1, a: { d: 1, c: 2 }, [hebrew]: 0, [emoji]: 0 };
    expect(canonicalize(input)).toBe(`{"a":{"c":2,"d":1},"b":1,"${emoji}":0,"${hebrew}":0}`);
  });

  it("skips undefined properties and rejects values JSON cannot hold", () => {
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(() => canonicalize(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalize(undefined)).toThrow(TypeError);
  });
});
