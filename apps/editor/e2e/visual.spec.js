// Plan E5 (spec §11: "screenshots of each example level in light and dark — bundled fonts make them stable"): every
// level of the two examples as the editor shows it, in both themes, and a box at the right edge with the inspector
// open beside it, as it opens and widened from its edge. Plan S3 (simulator spec §10: "visual snapshots of mockups
// 02–06's states"): the simulation's states of mockups 01 to 04; plan S4, the stage (mockup 05) and a scenario's page
// (mockup 06); plan D1, the documentation page's cover and a level's part; plan A3, an agent's toast and note (AI
// interface spec §7.3); plan A4, Connect an AI… (§7.4); a finding badge's details, beside it; the level's kind under
// the tool dock, its menu open; and the support popover above its badge. After a deliberate change of look, update the pictures with
// `npm run e2e -w @statewright/editor -- e2e/visual.spec.js --update-snapshots=all` and look at every one before
// committing it.
import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { getPaidWithFindings } from "./fixtures/findings.js";

const EXAMPLES = [
  {
    button: /^Payments/,
    project: "prj_payments",
    levels: ["cnv_runtime", "cnv_lifecycle", "cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock"]
  },
  { button: /^Get paid/, project: "prj_getPaid", levels: ["cnv_transaction", "cnv_open"] }
];

