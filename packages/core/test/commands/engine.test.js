import { describe, expect, it } from "vitest";
import { applyBatch, applyPatches, listCommands } from "../../src/commands/index.js";
import { stringify } from "../../src/serialize/stringify.js";
import { minimalDoc } from "../helpers.js";
import { cmd, failure, run } from "./helpers.js";

describe("applyBatch", () => {
  it("applies a command and returns a new document, patches, inverse patches and created IDs", () => {
    const doc = minimalDoc();
    const result = applyBatch(doc, [cmd("project.update", { set: { name: "Payments" } })]);
    expect(result.doc.project.name).toBe("Payments");
    expect(doc.project.name).toBe("Demo");
    expect(result.patches).toEqual([{ op: "replace", path: ["project", "name"], value: "Payments" }]);
    expect(result.inversePatches).toEqual([{ op: "replace", path: ["project", "name"], value: "Demo" }]);
    expect(result.created).toEqual([]);
  });

  it("undoes and redoes with the patches", () => {
    const doc = minimalDoc();
    const result = applyBatch(doc, [cmd("project.update", { set: { description: "d" } })]);
    expect(stringify(applyPatches(result.doc, result.inversePatches))).toBe(stringify(doc));
    expect(stringify(applyPatches(doc, result.patches))).toBe(stringify(result.doc));
  });

  it("is atomic: a failing command leaves the document untouched and is named by index", () => {
    const doc = minimalDoc();
    const before = stringify(doc);
    const error = failure(
      doc,
      cmd("project.update", { set: { name: "Changed" } }),
      cmd("project.update", { set: { id: "prj_other" } })
    );
    expect(error.code).toBe("NOT_ALLOWED");
    expect(error.index).toBe(1);
    expect(stringify(doc)).toBe(before);
  });

  it("rejects unknown command types and invalid args", () => {
    expect(failure(minimalDoc(), cmd("project.rename", {})).code).toBe("INVALID_ARGS");
    const error = failure(minimalDoc(), cmd("project.update", { set: { name: "x" }, colour: 1 }));
    expect(error.code).toBe("INVALID_ARGS");
    expect(error.message).toContain("colour");
    expect(failure(minimalDoc(), "project.update").code).toBe("INVALID_ARGS");
  });

  it("reports SCHEMA with the location when the element would become invalid", () => {
    const error = failure(minimalDoc(), cmd("project.update", { set: { name: "" } }));
    expect(error.code).toBe("SCHEMA");
    expect(error.details.errors[0].path).toBe("/project/name");
  });

  it("stores explicit null and removes keys with unset", () => {
    let doc = run(minimalDoc(), cmd("project.update", { set: { description: "x" } }));
    doc = run(doc, cmd("project.update", { unset: ["description"] }));
    expect("description" in doc.project).toBe(false);
    expect(failure(doc, cmd("project.update", { set: { name: "a" }, unset: ["name"] })).code).toBe("INVALID_ARGS");
  });

  it("does not let callers change the document through objects they passed in", () => {
    const set = { description: "mine" };
    const doc = run(minimalDoc(), cmd("project.update", { set }));
    set.description = "changed later";
    expect(doc.project.description).toBe("mine");
  });

  it("an empty batch returns the same document", () => {
    const doc = minimalDoc();
    expect(applyBatch(doc, []).doc).toBe(doc);
  });
});

describe("listCommands", () => {
  it("describes each command with a one-line description and the JSON Schema of its args", () => {
    const command = listCommands().find(entry => entry.type === "project.update");
    expect(command.description).toMatch(/project/);
    expect(command.args).toMatchObject({ type: "object", additionalProperties: false });
    expect(Object.keys(command.args.properties)).toEqual(["set", "unset"]);
  });
});
