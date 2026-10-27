// The package ships a lockfile (npm-shrinkwrap.json): `npx statewright` installs exactly the dependencies it was
// published with, from the registry, each checked by its hash — what a plugin directory asks of a pinned launcher.
// After changing the version or the dependencies: npm run build:shrinkwrap -w statewright.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "../src/constants.js";

const core = new URL("../", import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, core), "utf8"));

describe("the package's lockfile", () => {
  const pkg = json("package.json");
  const lock = json("npm-shrinkwrap.json");

  it("locks this version and exactly its dependencies, none for development", () => {
    expect(lock.lockfileVersion).toBe(3);
    expect(lock.name).toBe("statewright");
    expect(lock.version).toBe(PACKAGE_VERSION);
    expect(lock.packages[""]).toMatchObject({ name: "statewright", version: PACKAGE_VERSION });
    expect(lock.packages[""].dependencies).toEqual(pkg.dependencies);
    expect(lock.packages[""].devDependencies).toBeUndefined();
    for (const name of Object.keys(pkg.dependencies)) expect(lock.packages[`node_modules/${name}`]).toBeDefined();
  });

  it("locks the versions the workspace tests the package with", () => {
    const tested = JSON.parse(readFileSync(new URL("../../package-lock.json", core), "utf8")).packages;
    for (const [path, entry] of Object.entries(lock.packages).filter(([key]) => key !== "")) {
      expect(entry.version, path).toBe(tested[path]?.version);
    }
  });

  it("takes every package from the registry, with its hash", () => {
    const locked = Object.entries(lock.packages).filter(([path]) => path !== "");
    expect(locked.length).toBeGreaterThan(0);
    for (const [path, entry] of locked) {
      expect(entry.resolved, path).toMatch(/^https:\/\/registry\.npmjs\.org\//);
      expect(entry.integrity, path).toMatch(/^sha512-/);
      expect(entry.dev, path).toBeUndefined();
    }
  });

  it("is in the published package", () => {
    const [packed] = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: core, encoding: "utf8" })
    );
    expect(packed.files.map(file => file.path)).toContain("npm-shrinkwrap.json");
  });
});
