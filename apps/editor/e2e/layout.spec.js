// Plan E5's final review: the editor and the guide in small windows — a menu taller than the window scrolls to its last
// items, the islands across the top keep apart, a level is framed clear of the tool dock, and the guide's wide tables
// scroll sideways within the page.
import { expect, test } from "@playwright/test";

const LEVELS = ["cnv_runtime", "cnv_lifecycle", "cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock"];

/** Payments, opened from its example on the Projects screen. */
async function openPayments(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
}

/** Wait until the level is framed: arranged, its fonts in, its view no longer moving. */
async function settled(page) {
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const viewport = page.locator(".react-flow__viewport");
  let last = null;
  await expect
    .poll(
      async () => {
        const now = await viewport.getAttribute("style");
        const still = now === last;
        last = now;
        return still;
      },
      { intervals: [150] }
    )
    .toBe(true);
}

/** Whether two boxes on the screen overlap. */
const overlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test.describe("in a window 1024 px wide", () => {
  test.use({ viewport: { width: 1024, height: 768 }, reducedMotion: "reduce" });

  test("keeps the islands across the top apart on a level three deep, the level shown named in full", async ({
    page
  }) => {
    await openPayments(page);
    await page.goto("/p/prj_payments/cnv_crossBorderSend");
    await settled(page);
    const [project, levels, actions] = await page.evaluate(() =>
      ["project", "levels", "actions"].map(area =>
        document.querySelector(`[data-area="${area}"]`).getBoundingClientRect().toJSON()
      )
    );
    expect(overlap(project, levels)).toBe(false);
    expect(overlap(levels, actions)).toBe(false);
    const current = page.locator('[data-area="levels"] [aria-current="page"]');
    await expect(current).toHaveText("Cross-border send");
    expect(await current.evaluate(link => link.scrollWidth <= link.clientWidth)).toBe(true);
  });

  test("frames every level of an example clear of the tool dock", async ({ page }) => {
    await openPayments(page);
    for (const level of LEVELS) {
      await page.goto(`/p/prj_payments/${level}`);
      await settled(page);
      const { left, dock } = await page.evaluate(() => ({
        left: Math.min(
          ...[...document.querySelectorAll(".react-flow__node")].map(node => node.getBoundingClientRect().left)
        ),
        dock: document.querySelector('[data-area="tools"]').getBoundingClientRect().right
      }));
      expect(left, level).toBeGreaterThanOrEqual(dock + 12);
    }
  });
});

