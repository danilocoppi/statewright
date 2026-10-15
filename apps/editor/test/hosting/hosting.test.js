import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { hostingPlugin, platformOf } from "../../scripts/hosting.js";

describe("static hosting", () => {
  it("serves the app at the root of its origin without an address", () => {
    expect(platformOf("")).toEqual({ url: "/", base: "/" });
    expect(platformOf()).toEqual({ url: "/", base: "/" });
  });

  it("serves the app under the path of the platform's address", () => {
    expect(platformOf("https://example.com")).toEqual({ url: "https://example.com/", base: "/" });
    expect(platformOf("https://example.com/statewright")).toEqual({
      url: "https://example.com/statewright/",
      base: "/statewright/"
    });
    expect(platformOf("http://localhost:4174/statewright/")).toEqual({
      url: "http://localhost:4174/statewright/",
      base: "/statewright/"
    });
  });

  it("refuses an address that is not absolute", () => {
    expect(() => platformOf("/statewright/")).toThrow("VITE_BASE_URL must be an absolute address");
    expect(() => platformOf("ftp://example.com/")).toThrow("VITE_BASE_URL must be an absolute address");
  });

  it("writes what static hosts read to send every other address to the app", async () => {
    const dir = await mkdtemp(join(tmpdir(), "statewright-hosting-"));
    await writeFile(join(dir, "index.html"), "<!doctype html><title>Statewright</title>");
    await hostingPlugin("/statewright/").writeBundle({ dir });
    expect(await readFile(join(dir, "_redirects"), "utf8")).toBe("/statewright/* /statewright/index.html 200\n");
    expect(await readFile(join(dir, "404.html"), "utf8")).toBe("<!doctype html><title>Statewright</title>");
  });
});
