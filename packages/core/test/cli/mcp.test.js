import { describe, expect, it } from "vitest";
import { cli } from "./helpers.js";

describe("statewright mcp in the command line", () => {
  it("answers the lines it reads and exits 0 when its input ends", async () => {
    const stdin = [
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { clientInfo: { name: "cli-test" } } }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })
    ].join("\n");
    const { code, stdout, stderr } = await cli(["mcp", "--port", "0"], { stdin });
    expect(code).toBe(0);
    const answers = stdout
      .trim()
      .split("\n")
      .map(line => JSON.parse(line));
    expect(answers.map(answer => answer.id).sort()).toEqual([1, 2]);
    expect(answers.find(answer => answer.id === 2).result.tools).toHaveLength(45);
    expect(stderr).toContain("statewright mcp: ready: 45 tools\n");
    expect(stderr).toContain("statewright mcp: connected to cli-test\n");
    expect(stderr).toMatch(/^statewright mcp: bridge on http:\/\/127\.0\.0\.1:\d+$/m);
    expect(stderr.trim().split("\n")).toHaveLength(3);
  });

  it("refuses a port or an origin that is not one", async () => {
    expect(await cli(["mcp", "--port", "70000"])).toMatchObject({
      code: 2,
      stderr: 'statewright: --port must be a port number from 0 to 65535, not "70000"\n'
    });
    expect((await cli(["mcp", "--origin", "editor"])).code).toBe(2);
  });

  it("is listed in the help", async () => {
    expect((await cli(["--help"])).stdout).toMatch(
      /^ {2}mcp \[--file <path>\] \[--port <n>\] \[--origin <url>\] +Serve the agent contract/m
    );
  });
});
