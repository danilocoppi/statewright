// A large level (performance spec §3 P2): only what is on screen is mounted, and every box is still reached from the
// keyboard.
import { expect, test } from "@playwright/test";

test("Tab reaches boxes off screen on a level of hundreds, one after the other", async ({ page }) => {
  // Without motion, a zoom is done at once.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /^Airport operations/ }).click();
  await page.locator('.react-flow__node[data-id="nod_aodb"]').waitFor();
  await page.goto("/p/prj_airportOperations/cnv_beltNetwork");
  await expect.poll(() => page.locator(".react-flow__node-node").count()).toBeGreaterThan(50);
  await page.getByRole("button", { name: "Zoom to 100 %" }).click();
  // Fewer boxes are mounted than the level has.
  await expect.poll(() => page.locator(".react-flow__node-node").count()).toBeLessThan(200);
  // The first of the boxes on screen in reading order (left to right, then top to bottom).
  const start = await page.evaluate(
    () =>
      [...document.querySelectorAll(".react-flow__node-node")]
        .map(node => ({ id: node.dataset.id, box: node.getBoundingClientRect() }))
        .sort((a, b) => a.box.left - b.box.left || a.box.top - b.box.top)[0].id
  );
  await page.locator(`.react-flow__node[data-id="${start}"]`).focus();
  const seen = [start];
  for (let step = 0; step < 40; step += 1) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.closest(".react-flow__node")?.dataset.id ?? null))
      .not.toBe(seen.at(-1));
    seen.push(await page.evaluate(() => document.activeElement?.closest(".react-flow__node")?.dataset.id ?? null));
  }
  expect(seen.every(Boolean)).toBe(true);
  expect(new Set(seen).size).toBe(seen.length);
});
