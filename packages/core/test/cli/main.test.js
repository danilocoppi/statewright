import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "../../src/constants.js";
import { cli } from "./helpers.js";

describe("statewright (CLI entry)", () => {
  it("prints usage on stderr and exits 2 without a command", async () => {
    const run = await cli([]);
    expect(run.code).toBe(2);
    expect(run.stderr).toContain("Usage: statewright <command> [options]");
  });

  it("prints usage on stdout with --help and the version with --version", async () => {
    expect((await cli(["--help"])).stdout).toContain("validate <file>");
    expect(await cli(["--version"])).toMatchObject({ code: 0, stdout: `${PACKAGE_VERSION}\n` });
  });

  it("tells an AI agent where to start, and that the guide reads a section at a time (AI interface plan A5)", async () => {
    const help = (await cli(["--help"])).stdout;
    expect(help).toContain("\nAI agents start with statewright guide start-here.\n");
    expect(help).toMatch(/\n {2}guide \[section\] +Print the Statewright guide/);
  });

  it("exits 2 on unknown commands, unknown options and wrong argument counts", async () => {
    expect((await cli(["frobnicate"])).code).toBe(2);
    const option = await cli(["validate", "x.json", "--colour"]);
    expect(option.code).toBe(2);
    expect(option.stderr).toContain("'--colour'");
    const count = await cli(["validate"]);
    expect(count.code).toBe(2);
    expect(count.stderr).toBe("statewright: Wrong number of arguments (usage: statewright validate <file>)\n");
  });

  it("prints one line on stderr and, with --json, the error as JSON on stdout", async () => {
    const run = await cli(["validate", "missing.json", "--json"]);
    expect(run.code).toBe(2);
    expect(run.stderr).toBe("statewright: Cannot read missing.json: no such file\n");
    expect(run.json()).toEqual({ ok: false, error: { message: "Cannot read missing.json: no such file" } });
  });

  it("prints help for one command", async () => {
    const run = await cli(["validate", "--help"]);
    expect(run.code).toBe(0);
    expect(run.stdout).toMatch(/^Usage: statewright validate <file>\n/);
  });
});