test.describe("in a window 720 px high", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("scrolls the project menu to its last items", async ({ page, context }) => {
    await openPayments(page);
    await page.getByRole("button", { name: /^Payments/ }).click();
    const box = await page.getByRole("menu").boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(720);
    const [guide] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("menuitem", { name: "Open the guide" }).click()
    ]);
    await expect(guide).toHaveURL(/\/readme$/);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("lets the guide's wide tables scroll sideways within the page, and the keyboard scroll them", async ({
    page
  }) => {
    await page.goto("/readme");
    await expect(page.getByRole("heading", { name: "Reading a diagram" })).toBeVisible();
    const tables = await page.locator("article table").evaluateAll(all =>
      all.map(table => ({
        scrolls: getComputedStyle(table.parentElement).overflowX === "auto",
        right: table.parentElement.getBoundingClientRect().right,
        wider: table.scrollWidth > table.parentElement.clientWidth,
        focusable: table.parentElement.tabIndex === 0
      }))
    );
    expect(tables.length).toBeGreaterThan(3);
    for (const table of tables) {
      expect(table.scrolls).toBe(true);
      expect(table.right).toBeLessThanOrEqual(390);
      expect(table.focusable).toBe(table.wider);
    }
    expect(tables.some(table => table.wider)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test("sizes the legend to what it lists: a level of two styles gets a narrow legend, on one line", async ({ page }) => {
  await openPayments(page);
  await page.goto("/p/prj_payments/cnv_lifecycle");
  await settled(page);
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Legend" }).click();
  const legend = page.getByRole("region", { name: "Legend" });
  const entries = legend.getByRole("listitem");
  await expect(entries).toHaveCount(2);
  expect((await legend.boundingBox()).width).toBeLessThan(400);
  const [first, second] = await entries.evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
  expect(second).toBe(first);
});

test.describe("with the legend and the minimap on, in a window 720 px high", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("stops the Problems panel and the inspector above the islands at the bottom right", async ({ page }) => {
    await openPayments(page);
    await settled(page);
    for (const layer of ["Legend", "Minimap"]) {
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.getByRole("menuitemcheckbox", { name: layer }).click();
    }
    await page.locator('.react-flow__node[data-id="nod_lifecycleEngine"]').click();
    await page.getByRole("button", { name: /problems$/ }).click();
    await page.getByRole("dialog", { name: "Inspector" }).getByRole("button", { name: "Show details" }).click();
    const box = locator => locator.evaluate(element => element.getBoundingClientRect().toJSON());
    const legend = await box(page.getByRole("region", { name: "Legend" }));
    const minimap = await box(page.locator(".react-flow__minimap"));
    for (const panel of [
      page.getByRole("dialog", { name: "Problems" }),
      page.getByRole("dialog", { name: "Inspector" })
    ]) {
      const shown = await box(panel);
      expect(overlap(shown, legend)).toBe(false);
      expect(overlap(shown, minimap)).toBe(false);
    }
  });
});

for (const width of [600, 390]) {
  test.describe(`in a window ${width} px wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    test("keeps the Problems panel readable beside the inspector: at least 280 px, all on screen", async ({ page }) => {
      await openPayments(page);
      await settled(page);
      await page.getByRole("button", { name: /problems$/ }).click();
      await page.keyboard.press("Escape");
      await page.locator(".react-flow__node-node").first().click();
      await expect(page.getByRole("dialog", { name: "Inspector" })).toBeVisible();
      await page.getByRole("button", { name: /problems$/ }).click();
      const problems = page.getByRole("dialog", { name: "Problems" });
      // Measured once it has opened (it grows into place).
      await problems.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
      const panel = await problems.boundingBox();
      expect(panel.width).toBeGreaterThanOrEqual(280);
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    });
  });
}

test.describe("in a window 600 px wide", () => {
  test.use({ viewport: { width: 600, height: 800 } });

  test("keeps the islands across the top on screen and apart, the actions whole", async ({ page }) => {
    await openPayments(page);
    await page.goto("/p/prj_payments/cnv_crossBorderSend");
    await settled(page);
    const [project, actions] = await page.evaluate(() =>
      ["project", "actions"].map(area =>
        document.querySelector(`[data-area="${area}"]`).getBoundingClientRect().toJSON()
      )
    );
    // No room for the levels: the level's heading on the canvas names it, and Levels…, ⌘K and Esc lead elsewhere.
    await expect(page.getByRole("navigation", { name: "Levels" })).toBeHidden();
    expect(overlap(project, actions)).toBe(false);
    expect(actions.right).toBeLessThanOrEqual(600);
    // The project keeps its mark and the start of its name.
    expect(project.width).toBeGreaterThanOrEqual(120);
    const mark = await page
      .locator('[data-area="project"] a')
      .first()
      .evaluate(link => link.getBoundingClientRect().toJSON());
    expect(mark.right).toBeLessThanOrEqual(project.right);
    await expect(page.getByRole("button", { name: "Export" })).toBeInViewport({ ratio: 1 });
  });
});

test.describe("with the legend and the minimap on, in a window 560 px high", () => {
  test.use({ viewport: { width: 1280, height: 560 } });

  test("keeps the Problems panel and the inspector usable, over the islands at the bottom if they must", async ({
    page
  }) => {
    await openPayments(page);
    await settled(page);
    for (const layer of ["Legend", "Minimap"]) {
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.getByRole("menuitemcheckbox", { name: layer }).click();
    }
    await page.locator('.react-flow__node[data-id="nod_lifecycleEngine"]').click();
    await page.getByRole("button", { name: /problems$/ }).click();
    const problems = page.getByRole("dialog", { name: "Problems" });
    const inspector = page.getByRole("dialog", { name: "Inspector" });
    for (const panel of [problems, inspector]) {
      await panel.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
      expect((await panel.boundingBox()).height).toBeGreaterThanOrEqual(280);
    }
    await expect(problems.getByRole("listitem").first()).toBeInViewport({ ratio: 1 });
    const footer = await inspector.getByRole("button", { name: "Show details" }).boundingBox();
    const island = await inspector.boundingBox();
    expect(footer.y + footer.height).toBeLessThanOrEqual(island.y + island.height);
  });
});

test("never shows the levels as a sliver: hidden where they lack room, or the level shown named in full", async ({
  page
}) => {
  await openPayments(page);
  await page.goto("/p/prj_payments/cnv_crossBorderSend");
  await settled(page);
  for (const width of [700, 721, 760, 820, 880, 900, 960]) {
    await page.setViewportSize({ width, height: 800 });
    const levels = page.getByRole("navigation", { name: "Levels" });
    if (!(await levels.isVisible())) continue;
    const current = levels.locator('[aria-current="page"]');
    expect(await current.evaluate(link => link.scrollWidth <= link.clientWidth), `${width} px`).toBe(true);
  }
});
