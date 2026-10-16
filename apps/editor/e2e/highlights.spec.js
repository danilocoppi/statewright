// Highlights, in a real browser (highlights spec §2): a box made Critical — a red, bold, tinted border and its tag —
// in the light and the dark theme; the same highlight on every box of the level from ⌘K, one Undo taking it back.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
const inspector = page => page.getByRole("dialog", { name: "Inspector" });
/** The stroke, width and fill a box's own outline is drawn with, as the browser paints them. */
const outline = locator =>
  locator.evaluate(node => {
    const rects = [...node.querySelectorAll('rect[rx="8"]')];
    const style = getComputedStyle(rects.at(-1));
    return { stroke: style.stroke, width: style.strokeWidth, fill: style.fill };
  });

test("a box made Critical in the inspector, in both themes, then every box from ⌘K, and one Undo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  const engine = box(page, "Lifecycle engine");
  await expect(engine).toBeVisible();
  await engine.click();
  const panel = inspector(page);
  await panel.getByRole("button", { name: "Add highlight" }).click();
  await page.keyboard.type("Critical");
  await page.getByRole("option", { name: /New highlight/ }).click();
  const editor = page.getByRole("dialog", { name: "New highlight" });
  await expect(editor.getByRole("textbox", { name: "Name" })).toHaveValue("Critical");
  await editor.getByRole("radio", { name: "Red" }).click();
  await editor.getByRole("radio", { name: "Tint" }).click();
  await editor.getByRole("checkbox", { name: "Show its name as a tag" }).check();
  await editor.getByRole("textbox", { name: "What it means" }).fill("The path that must not fail.");
  await page.screenshot({ path: "test-results/highlight-editor.png" });
  await editor.getByRole("button", { name: "Save" }).click();

  await expect(engine.getByText("CRITICAL")).toBeVisible();
  expect(await outline(engine)).toEqual({ stroke: "rgb(220, 38, 38)", width: "2px", fill: "rgb(254, 242, 242)" });
  await page.screenshot({ path: "test-results/highlight-light.png" });

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  expect(await outline(engine)).toEqual({ stroke: "rgb(248, 113, 113)", width: "2px", fill: "rgb(58, 26, 29)" });
  await page.screenshot({ path: "test-results/highlight-dark.png" });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  // Every box of the level, from ⌘K, in one change.
  await page.locator(".react-flow__pane").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("Apply highlight: Critical");
  await page.keyboard.press("Enter");
  const scheduler = box(page, "Scheduler");
  await expect(scheduler.getByText("CRITICAL")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(scheduler.getByText("CRITICAL")).toHaveCount(0);
  await expect(engine.getByText("CRITICAL")).toBeVisible();
});