/** Wait until the level is drawn and still: arranged and stored, its fonts in, its view no longer moving. */
async function settled(page) {
  await expect(page.locator(".react-flow__node").first()).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  await expect(page.getByText("Saving…")).toHaveCount(0);
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

for (const theme of ["light", "dark"]) {
  test.describe(`in the ${theme} theme`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

    for (const example of EXAMPLES) {
      test(`shows every level of ${example.project} as it did`, async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: example.button }).click();
        await page.waitForURL(new RegExp(`/p/${example.project}$`));
        // Every level is arranged and stored once; then each is opened afresh, as a person finds it.
        for (const level of example.levels) {
          await page.goto(`/p/${example.project}/${level}`);
          await settled(page);
        }
        for (const level of example.levels) {
          await page.goto(`/p/${example.project}/${level}`);
          await settled(page);
          await expect(page).toHaveScreenshot(`${example.project}-${level}-${theme}.png`, { maxDiffPixelRatio: 0.001 });
        }
      });
    }

    test("shows the simulation as its mockups do: the Start panel, a run, its levels, a question", async ({ page }) => {
      // The clock starts on the hour of a fixed now; the level's arrangement is stored first, as above.
      await page.clock.setFixedTime(new Date("2026-01-05T09:12:00Z"));
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      for (const level of ["cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock", "cnv_lifecycle"]) {
        await page.goto(`/p/prj_payments/${level}`);
        await settled(page);
      }
      const panel = page.getByRole("dialog", { name: "Simulation" });
      const take = name => panel.getByRole("button", { name: new RegExp(`^${name.replace(/\./g, "\\.")}`) }).click();
      // The pointer rests away from the panel and the level, so no row is shown under it.
      const shot = async name => {
        await page.mouse.move(8, 892);
        await settled(page);
        await expect(page).toHaveScreenshot(`simulate-${name}-${theme}.png`, { maxDiffPixelRatio: 0.001 });
      };

      // Mockup 02: the Start panel, its scenarios and the deadline typed in.
      await page.getByRole("button", { name: "Simulate" }).click();
      await panel.getByLabel(/^expiresAt/).fill("2026-01-15 09:00");
      await shot("start");

      // Mockup 04: the run across the lifecycle's regions, each box with the state active inside it.
      await panel.getByRole("button", { name: "Start" }).click();
      await shot("levels");

      // Mockup 01: down in the expiry clock, three steps taken: paused, two days, running again.
      await page.locator('.react-flow__node[data-id="nod_expiryClock"]').getByText("running").click();
      await expect(page).toHaveURL(/\/cnv_expiryClock$/);
      await take("verify.started");
      await panel.getByRole("button", { name: "Let time pass…" }).click();
      await panel.getByLabel("Or a duration, or a date and time").fill("2 days");
      await panel.getByRole("button", { name: "Wait" }).click();
      await take("verify.ended");
      await shot("run");

      // Mockup 03: in the cross-border send, the question payout.completed asks, numbered on the canvas.
      await page.getByRole("link", { name: "Lifecycle engine" }).click();
      await page.locator('.react-flow__node[data-id="nod_sendCrossBorder"]').getByText("awaiting_funds").click();
      await expect(page).toHaveURL(/\/cnv_crossBorderSend$/);
      await take("payin.confirmed");
      await take("leg.completed");
      await page.keyboard.press("1");
      await take("payout.completed");
      await expect(panel.getByRole("region", { name: "Question" })).toBeVisible();
      await shot("question");
    });

    test("shows a step presented on the stage as mockup 05 does", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      for (const level of ["cnv_crossBorderSend", "cnv_complianceHold", "cnv_expiryClock", "cnv_lifecycle"]) {
        await page.goto(`/p/prj_payments/${level}`);
        await settled(page);
      }
      await page.getByRole("button", { name: "Simulate" }).click();
      await page.getByRole("button", { name: "Present Verification pauses the clock" }).click();
      await page.keyboard.press("ArrowRight");
      await expect(page).toHaveURL(/\/cnv_expiryClock$/);
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`present-stage-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows an agent's change in its toast, and its note over what it points out", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      await page.goto("/p/prj_payments/cnv_expiryClock");
      await settled(page);
      await page.evaluate(() => globalThis.statewright.hello({ agent: "claude-code" }));
      // A change of the catalog: its toast, and nothing glowing that would move the picture.
      await page.evaluate(() =>
        globalThis.statewright.batch.apply({
          label: "An event for late payers",
          commands: [{ type: "catalog.add", args: { collection: "events", item: { name: "late.notice" } } }]
        })
      );
      await page.evaluate(() =>
        globalThis.statewright.view.point({
          ids: ["nod_running", "nod_paused"],
          note: "Verification pauses the clock here"
        })
      );
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`agent-note-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows Connect an AI…, waiting for the agent with its code", async ({ page }) => {
      // The code the Editor shows, always the same (K7Q-2MX), and a server that has not answered yet.
      await page.addInitScript(() => {
        const random = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = bytes =>
          bytes.length === 6 ? (bytes.set([17, 5, 21, 0, 18, 28]), bytes) : random(bytes);
      });
      await page.route("http://127.0.0.1:47615/pair", () => {});
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      await settled(page);
      await page.getByTestId("project-menu").click();
      await page.getByTestId("project-menu-connect").click();
      await expect(page.getByTestId("connect-code")).toHaveText("K7Q-2MX");
      await page.mouse.move(8, 892);
      await expect(page).toHaveScreenshot(`connect-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows the level's kind under the dock, its menu open for a service with nothing inside", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await page.waitForURL(/\/p\/prj_payments$/);
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_scheduler"]').click();
      await page.getByRole("button", { name: "Level kind: System" }).click();
      await expect(page.getByRole("menu", { name: "Levels inside a box" })).toBeVisible();
      await page.mouse.move(8, 892);
      await settled(page);
      await expect(page).toHaveScreenshot(`level-kind-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a badge's findings beside it", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Open file…").setInputFiles(await getPaidWithFindings());
      await expect(page).toHaveURL(/\/p\/prj_getPaid$/);
      await page.goto("/p/prj_getPaid/cnv_transaction");
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_processing"] .badge').hover();
      await expect(page.getByTestId("canvas-finding")).toBeVisible();
      await expect(page).toHaveScreenshot(`finding-popover-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows the support popover open above its badge, on the Projects screen", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("button", { name: /^Payments/ })).toBeVisible();
      await page.getByRole("button", { name: "Support" }).click();
      await expect(page.getByRole("dialog", { name: "Support Statewright" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(8, 892);
      await expect(page).toHaveScreenshot(`support-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("keeps a box at the right edge clear of the inspector", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: /^Payments/ }).click();
      await settled(page);
      await page.reload();
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_providers"]').click();
      await expect(page.getByRole("dialog", { name: "Inspector" })).toBeVisible();
      await settled(page);
      await expect(page).toHaveScreenshot(`inspector-right-edge-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });

    test("shows a widened inspector, its edge under the pointer, a box at the right edge clear of it", async ({
      page
    }) => {
      await page.goto("/");
      await page.evaluate(() =>
        localStorage.setItem("statewright:inspector", JSON.stringify({ state: { width: 560 }, version: 0 }))
      );
      await page.getByRole("button", { name: /^Payments/ }).click();
      await settled(page);
      await page.reload();
      await settled(page);
      await page.locator('.react-flow__node[data-id="nod_providers"]').click();
      const edge = page.getByRole("separator", { name: "Resize the inspector" });
      await edge.hover();
      await settled(page);
      await expect(page).toHaveScreenshot(`inspector-wide-${theme}.png`, { maxDiffPixelRatio: 0.001 });
    });
  });
}

test.describe("the documentation page", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test("shows the documentation page's cover and a level's part, its diagram in its card", async ({
    page,
    context
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Payments/ }).click();
    await page.waitForURL(/\/p\/prj_payments$/);
    await page.getByRole("button", { name: "Export" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: /^Documentation \(HTML\)/ }).click()
    ]);
    const reader = await context.newPage();
    await reader.setContent(readFileSync(await download.path(), "utf8"));
    await reader.evaluate(() => document.fonts.ready);
    await expect(reader).toHaveScreenshot("documentation-cover-light.png", { maxDiffPixelRatio: 0.001 });
    await reader.evaluate(() => document.getElementById("level-cnv_expiryClock").scrollIntoView());
    await expect(reader.locator('#contents a[aria-current="true"]')).toHaveText("Expiry clock");
    await expect(reader).toHaveScreenshot("documentation-level-light.png", { maxDiffPixelRatio: 0.001 });
  });
});

test.describe("a scenario's page", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test("shows a step of a scenario's page as mockup 06 does: its story beside the level", async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Payments/ }).click();
    await page.waitForURL(/\/p\/prj_payments$/);
    await page.getByRole("button", { name: "Export" }).click();
    await page.getByRole("menuitem", { name: /^Scenario page…/ }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("dialog", { name: "Scenario page" })
        .getByRole("button", { name: /^Verification pauses the clock/ })
        .click()
    ]);
    const reader = await context.newPage();
    await reader.setContent(readFileSync(await download.path(), "utf8"));
    await reader.keyboard.press("ArrowRight");
    await reader.evaluate(() => document.fonts.ready);
    await reader.mouse.move(8, 892);
    await expect(reader).toHaveScreenshot("present-page-light.png", { maxDiffPixelRatio: 0.001 });
  });
});
