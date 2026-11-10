// A system that runs the design validates an event's payload against its catalog type: `typeSchema` comes from
// statewright/runtime too, the same function as the package's root, and the runtime stays light — none of the command
// line, the MCP server, the drawing or the layout comes with it.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { typeSchema as fromRoot } from "statewright";
import { typeSchema } from "statewright/runtime";
import { paymentsDoc } from "../helpers.js";

const src = fileURLToPath(new URL("../../src/", import.meta.url));

/** Every module a file loads, followed through its relative imports and re-exports, and the packages they load. */
function graphOf(file, seen = { files: new Set(), packages: new Set() }) {
  if (seen.files.has(file)) return seen;
  seen.files.add(file);
  const code = readFileSync(file, "utf8");
  for (const [, spec] of code.matchAll(/(?:import|export)\s[^"']*?from\s+["']([^"']+)["']/g)) {
    if (spec.startsWith(".")) graphOf(resolve(dirname(file), spec), seen);
    else seen.packages.add(spec);
  }
  return seen;
}

describe("typeSchema from statewright/runtime", () => {
  it("is the root's function, giving the same JSON Schema", () => {
    expect(typeSchema).toBe(fromRoot);
    const doc = paymentsDoc();
    const ids = Object.keys(doc.catalog.types);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(typeSchema(doc, id)).toEqual(fromRoot(doc, id));
    expect(typeSchema(doc, "typ_none")).toBe(null);
  });

  it("comes with a runtime that loads none of the command line, the MCP server, the drawing or the layout engine", () => {
    const { files, packages } = graphOf(resolve(src, "runtime/index.js"));
    const loaded = [...files].map(file => file.slice(src.length));
    expect(loaded).toContain("docs/type-schema.js");
    for (const part of ["cli/", "mcp/", "render/"]) {
      expect(
        loaded.filter(file => file.startsWith(part)),
        part
      ).toEqual([]);
    }
    expect(loaded).not.toContain("layout/index.js");
    // Outside packages: only the format's own (zod) and immer, as the root entry has them.
    expect([...packages].filter(name => !["immer", "zod"].includes(name) && !name.startsWith("node:"))).toEqual([]);
  });
});
