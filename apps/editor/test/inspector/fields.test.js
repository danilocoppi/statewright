import {
  Annotations,
  Canvas,
  Condition,
  documentSchema,
  EdgeLayout,
  Effect,
  Effective,
  Evidence,
  FlowEdge,
  FlowNode,
  Layout,
  MachineEdge,
  MachineNode,
  NodeLayout,
  NoteLayout,
  RetryPolicy,
  SystemEdge,
  SystemNode,
  Tag,
  TypeDef
} from "statewright";
import { describe, expect, it } from "vitest";

import { ELSEWHERE, fieldsFor, fieldsOfKind, NESTED } from "@/inspector/fields";
import { CATALOG_SCHEMAS, keysOf, unwrap } from "@/inspector/schema";

import { readExample } from "../fixtures.js";

const kindOf = option => unwrap(option.shape.kind)?.value;
const keysIn = fields => new Set(fields.map(field => field.key));

/** The keys of a schema that are neither fields of the element nor edited elsewhere, as "scope.key". */
function missing(schema, fields, scope) {
  const keys = keysIn(fields);
  const any = scope.replace(/\.[^.]+$/, ".*");
  return keysOf(schema)
    .filter(key => !keys.has(key) && !ELSEWHERE[`${scope}.${key}`] && !ELSEWHERE[`${any}.${key}`])
    .map(key => `${scope}.${key}`);
}

const shapeOf = type => unwrap(type).shape;
const elementOf = type => unwrap(type).def.element;

describe("every field of format 1.0 is editable somewhere (spec §13, E4)", () => {
  it("edits every key of every kind of node, on every kind of level", () => {
    const gaps = [];
    for (const [canvasKind, union] of [
      ["system", SystemNode],
      ["machine", MachineNode],
      ["flow", FlowNode]
    ]) {
      for (const option of union.options) {
        const kind = kindOf(option);
        gaps.push(...missing(option, fieldsOfKind("node", { canvasKind, kind }), `node.${kind}`));
      }
    }
    expect(gaps).toEqual([]);
  });

  it("edits every key of every kind of edge: interactions, transitions, links and flow edges", () => {
    const [transition, link] = MachineEdge.options;
    const gaps = [
      ...missing(SystemEdge, fieldsOfKind("edge", { canvasKind: "system" }), "edge.system"),
      ...missing(transition, fieldsOfKind("edge", { canvasKind: "machine", kind: "transition" }), "edge.transition"),
      ...missing(link, fieldsOfKind("edge", { canvasKind: "machine", kind: "link" }), "edge.link"),
      ...missing(FlowEdge, fieldsOfKind("edge", { canvasKind: "flow" }), "edge.flow")
    ];
    expect(gaps).toEqual([]);
  });

  it("edits every key of every kind of level, of the catalog's items and of the other elements", async () => {
    const { Definition, Finding, Lane, Note, Project, RegionDef } = await import("statewright");
    const gaps = [
      ...Canvas.options.flatMap(option =>
        missing(option, fieldsOfKind("canvas", { kind: kindOf(option) }), `canvas.${kindOf(option)}`)
      ),
      ...Object.entries(CATALOG_SCHEMAS).flatMap(([collection, schema]) =>
        missing(schema, fieldsOfKind("catalog", { collection }), `catalog.${collection}`)
      ),
      ...missing(Project, fieldsOfKind("project"), "project"),
      ...missing(Definition, fieldsOfKind("definition"), "definition"),
      ...missing(RegionDef, fieldsOfKind("region"), "region"),
      ...missing(Note, fieldsOfKind("note"), "note"),
      ...missing(Lane, fieldsOfKind("lane"), "lane"),
      ...missing(Finding, fieldsOfKind("finding"), "finding")
    ];
    expect(gaps).toEqual([]);
  });

  it("covers the document's own keys, its annotations and its layout", () => {
    const elements = ["project", "catalog", "definitions", "canvases", "annotations", "layout"];
    expect(keysOf(documentSchema).filter(key => !elements.includes(key) && !ELSEWHERE[`document.${key}`])).toEqual([]);
    // Findings, notes and lanes are elements with fields; focus is "Look here" on boxes and arrows; scenarios are
    // recorded by simulating (format 1.1).
    expect(keysOf(Annotations)).toEqual(["findings", "notes", "focus", "lanes", "scenarios", "comments", "locks"]);
    expect(ELSEWHERE["document.annotations.focus"]).toBeTruthy();
    // Comments are written in their threads on the canvas; locks are switched in the inspector (format 1.3).
    expect(ELSEWHERE["document.annotations.comments"]).toBeTruthy();
    expect(ELSEWHERE["document.annotations.locks"]).toBeTruthy();
    expect(ELSEWHERE["document.annotations.scenarios"]).toBeTruthy();
    const node = keysIn(fieldsOfKind("node", { canvasKind: "machine", kind: "state" }));
    const edge = keysIn(fieldsOfKind("edge", { canvasKind: "machine", kind: "transition" }));
    expect(node.has("focus") && edge.has("focus")).toBe(true);
    // Layout: positions by moving, display and size in a box's details, routes by Auto-layout or Reset route.
    expect(keysOf(Layout)).toEqual(["legend", "canvases"]);
    expect(keysIn(fieldsOfKind("project")).has("legend")).toBe(true);
    expect(keysOf(NodeLayout).filter(key => !node.has(key === "w" || key === "h" ? "size" : key))).toEqual(["x", "y"]);
    expect(["x", "y"].every(key => ELSEWHERE[`layout.node.${key}`])).toBe(true);
    expect(keysOf(EdgeLayout).every(key => ELSEWHERE[`layout.edge.${key}`]) && edge.has("route")).toBe(true);
    expect(keysOf(NoteLayout).every(key => ELSEWHERE[`layout.note.${key}`])).toBe(true);
  });

  it("knows every key inside conditions, effects, retries, dates, evidence, tags and types", () => {
    const step = FlowNode.options.find(option => kindOf(option) === "call");
    const retry = RetryPolicy.shape;
    expect(keysOf(Condition)).toEqual(NESTED.condition);
    expect(Object.keys(retry)).toEqual(NESTED.retry);
    expect(Object.keys(shapeOf(retry.backoff))).toEqual(NESTED.backoff);
    expect(keysOf(Effective)).toEqual(NESTED.effective);
    expect(Object.fromEntries(Evidence.options.map(option => [kindOf(option), keysOf(option)]))).toEqual(
      NESTED.evidence
    );
    expect(keysOf(Tag)).toEqual(NESTED.tags);
    expect(Object.fromEntries(Effect.options.map(option => [keysOf(option)[0], keysOf(option)]))).toEqual(
      NESTED.effects
    );
    expect(Object.keys(elementOf(TypeDef.shape.fields).shape)).toEqual(NESTED.typeFields);
    expect(Object.keys(elementOf(TypeDef.shape.values).shape)).toEqual(NESTED.typeValues);
    expect(Object.keys(shapeOf(step.shape.request))).toEqual(NESTED.request);
  });
});

