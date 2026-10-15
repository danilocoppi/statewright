// Plan E2's "done when" (spec §13), in a real browser: levels render as Core draws them (in both themes), unplaced
// levels are laid out in the layout worker and stored, levels open and close with the mouse, the keyboard and the
// browser's back button, and Problems take the person to their level.
import { expect, test } from "@playwright/test";

/** Open one of the examples from the Projects screen. */
async function openExample(page, name) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
}

const box = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
const currentLevel = page => page.getByRole("navigation", { name: "Levels" }).locator('[aria-current="page"]');

test("opens levels with a double-click or Enter, and goes back up with Esc and the browser's back button", async ({
  page
}) => {
  await openExample(page, "Payments");
  const engine = box(page, "nod_lifecycleEngine");
  await expect(engine).toBeVisible();
  await engine.dblclick();
  await expect(page).toHaveURL(/\/p\/prj_payments\/cnv_lifecycle$/);
  await expect(currentLevel(page)).toHaveText("Lifecycle engine");
  await expect(box(page, "nod_sendCrossBorder")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/p\/prj_payments$/);
  await expect(currentLevel(page)).toHaveText("Runtime");

  await engine.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/cnv_lifecycle$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/p\/prj_payments$/);
  await expect(engine).toBeVisible();
});

test("lays out a level shown without positions in the layout worker, and keeps the positions", async ({ page }) => {
  await openExample(page, "Payments");
  const api = box(page, "nod_commandApi");
  await expect(api).toBeVisible();
  const placed = await api.getAttribute("style");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(api).toBeVisible();
  expect(await api.getAttribute("style")).toBe(placed);
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
});

test("takes a Problem picked in the panel to its level, with the element selected", async ({ page }) => {
  await openExample(page, "Payments");
  await page.getByRole("button", { name: /problems$/ }).click();
  const panel = page.getByRole("dialog", { name: "Problems" });
  await panel.getByRole("button", { name: /^State "compliance_hold" has no way out/ }).click();
  await expect(page).toHaveURL(/\/cnv_lifecycle$/);
  await expect(box(page, "nod_complianceHold").locator(".sw-selection")).toBeVisible();
  await expect(box(page, "nod_complianceHold").locator('[data-severity="incomplete"]')).toBeVisible();
});

test("opens a group of catalog Problems to list each item, and opens the catalog on the one picked", async ({
  page
}) => {
  await openExample(page, "Payments");
  await page.getByRole("button", { name: /problems$/ }).click();
  const panel = page.getByRole("dialog", { name: "Problems" });
  const group = panel.getByRole("button", { name: /^\d+ events do not specify payload/ });
  await expect(group).toHaveAttribute("aria-expanded", "false");
  await group.click();
  await expect(group).toHaveAttribute("aria-expanded", "true");
  const items = panel.getByRole("list", { name: /events do not specify payload/ }).getByRole("button");
  const first = items.first();
  const name = (await first.locator("span").first().textContent()).trim();
  await first.click();
  const sheet = page.getByTestId("catalog-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("button", { name: new RegExp(`^${name}`) })).toHaveAttribute("aria-current", "true");
  // Closing the catalog leaves the panel where it was, the group still open.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(group).toHaveAttribute("aria-expanded", "true");
});

test("finds an element on any level from the Levels map, and shows it selected", async ({ page }) => {
  await openExample(page, "Payments");
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.getByRole("menuitem", { name: "Levels…" }).click();
  const levels = page.getByRole("dialog", { name: "Levels" });
  await expect(levels.getByRole("searchbox", { name: "Find a level or an element" })).toBeFocused();
  await page.keyboard.type("paused");
  await levels
    .getByRole("button", { name: /^paused/ })
    .first()
    .click();
  await expect(levels).toBeHidden();
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
  await expect(box(page, "nod_paused").locator(".sw-selection")).toBeVisible();
});

test("opens the catalog from its button beside the zoom", async ({ page }) => {
  await openExample(page, "Payments");
  await page.getByRole("toolbar", { name: "Zoom" }).getByRole("button", { name: "Catalog" }).click();
  await expect(page.getByTestId("catalog-sheet")).toBeVisible();
});

test("draws the diagram with its light colours, and with its dark ones in the dark theme", async ({ page }) => {
  await openExample(page, "Get paid");
  await expect(page).toHaveURL(/\/p\/prj_getPaid$/);
  await page.goto("/p/prj_getPaid/cnv_open");
  const waiting = box(page, "nod_created").locator("rect").first();
  await expect(waiting).toBeVisible();
  expect(await waiting.evaluate(rect => getComputedStyle(rect).fill)).toBe("rgb(246, 247, 250)");
  await page.getByRole("button", { name: /^Get paid/ }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await expect.poll(() => waiting.evaluate(rect => getComputedStyle(rect).fill)).toBe("rgb(59, 65, 78)");
});
