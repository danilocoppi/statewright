// Plan E5 (spec §13: "§2's criteria pass"; §11): in a real browser, a person walks every level of the payments example,
// saves a document that Core's command line verifies and validates exactly as the editor showed it, and finds the
// language and the theme they chose after a reload.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { figureHeading } from "statewright";

const EXAMPLES = resolve(import.meta.dirname, "../../../examples");
const CLI = resolve(import.meta.dirname, "../../../packages/core/src/cli/bin.js");
const payments = JSON.parse(readFileSync(resolve(EXAMPLES, "payments.sttw"), "utf8"));

/** `statewright <args>`, as a person or an engine runs it on the saved file. */
const statewright = (...args) => execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

test("walks every level of the payments example from the levels tree, each with its heading and its boxes", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  for (const [id, canvas] of Object.entries(payments.canvases)) {
    await page.getByRole("button", { name: /^Payments/ }).click();
    await page.getByRole("menuitem", { name: "Levels…" }).click();
    const levels = page.getByRole("dialog", { name: "Levels" });
    await levels
      .getByRole("button", { name: new RegExp(`^${canvas.name}`) })
      .first()
      .click();
    await expect(page).toHaveURL(id === payments.root ? /\/p\/prj_payments$/ : new RegExp(`/${id}$`));
    await expect(page.locator(".react-flow__node-heading")).toContainText(figureHeading(canvas).title);
    await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
    await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  }
});

test("saves what Core's command line verifies and validates exactly as the editor showed it", async ({ page }) => {
  await page.addInitScript(() => delete window.showSaveFilePicker);
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  const scheduler = page.locator('.react-flow__node[data-id="nod_scheduler"]');
  await scheduler.click();
  await page.keyboard.press("F2");
  await page.keyboard.type("Timer service");
  await page.keyboard.press("Enter");
  await expect(scheduler).toContainText("Timer service");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /problems?$/ }).click();
  const count = async name =>
    Number((await page.getByRole("radio", { name: new RegExp(`^${name}`) }).textContent()).replace(/\D+/g, "") || "0");
  const shown = `${await count("Errors")} errors · ${await count("Warnings")} warnings · ${await count("Incomplete")} incomplete`;
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /^Payments/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Save to file" }).click()
  ]);
  const file = join(mkdtempSync(join(tmpdir(), "statewright-release-")), download.suggestedFilename());
  writeFileSync(file, readFileSync(await download.path()));

  expect(statewright("verify", file, "--strict")).toMatch(/content\s+ok\nannotations\s+ok\nlayout\s+ok/);
  expect(statewright("validate", file).trim().split("\n").at(-1)).toBe(shown);
  expect(JSON.parse(readFileSync(file, "utf8")).canvases.cnv_runtime.nodes.nod_scheduler.name).toBe("Timer service");
});

test("switches the language and the theme, and finds both as chosen after a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitemradio", { name: "Português (Brasil)" }).click();
  await expect(page.getByRole("heading", { name: "Projetos", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Tema", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Projetos", level: 1 })).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // In the editor, from the project menu, and kept there too.
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.getByRole("menuitemradio", { name: "Claro" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByRole("group", { name: "Projeto" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
