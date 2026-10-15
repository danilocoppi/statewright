import { describe, expect, it } from "vitest";
import {
  AGENT_ERROR_CODES,
  AgentError,
  CALL_ERRORS,
  OPERATIONS,
  checkResult,
  errorsOf,
  failure,
  inputSchemaOf,
  operationNamed,
  operationOfTool,
  success,
  toolNameOf,
  validateCall
} from "../../src/agent/index.js";
import { applyBatch } from "../../src/commands/index.js";
import { paymentsDoc } from "../helpers.js";

/** Spec §4.2's operations, by group. */
const SPEC = {
  document: ["document.summary", "document.get"],
  level: ["level.get"],
  query: ["query.find", "query.usages", "query.path"],
  problems: ["problems.list"],
  editor: ["editor.state"],
  batch: ["batch.apply"],
  history: ["history.undo", "history.redo"],
  layout: ["layout.arrange"],
  view: ["view.open", "view.select", "view.reveal", "view.fit", "view.point"],
  run: ["run.start", "run.moves", "run.step", "run.answer", "run.state", "run.back", "run.stop"],
  scenario: ["scenario.save", "scenario.replay", "scenario.present"],
  export: [
    "export.document",
    "export.svg",
    "export.png",
    "export.markdown",
    "export.aiPack",
    "export.contract",
    "export.scenarioPage"
  ],
  projects: ["projects.list", "projects.open", "projects.create", "projects.import"],
  audit: ["audit.report"]
};

describe("the agent contract (AI interface spec §4)", () => {
  it("lists every operation of the spec once, each with what it does, its arguments and its result", () => {
    expect(OPERATIONS.map(operation => operation.name).sort()).toEqual(Object.values(SPEC).flat().sort());
    for (const operation of OPERATIONS) {
      expect(operation.group, operation.name).toBe(operation.name.split(".")[0]);
      expect(operation.summary, operation.name).toMatch(/^[A-Z].*\.$/);
      expect(typeof operation.input.safeParse, operation.name).toBe("function");
      expect(typeof operation.result.safeParse, operation.name).toBe("function");
    }
  });

  it("marks what needs the Editor, and what changes the document", () => {
    const needing = OPERATIONS.filter(operation => operation.needs === "editor").map(operation => operation.name);
    expect(needing.sort()).toEqual(
      [
        "editor.state",
        "view.open",
        "view.select",
        "view.reveal",
        "view.fit",
        "view.point",
        "scenario.present",
        "export.png",
        "projects.list",
        "projects.import"
      ].sort()
    );
    const writing = OPERATIONS.filter(operation => operation.writes).map(operation => operation.name);
    expect(writing.sort()).toEqual(
      ["batch.apply", "history.undo", "history.redo", "layout.arrange", "scenario.save"].sort()
    );
  });

  it("lists the errors each operation can answer, besides those any call can", () => {
    expect(CALL_ERRORS).toEqual([
      "BAD_ARGUMENTS",
      "FILE",
      "NOT_ALLOWED",
      "NEEDS_EDITOR",
      "NOT_PAIRED",
      "EDITOR_GONE",
      "TIMEOUT",
      "INTERNAL"
    ]);
    for (const operation of OPERATIONS) {
      for (const code of operation.errors) {
        expect(AGENT_ERROR_CODES, `${operation.name}: ${code}`).toContain(code);
        expect(CALL_ERRORS, `${operation.name}: ${code}`).not.toContain(code);
      }
    }
    expect(operationNamed("document.summary").errors).toEqual([]);
    expect(operationNamed("level.get").errors).toEqual(["NOT_FOUND"]);
    expect(operationNamed("batch.apply").errors).toEqual(expect.arrayContaining(["SCHEMA", "IN_USE", "SIMULATING"]));
    expect(errorsOf("history.undo")).toEqual(["NOT_AI_CHANGE", "READ_ONLY", "SIMULATING", ...CALL_ERRORS]);
  });

  it("checks a call's arguments, fills in defaults, and names the field that is wrong", () => {
    expect(validateCall("layout.arrange", { canvas: "cnv_lifecycle" })).toMatchObject({
      ok: true,
      args: { canvas: "cnv_lifecycle", scope: "missing" }
    });
    expect(validateCall("level.get", {})).toMatchObject({
      ok: false,
      error: { code: "BAD_ARGUMENTS", details: { path: "canvas" } }
    });
    expect(validateCall("document.get", { extra: 1 })).toMatchObject({ ok: false, error: { code: "BAD_ARGUMENTS" } });
    expect(validateCall("projects.open", { id: "prj_a", path: "a.json" })).toMatchObject({
      ok: false,
      error: { message: "Invalid arguments for projects.open: (arguments) Give either id or path" }
    });
    expect(validateCall("nope.nothing")).toEqual({
      ok: false,
      error: { code: "BAD_ARGUMENTS", message: 'There is no operation "nope.nothing"; the contract lists them all' }
    });
  });

  it("names each operation as an MCP tool, and finds the operation from it", () => {
    for (const { name } of OPERATIONS) {
      expect(toolNameOf(name)).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(operationOfTool(toolNameOf(name))).toBe(operationNamed(name));
    }
    expect(toolNameOf("export.scenarioPage")).toBe("export_scenarioPage");
  });

  it("gives each operation's arguments as JSON Schema", () => {
    for (const { name } of OPERATIONS) {
      const schema = inputSchemaOf(name);
      expect(schema.type, name).toBe("object");
      expect(schema.$schema, name).toBeUndefined();
    }
    expect(inputSchemaOf("level.get")).toEqual({
      type: "object",
      properties: { canvas: { type: "string", minLength: 1 } },
      required: ["canvas"],
      additionalProperties: false
    });
  });

  it("checks a host's result against the operation's result schema", () => {
    expect(checkResult("history.undo", { label: "Add a state" })).toEqual({ ok: true });
    expect(checkResult("history.undo", { label: 3 })).toMatchObject({ ok: false, errors: [{ path: "label" }] });
  });

  it("turns what a host throws into a result: its code, its message, where it failed", () => {
    expect(success({ id: "x" })).toEqual({ ok: true, result: { id: "x" } });
    expect(failure(new AgentError("NEEDS_EDITOR", "Pair an Editor first"))).toEqual({
      ok: false,
      error: { code: "NEEDS_EDITOR", message: "Pair an Editor first" }
    });
    let thrown;
    try {
      applyBatch(paymentsDoc(), [
        { type: "node.update", args: { id: "nod_running", set: { name: "on" } } },
        { type: "node.remove", args: { id: "nod_nope" } }
      ]);
    } catch (error) {
      thrown = error;
    }
    expect(failure(thrown)).toMatchObject({ ok: false, error: { code: "NOT_FOUND", details: { index: 1 } } });
    expect(failure(new TypeError("boom"))).toEqual({ ok: false, error: { code: "INTERNAL", message: "boom" } });
    expect(AGENT_ERROR_CODES).toEqual(
      expect.arrayContaining(["SCHEMA", "NOT_FOUND", "BAD_ARGUMENTS", "NEEDS_EDITOR", "EDITOR_GONE", "INTERNAL"])
    );
  });
});
