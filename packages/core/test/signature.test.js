import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "../src/constants.js";
import { parse } from "../src/serialize/parse.js";
import { stringify } from "../src/serialize/stringify.js";
import { computeHashes, sha256Hex, sign, verify } from "../src/signature.js";
import { minimalDoc } from "./helpers.js";

const EMPTY_OBJECT_HASH = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
const NOW = new Date("2026-10-10T12:00:00.123Z");

describe("sha256Hex", () => {
  it("hashes UTF-8 text to lowercase hex", async () => {
    expect(await sha256Hex("{}")).toBe(EMPTY_OBJECT_HASH);
  });
});

describe("sign", () => {
  it("stamps generator and signature without touching the input", async () => {
    const doc = minimalDoc();
    const signed = await sign(doc, { channel: "cli", agent: "claude-code" }, { now: NOW });
    expect(doc.signature).toBeUndefined();
    expect(signed.generator).toEqual({
      name: "statewright",
      version: PACKAGE_VERSION,
      channel: "cli",
      agent: "claude-code"
    });
    expect(signed.signature).toMatchObject({
      algorithm: "sha256",
      annotations: EMPTY_OBJECT_HASH,
      layout: EMPTY_OBJECT_HASH,
      signedAt: "2026-10-10T12:00:00Z"
    });
    expect(signed.signature.content).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not hash $schema, generator or signature", async () => {
    const a = await computeHashes(minimalDoc());
    const b = await computeHashes({
      ...minimalDoc(),
      $schema: "https://x/schema/1.0.json",
      generator: { name: "other" }
    });
    expect(b).toEqual(a);
  });
});

describe("verify", () => {
  it("reports missing for unsigned documents", async () => {
    expect(await verify(minimalDoc())).toEqual({ content: "missing", annotations: "missing", layout: "missing" });
  });

  it("reports ok after signing, also after a stringify/parse round trip", async () => {
    const signed = await sign(minimalDoc(), { channel: "api" });
    expect(await verify(signed)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
    expect(await verify(parse(stringify(signed)).doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("flags only the section that changed", async () => {
    const signed = await sign(minimalDoc(), { channel: "api" });

    const content = structuredClone(signed);
    content.canvases.cnv_root.name = "Edited by hand";
    expect(await verify(content)).toEqual({ content: "changed", annotations: "ok", layout: "ok" });

    const layout = structuredClone(signed);
    layout.layout = { canvases: { cnv_root: { nodes: {} } } };
    expect(await verify(layout)).toEqual({ content: "ok", annotations: "ok", layout: "changed" });

    const annotations = structuredClone(signed);
    annotations.annotations = { focus: [] };
    expect(await verify(annotations)).toEqual({ content: "ok", annotations: "changed", layout: "ok" });
  });

  it("hashes content independently of key insertion order", async () => {
    const doc = minimalDoc();
    const shuffled = { canvases: doc.canvases, catalog: doc.catalog, ...doc };
    expect(await computeHashes(shuffled)).toEqual(await computeHashes(doc));
  });

  it("treats an absent section like an empty one", async () => {
    const signed = await sign(minimalDoc(), { channel: "api" });
    expect(await verify({ ...signed, annotations: {}, layout: {} })).toEqual({
      content: "ok",
      annotations: "ok",
      layout: "ok"
    });
  });

  it("treats top-level x- keys as content", async () => {
    const signed = await sign(minimalDoc(), { channel: "api" });
    expect((await verify({ ...signed, "x-note": 1 })).content).toBe("changed");
  });
});
