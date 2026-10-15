import { describe, expect, it } from "vitest";

import { CONTROLS } from "@/inspector/controls";
import { fieldsOfKind } from "@/inspector/fields";
import { CATALOG_SCHEMAS, kindsOf } from "@/inspector/schema";

/** Every kind of element the inspector or the catalog sheet shows. */
function everyKind() {
  const kinds = [];
  for (const canvasKind of ["system", "machine", "flow"]) {
    for (const kind of kindsOf("node", canvasKind)) kinds.push(["node", { canvasKind, kind }]);
    kinds.push(["canvas", { kind: canvasKind }]);
  }
  kinds.push(["edge", { canvasKind: "system" }], ["edge", { canvasKind: "flow" }]);
  kinds.push(
    ["edge", { canvasKind: "machine", kind: "transition" }],
    ["edge", { canvasKind: "machine", kind: "link" }]
  );
  for (const collection of Object.keys(CATALOG_SCHEMAS)) kinds.push(["catalog", { collection }]);
  for (const type of ["project", "definition", "region", "note", "lane", "finding"]) kinds.push([type, {}]);
  return kinds;
}

describe("every field of format 1.0 is editable somewhere (spec §13, E4)", () => {
  it("has a control for every field the model lists, for every kind of element", () => {
    const missing = everyKind().flatMap(([type, of]) =>
      fieldsOfKind(type, of)
        .filter(field => field.control !== "title" && !CONTROLS[field.control])
        .map(field => `${type}.${of.kind ?? of.collection ?? of.canvasKind ?? ""}.${field.key}: ${field.control}`)
    );
    expect(missing).toEqual([]);
  });
});
