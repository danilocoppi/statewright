import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PACKAGE_VERSION } from "../src/constants.js";

it("PACKAGE_VERSION matches package.json", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  expect(PACKAGE_VERSION).toBe(pkg.version);
});
