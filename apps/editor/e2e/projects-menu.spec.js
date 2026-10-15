// The Projects screen: a project's menu opens whole over its card and the cards around it.
import { expect, test } from "@playwright/test";

test("opens a project's menu whole, every item reachable over its card and the next row", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^State machine/ }).click();
  const create = page.getByRole("dialog", { name: "New project" });
  await create.getByRole("textbox", { name: "Name" }).fill("Acme Billing, as built");
  await create.getByRole("button", { name: "Create project" }).click();
  await expect(page.locator(".react-flow__node-node", { hasText: "First state" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "More actions for Acme Billing, as built" }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  // Each item is what the pointer meets at its middle: nothing clips it or covers it.
  for (const name of ["Rename…", "Save to file", "Duplicate", "Delete"]) {
    const item = page.getByRole("menuitem", { name });
    await expect
      .poll(() =>
        item.evaluate(element => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return element.contains(document.elementFromPoint(x + width / 2, y + height / 2));
        })
      )
      .toBe(true);
  }
});
