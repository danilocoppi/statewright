// The MCP server's protocol (AI interface spec §5): JSON-RPC 2.0 messages, one per line — `initialize`, `ping`,
// `tools/list` and `tools/call`, and the notifications a client sends. It reads and writes nothing itself: `receive`
// takes a line and resolves to the line to answer, if any, so the same server runs over stdio and in tests.
import { EDITOR_ORIGIN } from "../constants.js";

/** The protocol versions this server speaks, newest first. */
export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

/** JSON-RPC's own error codes. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

/**
 * What the server tells a client about itself when it connects: how to work with the person and the rules that matter
 * most, short enough for every client to keep whole; the guide (`guide_read`) holds the rest (AI interface plan A5).
 */
const INSTRUCTIONS = [
  "Statewright designs systems as layered specifications: architecture views, state machines and flows nested to any",
  "depth, in one signed .statewright.json document.",
  `To work with a person, pair with their Editor: they open ${EDITOR_ORIGIN}, choose Connect an AI… on the Projects`,
  "screen, before any project is open (or in a project's menu, or ⌘K), and read you its code; call editor_pair with",
  "it. Every tool without `file` then works in their tab, where they see each of your changes and can undo it; then",
  "projects_create makes the project you design in, in their tab. Without the Editor, pass `file` (a path).",
  "Before you design, read the guide with guide_read: without arguments it says where to start, and its rules and",
  "playbooks say how to work. In short: change documents only with batch_apply, never by editing the JSON; build",
  "top-down, level 0 first, confirmed with the person, then one level per box that needs detail, about 12 boxes per",
  "level; declare events, endpoints and parties in the catalog and reference them by ID; do not invent what you do",
  "not know; after each batch read problems_list and fix the errors; point at what you changed with view_point, and",
  "show behaviour with scenario_present.",
  "A tool answers JSON: its result, or, with isError, { code, message, details } saying what to do."
].join(" ");

const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const answer = (id, result) => ({ jsonrpc: "2.0", id, result });
const refuse = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

/** A tool's answer as MCP returns it: the JSON as text, and as structured content; an error sets `isError`. */
function toolResult(outcome) {
  const content = outcome.ok ? outcome.result : { error: outcome.error };
  const text = JSON.stringify(outcome.ok ? outcome.result : outcome.error);
  return { content: [{ type: "text", text }], structuredContent: content, ...(outcome.ok ? {} : { isError: true }) };
}

/**
 * An MCP server over the agent contract.
 * @param {{ version: string, tools: Array<{ name: string }>,
 *   call: (tool: string, args: object) => Promise<{ ok: boolean, result?: any, error?: object }>,
 *   log?: (line: string) => void }} options `tools`: what `tools/list` answers; `call`: runs a listed tool (never
 *   rejects); `log`: the server's own log (stderr).
 * @returns {{ receive: (line: string) => Promise<string | null>, handle: (message: unknown) => Promise<object | null>,
 *   client: () => { name?: string, version?: string } | null }}
 */
export function createMcpServer({ version, tools, call, log = () => {} }) {
  const names = new Set(tools.map(tool => tool.name));
  let client = null;

  /** The answer to a request, by its method. */
  async function request(method, params, id) {
    if (method === "initialize") {
      client = isObject(params.clientInfo) ? params.clientInfo : {};
      const asked = params.protocolVersion;
      log(`connected to ${client.name ?? "a client"}`);
      return answer(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "statewright", version },
        instructions: INSTRUCTIONS
      });
    }
    if (method === "ping") return answer(id, {});
    if (method === "tools/list") return answer(id, { tools });
    if (method === "tools/call") {
      const { name, arguments: args = {} } = params;
      if (typeof name !== "string" || !names.has(name)) return refuse(id, INVALID_PARAMS, `Unknown tool: ${name}`);
      if (!isObject(args)) return refuse(id, INVALID_PARAMS, `The arguments of ${name} must be an object`);
      let outcome;
      try {
        outcome = await call(name, args);
      } catch (error) {
        log(`${name} failed: ${error?.stack ?? error}`);
        outcome = { ok: false, error: { code: "INTERNAL", message: String(error?.message ?? error) } };
      }
      return answer(id, toolResult(outcome));
    }
    return refuse(id, METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }

  /** The answer to one message: a response for a request, nothing for a notification or a client's response. */
  async function handle(message) {
    if (Array.isArray(message)) return refuse(null, INVALID_REQUEST, "Batches of messages are not supported");
    if (!isObject(message) || message.jsonrpc !== "2.0") {
      return refuse(isObject(message) ? (message.id ?? null) : null, INVALID_REQUEST, "Not a JSON-RPC 2.0 message");
    }
    const { id, method, params = {} } = message;
    if (method === undefined) return null; // a response to a request of ours: the server sends none
    if (typeof method !== "string") return refuse(id ?? null, INVALID_REQUEST, "The method must be a string");
    if (id === undefined) return null; // a notification (initialized, cancelled, …): nothing to answer
    if (!isObject(params)) return refuse(id, INVALID_PARAMS, "The params must be an object");
    return request(method, params, id);
  }

  return {
    handle,
    async receive(line) {
      if (!line.trim()) return null;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        return JSON.stringify(refuse(null, PARSE_ERROR, "Not JSON"));
      }
      const response = await handle(message);
      return response && JSON.stringify(response);
    },
    client: () => client
  };
}
