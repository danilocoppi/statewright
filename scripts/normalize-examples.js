// Rewrites every examples/*.sttw in canonical file form and signs it (channel "cli").
// Files that are already normalized and correctly signed are left untouched.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, sign, stringify, verify } from "statewright";

const dir = new URL("../examples/", import.meta.url).pathname;
let failed = false;

for (const name of (await readdir(dir)).filter(file => file.endsWith(".sttw")).sort()) {
  const path = join(dir, name);
  const text = await readFile(path, "utf8");
  const result = parse(text);
  if (!result.ok) {
    failed = true;
    console.error(`✗ ${name}`);
    for (const error of result.errors) console.error(`  ${error.path || "/"}: ${error.message}`);
    continue;
  }
  const status = await verify(result.doc);
  const clean = Object.values(status).every(value => value === "ok") && stringify(result.doc) === text;
  if (clean) {
    console.log(`= ${name}`);
    continue;
  }
  await writeFile(path, stringify(await sign(result.doc, { channel: "cli" })));
  console.log(`✓ ${name}`);
}

process.exit(failed ? 1 : 0);
