// The support badge: a heart and "Support" at the bottom right of every screen, whose popover gives the wallets that
// take donations, each copied exactly, and the source on GitHub. In the Editor it sits under the islands at the
// bottom right, clear of them and of the panels on the right, and leaves the stage alone.
import { expect, test } from "@playwright/test";

const SOLANA = "DCA31TRz39qmKPseSRMjANN7cGYoWGUbtkC582oMRyWy";
const EVM = "0x54636195948915f091466f027025973328813a3a";

/** Whether two boxes on the screen overlap. */
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const box = locator => locator.evaluate(element => element.getBoundingClientRect().toJSON());

/** The badge sits at the bottom right of the window, 16 px from its edges. */
async function atBottomRight(page) {
  const badge = page.getByRole("button", { name: "Support" });
  await expect(badge).toBeVisible();
  const { right, bottom } = await box(badge);
  const { width, height } = page.viewportSize();
  expect(Math.round(width - right)).toBe(16);
  expect(Math.round(height - bottom)).toBe(16);
  return badge;
}

test.use({ viewport: { width: 1280, height: 800 } });

test("offers support on the Projects screen: opens, copies each address exactly, closes", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  const badge = await atBottomRight(page);
  await badge.click();
  const popover = page.getByRole("dialog", { name: "Support Statewright" });
  await expect(popover).toBeVisible();
  await expect(popover).toBeFocused();
  await expect(popover.locator("code")).toHaveText([SOLANA, EVM]);
  // Above the badge, and on screen.
  const [shown, under] = [await box(popover), await box(badge)];
  expect(shown.bottom).toBeLessThan(under.top);
  expect(shown.top).toBeGreaterThan(0);

  await popover.getByRole("button", { name: "Copy the Solana address" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(SOLANA);
  await expect(popover.getByRole("button", { name: "Copied" })).toBeVisible();
  await popover.getByRole("button", { name: "Copy the ETH · BSC · Polygon (EVM) address" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(EVM);
  await expect(popover.getByRole("button", { name: /^Copy the / })).toHaveCount(2);

  const source = popover.getByRole("link", { name: "Source on GitHub (opens in a new tab)" });
  await expect(source).toHaveAttribute("href", "https://github.com/danilocoppi/statewright");
  await expect(source).toHaveAttribute("target", "_blank");

  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  await expect(badge).toBeFocused();
  await badge.click();
  await page.getByRole("heading", { name: "Projects" }).click();
  await expect(popover).toBeHidden();

  const github = page.getByRole("link", { name: "GitHub (opens in a new tab)" });
  await expect(github).toHaveAttribute("href", "https://github.com/danilocoppi/statewright");
  await expect(github).toHaveAttribute("rel", "noreferrer");
});

test("offers support on the guide's page", async ({ page }) => {
  await page.goto("/readme");
  const badge = await atBottomRight(page);
  await badge.click();
  await expect(page.getByRole("dialog", { name: "Support Statewright" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Support Statewright" })).toBeHidden();
});

test("hides the badge when the page is printed", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Support" })).toBeHidden();
});

test.describe("in the Editor", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Payments/ }).click();
    await page.waitForURL(/\/p\/prj_payments$/);
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
  });

  test("keeps the badge under the minimap and the legend, and the inspector above all three", async ({ page }) => {
    const badge = await atBottomRight(page);
    // Alone at the bottom right: the inspector stops above it.
    await page.locator('.react-flow__node[data-id="nod_lifecycleEngine"]').click();
    const inspector = page.getByRole("dialog", { name: "Inspector" });
    await inspector.getByRole("button", { name: "Show details" }).click();
    expect(overlap(await box(inspector), await box(badge))).toBe(false);

    for (const layer of ["Legend", "Minimap"]) {
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.getByRole("menuitemcheckbox", { name: layer }).click();
    }
    const legend = await box(page.getByRole("region", { name: "Legend" }));
    const minimap = await box(page.locator(".react-flow__minimap"));
    const under = await box(badge);
    expect(overlap(under, minimap)).toBe(false);
    expect(overlap(under, legend)).toBe(false);
    // Stacked: the badge, then the minimap, then the legend, their right edges in line.
    expect(minimap.bottom).toBeLessThan(under.top);
    expect(legend.bottom).toBeLessThan(minimap.top);
    expect(Math.round(minimap.right)).toBe(Math.round(under.right));
    for (const island of [legend, minimap, under]) expect(overlap(await box(inspector), island)).toBe(false);

    // Open, it stays usable over the canvas, and Esc closes it without leaving the level.
    await badge.click();
    const popover = page.getByRole("dialog", { name: "Support Statewright" });
    await expect(popover.getByRole("button", { name: "Copy the Solana address" })).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();
    await expect(page).toHaveURL(/\/p\/prj_payments$/);
    await expect(inspector).toBeVisible();
  });

  test("leaves the stage alone", async ({ page }) => {
    await page.goto("/p/prj_payments/cnv_lifecycle");
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    await page.getByRole("button", { name: "Simulate" }).click();
    await page.getByRole("button", { name: "Present Verification pauses the clock" }).click();
    await expect(page.getByRole("region", { name: /^Presenting / })).toBeVisible();
    await expect(page.getByRole("button", { name: "Support" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Support" })).toBeVisible();
  });
});