describe("the fields of an element", () => {
  const doc = readExample("get-paid-as-built");

  it("puts what a reviewer understands in Basics, with the format's own choices", () => {
    const { basics, details } = fieldsFor(doc, "nod_awaitingPayment");
    expect(basics.map(field => field.key)).toEqual([
      "name",
      "description",
      "category",
      "outcome",
      "terminal",
      "statuses",
      "connections",
      "roles"
    ]);
    expect(basics.find(field => field.key === "category")).toMatchObject({
      control: "choice",
      choices: ["waiting", "processing", "hold"],
      none: "nothingSpecial"
    });
    expect(details.map(field => field.key).slice(0, 3)).toEqual(["provenance", "evidence", "confidence"]);
    expect(details.find(field => field.key === "provenance").choices).toContain("legacy");
  });

  it("has fields for a transition, the level and a catalog item, and none for an ID it does not know", () => {
    const transition = fieldsFor(doc, "edg_createdAwaitingPayment");
    expect(transition.basics.map(field => field.key)).toEqual([
      "name",
      "description",
      "on",
      "after",
      "guard",
      "intent",
      "roles"
    ]);
    expect(transition.details.map(field => field.key)).toContain("retry");
    const level = fieldsFor(doc, "cnv_open");
    expect(level.basics.map(field => field.key)).toEqual(
      expect.arrayContaining(["name", "title", "stage", "transitions", "regions"])
    );
    const event = fieldsFor(doc, Object.keys(doc.catalog.events)[0]);
    expect(event.basics.find(field => field.key === "payload")).toMatchObject({
      collections: ["types"],
      extra: "null"
    });
    expect(fieldsFor(doc, "nod_nothing")).toBeNull();
  });

  it("opens a highlight: its name and meaning, without the fields of an element of the system", () => {
    const marked = structuredClone(doc);
    marked.catalog.highlights.hlt_critical = { name: "Critical", description: "Must not fail.", colour: "red" };
    const highlight = fieldsFor(marked, "hlt_critical");
    expect(highlight.basics.map(field => field.key)).toEqual(["name", "description"]);
    expect(highlight.details.map(field => field.key)).not.toContain("provenance");
  });
});
