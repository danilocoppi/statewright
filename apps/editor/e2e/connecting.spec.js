// Connecting boxes by dragging (spec §7.2): the box under the pointer says whether it can be the connection's end —
// a terminal state too, which nothing starts from but anything may end on.
import { expect, test } from "@playwright/test";

test("rings a terminal state as a valid end while a connection is dragged over it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.goto("/p/prj_payments/cnv_crossBorderSend");
  const from = page.locator('.react-flow__node[data-id="nod_payingOut"]');
  const to = page.locator('.react-flow__node[data-id="nod_completed"]');
  await expect(from).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  const handle = await from.locator(".sw-handle.sw-start").boundingBox();
  const end = await to.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
  await expect(to.locator(".sw-selection")).toHaveCount(1);
  await page.mouse.up();
});
