import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main } from "../../src/cli/main.js";

/** Absolute path of the payments example. */
export const EXAMPLE = fileURLToPath(new URL("../../../../examples/payments.sttw", import.meta.url));

/** A fresh temporary directory. */
export const workspace = () => mkdtemp(join(tmpdir(), "statewright-cli-"));

/**
 * Run the CLI in-process with captured output.
 * @param {string[]} argv
 * @param {{ cwd?: string, stdin?: string }} [options]
 */
export async function cli(argv, { cwd = process.cwd(), stdin = "" } = {}) {
  let stdout = "";
  let stderr = "";
  const code = await main(argv, {
    cwd,
    stdout: text => (stdout += text),
    stderr: text => (stderr += text),
    readStdin: async () => stdin,
    lines: async function* () {
      yield* stdin.split("\n");
    }
  });
  return { code, stdout, stderr, json: () => JSON.parse(stdout) };
}
