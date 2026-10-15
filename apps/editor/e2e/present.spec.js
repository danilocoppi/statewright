// Plan S4 (simulator spec §2: "A presented scenario shows each step's transitions, captions and level changes; its
// exported page opens offline in any current browser with no network request and steps through the same story";
// §11: "a scenario page of the payments example under 500 KB"): the stage, played with the keys, and the page.
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test } from "@playwright/test";

/** Payments on its lifecycle, opened from its example, its boxes drawn and stored. */
async function openLifecycle(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto("/p/prj_payments/cnv_lifecycle");
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
}

/** A scenario of payments exported as a page from the Export menu, kept as a file. */
async function exportPage(page, name) {
  await openLifecycle(page);
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: /^Scenario page…/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("dialog", { name: "Scenario page" })
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .click()
  ]);
  const file = join(mkdtempSync(join(tmpdir(), "statewright-page-")), download.suggestedFilename());
  writeFileSync(file, readFileSync(await download.path()));
  return file;
}

test("presents a scenario with the keys: each step's transitions, captions and level changes (§2)", async ({
  page
}) => {
  await openLifecycle(page);
  await page.getByRole("button", { name: "Simulate" }).click();
  await page.getByRole("button", { name: "Present Verification pauses the clock" }).click();
  const stage = page.getByRole("region", { name: "Presenting Verification pauses the clock" });
  await expect(stage.getByText("Starts in clear, running and awaiting_funds.", { exact: true })).toBeVisible();

  // Each step on the level where its transition is drawn: the edge it took, where the run is now.
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
  await expect(stage.getByText("1 / 3", { exact: true })).toBeVisible();
  await expect(
    stage.getByText("The payer starts identity verification. The clock stops.", { exact: true })
  ).toBeVisible();
  await expect(page.locator('.react-flow__edge[data-id="edg_runningPaused"] .sw-fired')).toHaveCount(1);
  await expect(page.locator('.react-flow__node[data-id="nod_paused"] .sw-run')).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/\/cnv_crossBorderSend$/);
  await expect(stage.getByText("Wed 7 Jan 2026, 09:00")).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
  await expect(stage.getByText("3 / 3", { exact: true })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page).toHaveURL(/\/cnv_lifecycle$/);
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await expect(stage.getByText("2 / 3", { exact: true })).toBeVisible();

  // Esc: back to the panel at the same step.
  await page.keyboard.press("Escape");
  await expect(stage).toBeHidden();
  const panel = page.getByRole("dialog", { name: "Simulation" });
  await expect(panel.getByRole("region", { name: "An earlier step" })).toContainText("after step 2 of 3");
});

test("exports a scenario as a page that opens offline, asks for nothing and steps through the same story (§2, §11)", async ({
  page,
  browser
}) => {
  const file = await exportPage(page, "Verification pauses the clock");
  expect(file.endsWith("verification-pauses-the-clock.html")).toBe(true);
  expect(statSync(file).size).toBeLessThan(500 * 1024);

  // Offline, in a browser context of its own; any request it made would be counted.
  const context = await browser.newContext({ offline: true });
  const requests = [];
  context.on("request", request => !/^(file|data):/.test(request.url()) && requests.push(request.url()));
  const reader = await context.newPage();
  await reader.goto(pathToFileURL(file).href);
  await expect(reader.getByRole("heading", { name: "Verification pauses the clock" })).toBeVisible();
  const steps = reader.getByRole("list", { name: "Steps" }).getByRole("button");
  await expect(steps).toHaveCount(4);
  await expect(steps.first()).toHaveAttribute("aria-current", "step");

  await reader.keyboard.press("ArrowRight");
  await expect(steps.nth(1)).toHaveAttribute("aria-current", "step");
  await expect(reader.locator('.level[data-level="cnv_expiryClock"]')).toBeVisible();
  await expect(reader.locator(".trail")).toHaveText("Lifecycle engineExpiry clock");
  await expect(reader.locator(".level:not([hidden]) .mark-fired")).toHaveCount(1);
  await steps.nth(2).click();
  await expect(reader.locator('.level[data-level="cnv_crossBorderSend"]')).toBeVisible();

  // Present: the stage layout, its card and keys; Esc leaves it.
  await reader.getByRole("button", { name: "Present" }).click();
  await expect(reader.locator("body")).toHaveClass(/presenting/);
  await expect(reader.locator(".counter")).toHaveText("2 / 3");
  await expect(reader.locator(".caption")).toHaveText("Two days pass; nothing is due while the clock is paused.");
  await reader.keyboard.press("PageDown");
  await expect(reader.locator(".counter")).toHaveText("3 / 3");
  await reader.keyboard.press("Home");
  await expect(reader.locator(".counter")).toHaveText("Start");
  await reader.getByRole("button", { name: /Exit/ }).click();
  await expect(reader.locator("body")).not.toHaveClass(/presenting/);

  // The fonts it shows are the ones it carries.
  expect(
    await reader.evaluate(() => document.fonts.load("16px Inter").then(() => document.fonts.check("16px Inter")))
  ).toBe(true);
  expect(requests).toEqual([]);
  await context.close();
});
