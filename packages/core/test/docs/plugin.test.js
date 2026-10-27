import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION } from "../../src/constants.js";

const plugin = new URL("../../../../plugins/statewright/", import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, plugin), "utf8"));

describe("the Claude Code and Codex plugin", () => {
  it("has the package's version, so an update reaches people who installed it", () => {
    expect(json(".claude-plugin/plugin.json").version).toBe(PACKAGE_VERSION);
    expect(json(".codex-plugin/plugin.json").version).toBe(PACKAGE_VERSION);
  });

  it("runs the package's exact version, which a directory can review", () => {
    for (const file of [".mcp.json", "codex.mcp.json"]) {
      expect(json(file).mcpServers.statewright.args).toEqual(["-y", `statewright@${PACKAGE_VERSION}`, "mcp"]);
    }
  });

  it("says where to get support, and links its privacy policy and terms, which are in the repository", () => {
    const repo = "https://github.com/danilocoppi/statewright";
    const links = {
      support: `${repo}/issues`,
      privacy: `${repo}/blob/main/PRIVACY.md`,
      terms: `${repo}/blob/main/TERMS.md`
    };
    expect(json(".claude-plugin/plugin.json")).toMatchObject({
      supportUrl: links.support,
      privacyPolicyUrl: links.privacy,
      termsOfServiceUrl: links.terms,
      icon: "./.claude-plugin/icon.png"
    });
    expect(json(".codex-plugin/plugin.json").interface).toMatchObject({
      privacyPolicyURL: links.privacy,
      termsOfServiceURL: links.terms
    });
    for (const file of ["PRIVACY.md", "TERMS.md"]) expect(existsSync(new URL(`../../${file}`, plugin))).toBe(true);
  });

  it("has a square PNG icon of 512 to 2048 px, under 2 MB", () => {
    const icon = new URL(".claude-plugin/icon.png", plugin);
    expect(existsSync(icon)).toBe(true);
    const bytes = readFileSync(icon);
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    const width = bytes.readUInt32BE(16);
    expect(bytes.readUInt32BE(20)).toBe(width);
    expect(width).toBeGreaterThanOrEqual(512);
    expect(width).toBeLessThanOrEqual(2048);
    expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
  });
});
