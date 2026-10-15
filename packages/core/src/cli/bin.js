#!/usr/bin/env node
import { createInterface } from "node:readline";
import { main } from "./main.js";

// Output piped into a reader that stops early (statewright commands | head) is not an error.
process.stdout.on("error", error => {
  if (error.code !== "EPIPE") throw error;
  process.exit(process.exitCode ?? 0);
});

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

process.exitCode = await main(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: text => process.stdout.write(text),
  stderr: text => process.stderr.write(text),
  readStdin,
  lines: () => createInterface({ input: process.stdin, crlfDelay: Infinity })
});
