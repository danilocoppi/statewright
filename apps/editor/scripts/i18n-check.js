// Every language must have exactly the keys of English, the reference (spec §11). Runs before each build.
//
//   node scripts/i18n-check.js
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = new URL("../src/i18n/locales/", import.meta.url).pathname;
const REFERENCE = "en";

const flatten = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );

const keysOf = (language, file) => new Set(flatten(JSON.parse(readFileSync(join(LOCALES, language, file), "utf8"))));

const languages = readdirSync(LOCALES).filter(name => name !== REFERENCE);
const namespaces = readdirSync(join(LOCALES, REFERENCE)).filter(name => name.endsWith(".json"));
const problems = [];

for (const language of languages) {
  const files = new Set(readdirSync(join(LOCALES, language)));
  for (const namespace of namespaces) {
    if (!files.has(namespace)) {
      problems.push(`${language}/${namespace}: file missing`);
      continue;
    }
    const reference = keysOf(REFERENCE, namespace);
    const current = keysOf(language, namespace);
    for (const key of reference) if (!current.has(key)) problems.push(`${language}/${namespace}: missing "${key}"`);
    for (const key of current) if (!reference.has(key)) problems.push(`${language}/${namespace}: extra "${key}"`);
  }
}

if (problems.length) {
  console.error(`✖ i18n: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`✔ i18n: ${namespaces.length} namespaces × ${languages.length + 1} languages with the same keys`);
