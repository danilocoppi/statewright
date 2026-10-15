// The inspector's width (spec §6.1): its left edge widens it, by pointer or from the keyboard, from 340 px up to 720 px
// or 60 % of the window; a double click puts it back. The width is kept in this browser for every project, and what
// makes room for the inspector follows it: the Problems panel beside it, the canvas sliding a box clear of it.
import { expect, test } from "@playwright/test";

const inspector = page => page.getByRole("dialog", { name: "Inspector" });
const edge = page => inspector(page).getByRole("separator", { name: "Resize the inspector" });
const box = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);

/** The inspector's width on the screen. */
const width = async page => Math.round((await inspector(page).boundingBox()).width);

/** Payments, opened from its example, with the inspector showing its Scheduler. */
async function inspectScheduler(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await box(page, "nod_scheduler").click();
  await expect(inspector(page)).toBeVisible();
}

/** Drag the inspector's edge `by` px to the right (left when negative), in steps as a hand would. */
async function dragEdge(page, by) {
  const handle = await edge(page).boundingBox();
  const x = handle.x + handle.width / 2;
  const y = handle.y + handle.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + by, y, { steps: 8 });
  await page.mouse.up();
}

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

test("widens from its left edge, keeps the width for every project, and goes back with a double click", async ({
  page
}) => {
  await inspectScheduler(page);
  expect(await width(page)).toBe(340);

  // The edge shows itself under the pointer: a resize pointer and a thin accent line.
  await edge(page).hover();
  await expect(edge(page)).toHaveCSS("cursor", "col-resize");
  await expect(edge(page).locator("span")).toHaveCSS("opacity", "1");
  await expect(edge(page).locator("span")).toHaveCSS("background-color", "rgb(10, 102, 194)");

  await dragEdge(page, -160);
  expect(await width(page)).toBe(500);
  await expect(edge(page)).toHaveAttribute("aria-valuenow", "500");
  // Narrowed back over the inspector's words, nothing is selected on the way.
  await dragEdge(page, 60);
  expect(await width(page)).toBe(440);
  expect(await page.evaluate(() => getSelection().toString())).toBe("");

  // The Problems panel stays left of it, 12 px apart.
  await page.locator('[aria-controls="problems-panel"]').click();
  const problems = await page.getByRole("dialog", { name: /Problems/ }).boundingBox();
  const island = await inspector(page).boundingBox();
  expect(Math.round(island.x - (problems.x + problems.width))).toBe(12);

  // Kept in this browser, for another project too.
  await page.reload();
  await box(page, "nod_scheduler").click();
  expect(await width(page)).toBe(440);
  await page.goto("/");
  await page.getByRole("button", { name: /^Get paid/ }).click();
  await page.waitForURL(/\/p\/prj_getPaid$/);
  await page.locator(".react-flow__node-node").first().click();
  expect(await width(page)).toBe(440);

  await edge(page).dblclick();
  expect(await width(page)).toBe(340);
});

test("stays between 340 px and 720 px or 60 % of the window, clamped again as the window narrows", async ({ page }) => {
  await inspectScheduler(page);
  await dragEdge(page, 200);
  expect(await width(page)).toBe(340);
  await dragEdge(page, -600);
  expect(await width(page)).toBe(720);
  await expect(edge(page)).toHaveAttribute("aria-valuemax", "720");

  await page.setViewportSize({ width: 1000, height: 800 });
  await expect.poll(() => width(page)).toBe(600);
  await expect(edge(page)).toHaveAttribute("aria-valuemax", "600");
  // The window wide again, the width kept is back.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => width(page)).toBe(720);
});

test("is resized from the keyboard: Tab to its edge, ← and → by 16 px, Home and End to its limits", async ({
  page
}) => {
  await inspectScheduler(page);
  await inspector(page).getByRole("button", { name: "Show details" }).focus();
  await page.keyboard.press("Tab");
  await expect(edge(page)).toBeFocused();
  await expect(edge(page)).toHaveAttribute("aria-orientation", "vertical");
  await expect(edge(page)).toHaveAttribute("aria-valuemin", "340");
  // The focus shows the edge as the pointer does.
  await expect(edge(page).locator("span")).toHaveCSS("opacity", "1");

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  expect(await width(page)).toBe(372);
  await page.keyboard.press("ArrowRight");
  expect(await width(page)).toBe(356);
  await page.keyboard.press("End");
  expect(await width(page)).toBe(720);
  await page.keyboard.press("Home");
  expect(await width(page)).toBe(340);
  await page.keyboard.press("ArrowRight");
  expect(await width(page)).toBe(340);
  // The arrows resized the inspector only: the box selected did not move.
  await expect(edge(page)).toBeFocused();
});

test("slides a box at the right edge clear of a widened inspector", async ({ page }) => {
  await inspectScheduler(page);
  await edge(page).focus();
  await page.keyboard.press("End");
  // Closed, it leaves the box at the right edge free to pick; picked, it opens as wide as it was left.
  await page.keyboard.press("Escape");
  await expect(inspector(page)).toHaveCount(0);
  await box(page, "nod_providers").click();
  expect(await width(page)).toBe(720);
  await expect(inspector(page).getByText(/in Runtime$/)).toBeVisible();
  await expect
    .poll(async () => {
      const [shown, island] = [await box(page, "nod_providers").boundingBox(), await inspector(page).boundingBox()];
      return shown.x >= 0 && shown.x + shown.width <= island.x;
    })
    .toBe(true);
});
