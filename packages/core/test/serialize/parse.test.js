import { describe, expect, it } from "vitest";
import { parse, parseValue, toPointer } from "../../src/serialize/parse.js";
import { minimalDoc } from "../helpers.js";

describe("parse", () => {
  it("returns the document on success", () => {
    const result = parse(JSON.stringify(minimalDoc()));
    expect(result.ok).toBe(true);
    expect(result.doc.project.id).toBe("prj_demo");
    expect(result.errors).toEqual([]);
  });

  it("accepts a UTF-8 byte order mark and CRLF line endings", () => {
    const text = "\uFEFF" + JSON.stringify(minimalDoc(), null, 2).replaceAll("\n", "\r\n");
    expect(parse(text).ok).toBe(true);
  });

  it("reports invalid JSON without throwing", () => {
    const result = parse("{ nope");
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toMatch(/^Invalid JSON/);
  });

  it("rejects values that are not objects", () => {
    expect(parseValue([]).errors[0].message).toBe("A Statewright document must be a JSON object");
  });

  it("refuses documents from a newer format", () => {
    const doc = { ...minimalDoc(), statewright: "2.0" };
    expect(parse(JSON.stringify(doc)).errors).toEqual([
      { path: "/statewright", message: "This document uses Statewright format 2.0; upgrade Statewright to open it." }
    ]);
  });

  it("reports schema errors with JSON Pointer paths", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.nod_x = { kind: "service", name: "API", colour: "red" };
    expect(parse(JSON.stringify(doc)).errors).toEqual([
      { path: "/canvases/cnv_root/nodes/nod_x", message: "Unrecognized key(s): colour" }
    ]);
  });

  it("explains why an ID-map key is invalid", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_root.nodes.running = { kind: "service" };
    expect(parse(JSON.stringify(doc)).errors).toEqual([
      { path: "/canvases/cnv_root/nodes/running", message: "Expected an ID starting with nod_" }
    ]);
  });

  it("reports the closest branch of a failed union", () => {
    const doc = minimalDoc();
    doc.canvases.cnv_m = {
      kind: "machine",
      name: "M",
      nodes: { nod_a: { kind: "state", name: "a" } },
      edges: { edg_e: { from: "nod_a", to: "nod_a", after: "evt_wrongPrefix" } }
    };
    const [error] = parse(JSON.stringify(doc)).errors;
    expect(error.path).toBe("/canvases/cnv_m/edges/edg_e/after");
    expect(error.message).toMatch(/tmr_/);
  });
});

describe("toPointer", () => {
  it("escapes ~ and /", () => {
    expect(toPointer(["a/b", "c~d", 0])).toBe("/a~1b/c~0d/0");
  });
});
