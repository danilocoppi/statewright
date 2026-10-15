// Writes schema/<version>.json from the zod schemas. Run after changing src/schema/. Earlier versions' files stay as
// they were published: documents of those formats still point to them.
import { writeFile } from "node:fs/promises";
import { FORMAT_VERSION, toJSONSchema } from "../src/index.js";

const target = new URL(`../schema/${FORMAT_VERSION}.json`, import.meta.url);
await writeFile(target, `${JSON.stringify(toJSONSchema(), null, 2)}\n`);
console.log(`wrote ${target.pathname}`);
