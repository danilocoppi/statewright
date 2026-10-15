import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { HOOKS } from "@/agent/hooks";

/** Every source file of the Editor. */
function sources(dir = join(process.cwd(), "src")) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? sources(join(dir, entry.name))
    : /\.jsx?$/.test(entry.name) ? [join(dir, entry.name)]
    : []
  );
}

describe("the hooks agents find the Editor by (AI interface spec §7.5)", () => {
  it("are named <area>-<thing>, once each, and say where they are", () => {
    const ids = HOOKS.map(hook => hook.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const hook of HOOKS) {
      expect(hook.id).toMatch(/^[a-z]+(-[a-zA-Z]+)*$/);
      expect(hook.where.length, hook.id).toBeGreaterThan(5);
      expect(typeof hook.unique).toBe("boolean");
    }
  });

  it("are each written in the Editor's source, as such or as a menu's hook and its item's ID", () => {
    const text = sources()
      .filter(file => !file.endsWith(join("agent", "hooks.js")))
      .map(file => readFileSync(file, "utf8"))
      .join("\n");
    const menus = ["project-menu", "actions-export"];
    for (const { id } of HOOKS) {
      const menu = menus.find(name => id.startsWith(`${name}-`));
      const item = menu && id.slice(menu.length + 1);
      const written = menu ? text.includes(`"${menu}"`) && (item === "list" || text.includes(`id: "${item}"`)) : false;
      expect(written || text.includes(`"${id}"`), id).toBe(true);
    }
  });

  it("are listed in the guide, each with where it is (AI interface spec §7.5)", () => {
    const readme = readFileSync(join(process.cwd(), "../../packages/core/README.md"), "utf8");
    const listed = [...readme.matchAll(/^\| `([a-zA-Z-]+)` +\| (.+?) +\| (yes|per item) +\|$/gm)].map(
      ([, id, where, once]) => ({ id, where: where.replaceAll("\\|", "|"), unique: once === "yes" })
    );
    expect(listed).toEqual(HOOKS);
  });
});
