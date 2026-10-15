// Builds packages/core/README.md (the npm README) from docs/guide/README.md, filling the generated blocks.
// Run after changing the guide, the commands, the rules or the schema.
import { readFile, writeFile } from "node:fs/promises";
import { renderGuide } from "statewright";

const source = await readFile(new URL("../docs/guide/README.md", import.meta.url), "utf8");
const target = new URL("../packages/core/README.md", import.meta.url);
await writeFile(target, renderGuide(source));
console.log(`wrote ${target.pathname}`);
