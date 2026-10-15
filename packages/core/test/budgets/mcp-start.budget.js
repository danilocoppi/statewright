// The MCP server's start (AI interface spec §11): "`tools/list` answers within 100 ms of the server starting". Timed
// from the process's spawn to its answer, at its fastest of five starts, in a run of its own (`npm run budgets -w
// statewright`): with the other tests' processes beside it, every start is slower than an agent's client ever sees.
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const BIN = fileURLToPath(new URL("../../src/cli/bin.js", import.meta.url));

/** From spawning `statewright mcp` to its answer to tools/list, in milliseconds. */
async function start(cwd) {
  const begun = performance.now();
  const child = spawn(process.execPath, [BIN, "mcp"], { cwd, stdio: ["pipe", "pipe", "ignore"] });
  const answered = new Promise(resolve => child.stdout.once("data", resolve));
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`);
  await answered;
  const time = performance.now() - begun;
  child.stdin.end();
  await new Promise(resolve => child.on("close", resolve));
  return time;
}

describe("the MCP server's budget (AI interface spec §11)", () => {
  it("lists its tools within 100 ms of starting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-budget-"));
    const times = [];
    for (let run = 0; run < 5; run += 1) times.push(await start(dir));
    expect(Math.min(...times)).toBeLessThan(100);
  });
});
