// `statewright mcp` for the end-to-end tests (AI interface spec §10: "a test starts statewright mcp"): Core's CLI in a
// child process, its bridge on a free port, and an MCP client that sends requests on its stdin and reads the answers.
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const BIN = resolve(import.meta.dirname, "../../../packages/core/src/cli/bin.js");

/**
 * Start `statewright mcp --port 0` in a folder of its own, and say hello as an MCP client named `agent`.
 * @param {{ agent?: string, args?: string[] }} [options]
 */
export async function startMcp({ agent = "e2e-agent", args = [] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "statewright-e2e-"));
  const child = spawn(process.execPath, [BIN, "mcp", "--port", "0", ...args], { cwd: dir, stdio: "pipe" });
  const waiting = new Map();
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    stdout += chunk;
    let end;
    while ((end = stdout.indexOf("\n")) >= 0) {
      const message = JSON.parse(stdout.slice(0, end));
      stdout = stdout.slice(end + 1);
      waiting.get(message.id)?.(message);
    }
  });
  child.stderr.on("data", chunk => (stderr += chunk));
  let next = 0;
  const request = (method, params) => {
    const id = (next += 1);
    const answered = new Promise(resolve => waiting.set(id, resolve));
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) })}\n`);
    return answered;
  };
  /** A tool's answer: its result, or `{ error }` when it answered an error. */
  const tool = async (name, toolArgs = {}) => {
    const { result } = await request("tools/call", { name, arguments: toolArgs });
    return result.structuredContent;
  };
  await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: agent } });
  while (!/bridge on http:\/\/127\.0\.0\.1:\d+/.test(stderr)) await new Promise(done => setTimeout(done, 20));
  const address = /bridge on http:\/\/(127\.0\.0\.1:\d+)/.exec(stderr)[1];
  return {
    dir,
    address,
    tool,
    stderr: () => stderr,
    /** Pair with the tab that shows `code`: tried again until the tab's code has reached the bridge. */
    async pair(code) {
      for (;;) {
        const answer = await tool("editor_pair", { code });
        if (answer.error?.code !== "NOT_FOUND") return answer;
        await new Promise(done => setTimeout(done, 50));
      }
    },
    stop() {
      child.stdin.end();
      return new Promise(done => child.on("close", done));
    }
  };
}
