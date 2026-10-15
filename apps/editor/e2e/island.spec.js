// The project island: its name, stage and save status share 260 pixels without covering each other.
import { expect, test } from "@playwright/test";

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("keeps Saved clear of the project's name, stage and menu arrow, inside its island", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^State machine/ }).click();
  const create = page.getByRole("dialog", { name: "New project" });
  await create.getByRole("textbox", { name: "Name" }).fill("Acme Billing, as the system runs today");
  await create.getByRole("button", { name: "Create project" }).click();
  const first = page.locator(".react-flow__node-node", { hasText: "First state" });
  await expect(first).toBeVisible();
  const island = page.getByTestId("project-island");
  await first.click();
  await page.keyboard.press("Delete");
  const saved = island.getByText("Saved");
  await expect(saved).toBeVisible();
  const status = await saved.boundingBox();
  const menu = await island.getByRole("button", { name: /^Acme Billing/ }).boundingBox();
  const frame = await island.boundingBox();
  expect(overlaps(status, menu), JSON.stringify({ status, menu })).toBe(false);
  expect(status.x + status.width).toBeLessThanOrEqual(frame.x + frame.width);
});
