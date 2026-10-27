// Writes npm-shrinkwrap.json: the lockfile the package ships, so `npx statewright` installs exactly the dependencies
// it was published with — the versions the workspace tests it with (its package-lock.json), from the registry, each
// with its hash. Locked apart from the workspace, with the package's own dependencies only, none for development. Run
// after changing the version or the dependencies.
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const { name, version, dependencies } = await read("../package.json");
const tested = (await read("../../../package-lock.json")).packages;

// What the dependencies need, as the workspace locked it: each package and, in turn, its own dependencies.
const seeded = {};
const visit = dependency => {
  const path = `node_modules/${dependency}`;
  const entry = tested[path];
  if (!entry || seeded[path]) return;
  const { dev, devOptional, peer, ...kept } = entry; // eslint-disable-line no-unused-vars
  seeded[path] = kept;
  for (const next of Object.keys(entry.dependencies ?? {})) visit(next);
};
for (const dependency of Object.keys(dependencies)) visit(dependency);

const dir = await mkdtemp(join(tmpdir(), "statewright-shrinkwrap-"));
try {
  const root = { name, version, dependencies };
  await writeFile(join(dir, "package.json"), JSON.stringify(root, null, 2));
  await writeFile(
    join(dir, "package-lock.json"),
    JSON.stringify({ name, version, lockfileVersion: 3, requires: true, packages: { "": root, ...seeded } }, null, 2)
  );
  const npm = args => execFileSync("npm", args, { cwd: dir, stdio: "inherit" });
  npm([
    "install",
    "--package-lock-only",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--registry=https://registry.npmjs.org/"
  ]);
  npm(["shrinkwrap"]);
  const target = new URL("../npm-shrinkwrap.json", import.meta.url);
  await writeFile(target, await readFile(join(dir, "npm-shrinkwrap.json"), "utf8"));
  console.log(`wrote ${target.pathname}`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
