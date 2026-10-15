import { describe, expect, it } from "vitest";
import { OPERATIONS, inputSchemaOf } from "../../src/agent/index.js";
import { splitArguments, toolsOf } from "../../src/mcp/tools.js";

describe("the contract's operations as MCP tools (AI interface spec §5)", () => {
  it("lists one tool per operation, named group_action, in the contract's order, then the bridge's own and the guide", () => {
    const tools = toolsOf();
    expect(tools.map(tool => tool.name)).toEqual([
      ...OPERATIONS.map(operation => operation.name.replace(".", "_")),
      "editor_pair",
      "editor_disconnect",
      "guide_read"
    ]);
    expect(tools).toHaveLength(42);
    for (const tool of tools) expect(tool.name).toMatch(/^[a-z]+_[a-zA-Z]+$/);
  });

  it("pairs with the person's Editor by the code it shows, and ends the pairing (spec §5)", () => {
    const byName = Object.fromEntries(toolsOf().map(tool => [tool.name, tool]));
    expect(byName.editor_pair.description).toMatch(/^Pair with the person's Statewright Editor: .* Errors: /);
    expect(byName.editor_pair.description).toContain(
      "they open the Editor (https://statewright.cpss.com.br) and its Connect an AI… (on the Projects screen, or a project's menu or ⌘K)"
    );
    expect(byName.editor_pair.inputSchema).toMatchObject({
      required: ["code"],
      additionalProperties: false,
      properties: { code: { type: "string" }, agent: { type: "string" } }
    });
    expect(byName.editor_disconnect.inputSchema).toEqual({
      type: "object",
      properties: {},
      additionalProperties: false
    });
    expect(byName.editor_pair.inputSchema.properties).not.toHaveProperty("file");
  });

  it("reads the guide, a section at a time, without changing anything (AI interface plan A5)", () => {
    const byName = Object.fromEntries(toolsOf().map(tool => [tool.name, tool]));
    expect(byName.guide_read.description).toMatch(/^Read the Statewright guide, offline: without section, /);
    expect(byName.guide_read.description).toMatch(/ Errors: BAD_ARGUMENTS, NOT_FOUND, FILE\.$/);
    expect(byName.guide_read.inputSchema).toEqual({
      type: "object",
      properties: { section: expect.objectContaining({ type: "string", minLength: 1 }) },
      additionalProperties: false
    });
    expect(byName.guide_read.annotations).toEqual({ readOnlyHint: true, openWorldHint: false });
  });

  it("describes each tool: what it does, whether it needs the Editor, the errors of its own", () => {
    const byName = Object.fromEntries(toolsOf().map(tool => [tool.name, tool]));
    expect(byName.document_summary.description).toBe(
      "The project, its levels as a tree, how many elements of each kind, and the format version."
    );
    expect(byName.level_get.description).toMatch(/ Errors: NOT_FOUND\.$/);
    expect(byName.view_open.description).toMatch(/ Needs a paired Editor\. Errors: NOT_FOUND, BUSY\.$/);
    expect(byName.export_document.description).toMatch(/^The signed \.sttw: /);
  });

  it("names the document a .sttw, and says a .statewright.json saved before 0.1.5 works as well", () => {
    const { file } = toolsOf().find(tool => tool.name === "document_summary").inputSchema.properties;
    expect(file.description).toMatch(/^The \.sttw to work on \(or a \.statewright\.json saved before 0\.1\.5\), /);
    for (const tool of toolsOf()) expect(tool.description, tool.name).not.toContain(".statewright.json");
  });

  it("gives every operation's tool `file`, and the tools that change the document `acceptChanges`", () => {
    for (const tool of toolsOf().slice(0, OPERATIONS.length)) {
      const operation = OPERATIONS.find(item => item.name.replace(".", "_") === tool.name);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties.file).toMatchObject({ type: "string", minLength: 1 });
      expect(Boolean(tool.inputSchema.properties.acceptChanges), tool.name).toBe(Boolean(operation.writes));
      expect(tool.inputSchema.required ?? [], tool.name).not.toContain("file");
      expect(inputSchemaOf(operation.name).properties ?? {}, tool.name).not.toHaveProperty("file");
    }
    const level = toolsOf().find(tool => tool.name === "level_get");
    expect(level.inputSchema.required).toEqual(["canvas"]);
    expect(level.inputSchema.additionalProperties).toBe(false);
  });

  it("marks the tools that only read, so a client may call them without asking", () => {
    const reading = toolsOf()
      .filter(tool => tool.annotations.readOnlyHint)
      .map(tool => tool.name);
    expect(reading).toEqual([
      "document_summary",
      "document_get",
      "level_get",
      "query_find",
      "query_usages",
      "query_path",
      "problems_list",
      "editor_state",
      "run_moves",
      "run_state",
      "scenario_replay",
      "audit_report",
      "guide_read"
    ]);
    for (const tool of toolsOf()) expect(tool.annotations.openWorldHint).toBe(false);
  });

  it("takes `file` and `acceptChanges` out of a tool's arguments", () => {
    expect(splitArguments({ canvas: "cnv_a", file: "a.json", acceptChanges: true })).toEqual({
      args: { canvas: "cnv_a" },
      file: "a.json",
      acceptChanges: true
    });
    expect(splitArguments(undefined)).toEqual({ args: {}, file: undefined, acceptChanges: undefined });
  });
});
