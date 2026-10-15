import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EXAMPLE } from "./helpers.js";

const BIN = fileURLToPath(new URL("../../src/cli/bin.js", import.meta.url));
const run = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

describe("bin/statewright", () => {
  it("runs as a process with exit codes and JSON output", () => {
    const ok = run("validate", EXAMPLE, "--json");
    expect(ok.status).toBe(0);
    expect(JSON.parse(ok.stdout).summary).toEqual({ error: 0, warning: 0, incomplete: 14 });
    const missing = run("validate", "no-such-file.json");
    expect(missing.status).toBe(2);
    expect(missing.stderr).toBe("statewright: Cannot read no-such-file.json: no such file\n");
  });

  it("stops quietly when the reader closes the pipe early", async () => {
    const child = spawn(process.execPath, [BIN, "schema"], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", chunk => (stderr += chunk));
    child.stdout.once("data", () => child.stdout.destroy());
    const code = await new Promise(resolve => child.on("close", resolve));
    expect(stderr).toBe("");
    expect(code).toBe(0);
  });
});
