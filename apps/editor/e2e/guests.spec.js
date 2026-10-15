// Mixed levels, plan M1 (spec §6): the dock's tabs drop elements of the other kinds as guests — a participant and an
// action's steps on a machine, a lifecycle on a system — each one change that Undo takes back whole.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
const frame = (page, name) => page.locator(".react-flow__node-frame", { hasText: name });

/** A new project of a kind, open on its first level. */
async function create(page, kind, name) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(`^${kind}`) }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill(name);
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByTestId("canvas")).toBeVisible();
}

/** Drop a tool of a tab on the canvas, at an offset from the canvas's middle. */
async function drop(page, tab, tool, dx = 0) {
  await page.getByRole("tab", { name: tab }).click();
  await page.getByRole("button", { name: tool, exact: true }).click();
  const area = await page.getByTestId("canvas").boundingBox();
  await page.mouse.click(area.x + area.width / 2 + dx, area.y + area.height / 2 + 160);
}

test("drops a participant and an action's steps on a machine, and undoes them whole", async ({ page }) => {
  await create(page, "State machine", "Orders");
  const dock = page.getByTestId("tools-dock");
  await expect(dock.getByRole("tab", { name: "State machine elements" })).toHaveAttribute("aria-selected", "true");

  await drop(page, "System elements", "Actor", -200);
  const who = page.getByRole("dialog", { name: "Who is it?" });
  await who.getByRole("combobox").fill("Customer");
  await page.keyboard.press("Enter");
  await expect(box(page, "Customer")).toBeVisible();

  await drop(page, "Flow elements", "Steps of an action", 200);
  const what = page.getByRole("dialog", { name: "What does this step do?" });
  await what.getByRole("combobox").fill("Charge card");
  await page.keyboard.press("Enter");
  await expect(frame(page, "Charge card")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(frame(page, "Charge card")).toHaveCount(0);
  await expect(box(page, "Customer")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(box(page, "Customer")).toHaveCount(0);
});

test("drops a lifecycle on a system: a box with a new state machine inside, open as a frame", async ({ page }) => {
  await create(page, "System", "Shop");
  await page.keyboard.press("2");
  await expect(page.getByRole("tab", { name: "State machine elements" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Lifecycle", exact: true }).click();
  const area = await page.getByTestId("canvas").boundingBox();
  await page.mouse.click(area.x + area.width / 2, area.y + area.height / 2 + 160);
  await page.keyboard.type("Order");
  await page.keyboard.press("Enter");
  await expect(frame(page, "Order")).toBeVisible();
});
