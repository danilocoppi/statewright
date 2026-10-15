import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSIONS, createMcpServer } from "../../src/mcp/server.js";

const TOOLS = [{ name: "document_summary", description: "The project", inputSchema: { type: "object" } }];

/** A server whose one tool answers what `outcome` says, recording the calls it gets. */
function server(outcome = { ok: true, result: { project: { id: "prj_a" } } }) {
  const calls = [];
  const logged = [];
  const mcp = createMcpServer({
    version: "1.2.3",
    tools: TOOLS,
    call: async (name, args) => {
      calls.push([name, args]);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
    log: line => logged.push(line)
  });
  const send = async message => JSON.parse(await mcp.receive(JSON.stringify(message)));
  return { mcp, calls, logged, send };
}

describe("the MCP server's protocol (AI interface spec §5)", () => {
  it("tells an agent, as it connects, how to work with the person: the Editor, pairing, the guide and the essential rules (AI interface plan A5)", async () => {
    const { send } = server();
    const { instructions } = (await send({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })).result;
    for (const words of [
      "in one signed .sttw document",
      "To work with a person, pair with their Editor: they open https://statewright.cpss.com.br, choose Connect an AI…",
      "on the Projects screen, before any project is open",
      "then projects_create makes the project you design in, in their tab",
      "call editor_pair with it",
      "Without the Editor, pass `file`",
      "read the guide with guide_read",
      "change documents only with batch_apply, never by editing the JSON",
      "level 0 first, confirmed with the person, then one level per box that needs detail",
      "about 12 boxes per level",
      "declare events, endpoints and parties in the catalog and reference them by ID",
      "after each batch read problems_list and fix the errors",
      "view_point",
      "scenario_present",
      "{ code, message, details }"
    ]) {
      expect(instructions).toContain(words);
    }
    // Short enough for every client to keep it whole: the guide holds the rest.
    expect(instructions.length).toBeLessThan(2000);
  });

  it("answers initialize with its name, its version, the tools capability, and the protocol version asked", async () => {
    const { mcp, send, logged } = server();
    const response = await send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "claude-code", version: "2.0" } }
    });
    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "statewright", version: "1.2.3" },
        instructions: expect.stringContaining("batch_apply")
      }
    });
    expect(mcp.client()).toEqual({ name: "claude-code", version: "2.0" });
    expect(logged).toEqual(["connected to claude-code"]);
    const newer = await send({
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      params: { protocolVersion: "2099-01-01" }
    });
    expect(newer.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it("answers ping, and nothing to notifications", async () => {
    const { mcp, send } = server();
    expect(await send({ jsonrpc: "2.0", id: "p", method: "ping" })).toEqual({ jsonrpc: "2.0", id: "p", result: {} });
    expect(await mcp.receive(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }))).toBeNull();
    expect(
      await mcp.receive(JSON.stringify({ jsonrpc: "2.0", method: "notifications/cancelled", params: {} }))
    ).toBeNull();
    expect(await mcp.receive("   ")).toBeNull();
  });

  it("lists the tools", async () => {
    const { send } = server();
    expect(await send({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} })).toEqual({
      jsonrpc: "2.0",
      id: 3,
      result: { tools: TOOLS }
    });
  });

  it("calls a tool and returns its result as text and as structured content", async () => {
    const { send, calls } = server();
    const response = await send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "document_summary", arguments: { file: "a.json" } }
    });
    expect(calls).toEqual([["document_summary", { file: "a.json" }]]);
    expect(response.result).toEqual({
      content: [{ type: "text", text: '{"project":{"id":"prj_a"}}' }],
      structuredContent: { project: { id: "prj_a" } }
    });
  });

  it("returns a failed call as a result with isError and the contract's error", async () => {
    const error = { code: "NOT_FOUND", message: "There is no level", details: { id: "cnv_x" } };
    const { send } = server({ ok: false, error });
    const response = await send({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "document_summary" } });
    expect(response.result).toEqual({
      content: [{ type: "text", text: JSON.stringify(error) }],
      structuredContent: { error },
      isError: true
    });
  });

  it("answers INTERNAL, and logs it, when a call throws all the same", async () => {
    const { send, logged } = server(new Error("boom"));
    const response = await send({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "document_summary" } });
    expect(response.result).toMatchObject({
      isError: true,
      structuredContent: { error: { code: "INTERNAL", message: "boom" } }
    });
    expect(logged[0]).toMatch(/^document_summary failed: Error: boom/);
  });

  it("refuses what is not a request it knows, with JSON-RPC's errors", async () => {
    const { mcp, send, calls } = server();
    expect(JSON.parse(await mcp.receive("{nope"))).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Not JSON" }
    });
    expect((await send([{ jsonrpc: "2.0", id: 1, method: "ping" }])).error.code).toBe(-32600);
    expect((await send({ id: 7, method: "ping" })).error).toEqual({
      code: -32600,
      message: "Not a JSON-RPC 2.0 message"
    });
    expect(await send({ jsonrpc: "2.0", id: 8, method: "resources/list" })).toEqual({
      jsonrpc: "2.0",
      id: 8,
      error: { code: -32601, message: "Unknown method: resources/list" }
    });
    expect((await send({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "nope" } })).error).toEqual({
      code: -32602,
      message: "Unknown tool: nope"
    });
    expect(
      (
        await send({
          jsonrpc: "2.0",
          id: 10,
          method: "tools/call",
          params: { name: "document_summary", arguments: [] }
        })
      ).error.code
    ).toBe(-32602);
    expect((await send({ jsonrpc: "2.0", id: 11, method: "ping", params: 3 })).error.code).toBe(-32602);
    expect(await mcp.receive(JSON.stringify({ jsonrpc: "2.0", id: 12, result: {} }))).toBeNull();
    expect(calls).toEqual([]);
  });
});
