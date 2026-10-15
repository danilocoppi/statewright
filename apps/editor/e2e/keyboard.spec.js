// Plan E5 (spec §9: every action reachable by keyboard; §11: keyboard-only navigation tests): a person who reviews and
// a person who builds, in a real browser, with nothing but the keyboard.
import { expect, test } from "@playwright/test";

const focused = page => page.locator(":focus");

/** Press a key until the focus is on what is asked for (at most `limit` times). */
async function pressUntil(page, key, target, limit = 40) {
  for (let step = 0; step < limit; step += 1) {
    if (await target.evaluate(element => element === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`${key} never reached the element asked for`);
}

const box = (page, name) => page.getByRole("group", { name, exact: true });

test("reviews with the keyboard alone: an example, its boxes, a level, a box's details, and back up", async ({
  page
}) => {
  await page.goto("/");
  await pressUntil(page, "Tab", page.getByRole("button", { name: /^Payments/ }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Tab reaches the boxes in reading order; the arrows walk along the connections.
  await pressUntil(page, "Tab", box(page, "Clients"));
  await page.keyboard.press("ArrowRight");
  await expect(focused(page)).toHaveAttribute("aria-label", "Command API");
  await page.keyboard.press("ArrowRight");
  await expect(focused(page)).toHaveAttribute("aria-label", "Lifecycle engine");

  // Enter opens the box's level; Space selects a box there; F6 goes to the inspector.
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/cnv_lifecycle$/);
  await pressUntil(page, "Tab", box(page, "compliance_hold"), 60);
  await page.keyboard.press("Space");
  await expect(page.getByText("Selected: compliance_hold")).toBeAttached();
  const inspector = page.getByRole("dialog", { name: "Inspector" });
  await pressUntil(page, "F6", inspector.getByRole("textbox", { name: "Name" }), 10);
  await expect(focused(page)).toHaveValue("compliance_hold");

  // Back to the level with F6, Esc clears the selection, and Esc again goes up.
  await pressUntil(page, "F6", box(page, "compliance_hold"), 10);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/p\/prj_payments$/);
});

test("builds with the keyboard alone: a project, a state inserted by name, a transition from the inspector, undo", async ({
  page
}) => {
  await page.goto("/");
  await pressUntil(page, "Tab", page.getByRole("button", { name: /^State machine/ }));
  await page.keyboard.press("Enter");
  await page.keyboard.type("Refunds");
  await page.keyboard.press("Enter");
  await expect(box(page, "First state")).toBeVisible();

  // `/` inserts by name, in the middle of the view; the new box keeps the focus once named.
  await page.keyboard.press("/");
  await page.keyboard.type("State");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Paid");
  await page.keyboard.press("Enter");
  await expect(focused(page)).toHaveAttribute("aria-label", "Paid");

  // A transition from First state to Paid, with a new event, from the inspector.
  await pressUntil(page, "Shift+Tab", box(page, "First state"));
  await page.keyboard.press("Space");
  const inspector = page.getByRole("dialog", { name: "Inspector" });
  await pressUntil(page, "F6", inspector.getByRole("textbox", { name: "Name" }), 10);
  await pressUntil(page, "Tab", inspector.getByRole("button", { name: "Add a transition" }));
  await page.keyboard.press("Enter");
  await page.keyboard.type("Paid");
  await page.keyboard.press("Enter");
  const when = page.getByRole("dialog", { name: "When does First state go to Paid?" });
  await expect(when).toBeVisible();
  await page.keyboard.type("refund.paid");
  await page.keyboard.press("Enter");
  const edge = page.locator(".react-flow__edge", { hasText: "refund.paid" });
  await expect(edge).toBeVisible();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(edge).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(edge).toBeVisible();
});

test("moves to the next area from search and commands, as F6 does", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await pressUntil(page, "Tab", box(page, "Clients"));
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("next area");
  await page.keyboard.press("Enter");
  // From the level, the next area is its zoom.
  await expect(focused(page)).toHaveAccessibleName("Zoom out");
});
