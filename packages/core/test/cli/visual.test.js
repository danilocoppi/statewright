import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "../../src/serialize/parse.js";
import { verify } from "../../src/signature.js";
import { paymentsDoc } from "../helpers.js";
import { EXAMPLE, cli, workspace } from "./helpers.js";

/** A copy of the payments example in a fresh workspace. */
async function copy() {
  const dir = await workspace();
  await writeFile(join(dir, "payments.json"), await readFile(EXAMPLE, "utf8"));
  return dir;
}

describe("layout", () => {
  it("places every node, re-signs and writes; a second run has nothing to do", async () => {
    const dir = await copy();
    const run = await cli(["layout", "payments.json", "--json"], { cwd: dir });
    expect(run.json()).toMatchObject({ ok: true, written: "payments.json", canvases: 5, placed: 35, routed: 39 });
    const doc = parse(await readFile(join(dir, "payments.json"), "utf8")).doc;
    expect(Object.keys(doc.layout.canvases).sort()).toEqual(Object.keys(doc.canvases).sort());
    expect(await verify(doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
    const again = await cli(["layout", "payments.json"], { cwd: dir });
    expect(again.stdout).toBe(
      "payments.json: every node already has a position; nothing to do (--all recomputes them)\n"
    );
  });

  it("lays out one canvas, recomputes with --all and writes nothing with --dry-run", async () => {
    const dir = await copy();
    expect(
      (await cli(["layout", "payments.json", "--canvas", "cnv_expiryClock", "--json"], { cwd: dir })).json()
    ).toMatchObject({
      canvases: 1,
      placed: 5
    });
    const before = await readFile(join(dir, "payments.json"), "utf8");
    const dry = await cli(["layout", "payments.json", "--all", "--dry-run", "--json"], { cwd: dir });
    expect(dry.json()).toMatchObject({ written: null, placed: 35 });
    expect(await readFile(join(dir, "payments.json"), "utf8")).toBe(before);
    expect((await cli(["layout", "payments.json", "--canvas", "cnv_none"], { cwd: dir })).code).toBe(2);
  });

  it("refuses content changed outside Statewright unless --accept-changes", async () => {
    const dir = await workspace();
    const doc = paymentsDoc();
    doc.project.name = "Edited by hand";
    await writeFile(join(dir, "edited.json"), JSON.stringify(doc));
    expect((await cli(["layout", "edited.json"], { cwd: dir })).code).toBe(2);
    expect((await cli(["layout", "edited.json", "--accept-changes"], { cwd: dir })).code).toBe(0);
  });
});

describe("render", () => {
  it("prints the root canvas as SVG, or writes a chosen canvas to a file", async () => {
    const dir = await copy();
    const run = await cli(["render", "payments.json"], { cwd: dir });
    expect(run.stdout).toMatch(
      /^<svg [^>]*aria-label="Runtime: commands, provider facts and timers all enter one engine">/
    );
    const written = await cli(["render", "payments.json", "--canvas", "cnv_expiryClock", "-o", "clock.svg", "--json"], {
      cwd: dir
    });
    expect(written.json()).toEqual({ ok: true, canvas: "cnv_expiryClock", written: "clock.svg" });
    expect(await readFile(join(dir, "clock.svg"), "utf8")).toContain("Expiry clock");
    expect((await cli(["render", "payments.json", "--canvas", "cnv_none"], { cwd: dir })).code).toBe(2);
  });
});

describe("docs", () => {
  it("writes Markdown for people by default and the AI pack with --format ai", async () => {
    const dir = await copy();
    expect((await cli(["docs", "payments.json"], { cwd: dir })).stdout.split("\n")[0]).toBe("# Payments");
    await cli(["docs", "payments.json", "--format", "ai", "-o", "pack.md"], { cwd: dir });
    expect((await readFile(join(dir, "pack.md"), "utf8")).split("\n")[0]).toBe("# Payments — Statewright AI pack");
    const wrong = await cli(["docs", "payments.json", "--format", "pdf"], { cwd: dir });
    expect(wrong.code).toBe(2);
    expect(wrong.stderr).toBe('statewright: Unknown format "pdf"; use md, ai or html\n');
  });

  it("writes the documentation as a page with --format html, without fonts", async () => {
    const dir = await copy();
    const written = await cli(["docs", "payments.json", "--format", "html", "-o", "docs.html"], { cwd: dir });
    expect(written.code).toBe(0);
    expect(written.stdout).toBe("Wrote html documentation to docs.html\n");
    const page = await readFile(join(dir, "docs.html"), "utf8");
    expect(page.startsWith("<!doctype html>")).toBe(true);
    expect(page).toContain("<title>Payments · Documentation</title>");
    expect(page).not.toContain("@font-face");
    expect((await cli(["docs", "payments.json", "--format", "html"], { cwd: dir })).stdout).toBe(page);
  });
});
