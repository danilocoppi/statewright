// Plan E5 (spec §9, §11: "axe checks on every screen"): every screen and every island, dialog and menu on it meets
// WCAG 2.2 A and AA in both themes; and the top islands' menus open over the panels, where they can be used. Plan A4
// (AI interface spec §10: "axe on the pairing dialog and the island in both themes").
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { startMcp } from "./mcp.js";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const EXAMPLES = resolve(import.meta.dirname, "../../../examples");
const exampleText = name => readFileSync(resolve(EXAMPLES, `${name}.sttw`), "utf8");

/** No WCAG 2.2 A or AA violation on the page as it is now; each violation is named with where it is. */
async function expectAccessible(page, screen) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(violations.map(item => `${screen}: ${item.id} at ${item.nodes.map(node => node.target).join(", ")}`)).toEqual(
    []
  );
}

const upload = (page, text, name) =>
  page.getByLabel("Open file…").setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });

/** Payments, opened from its example, on a level, once its boxes are drawn and stored. */
async function openPayments(page, level = "") {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  if (level) await page.goto(`/p/prj_payments/${level}`);
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}

const menu = page => page.getByRole("button", { name: /^Payments/ });

for (const theme of ["light", "dark"]) {
  test.describe(`in the ${theme} theme`, () => {
    // The theme follows the system's; nothing moves while axe reads the page.
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    test("Projects, a new project and opening files", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText(/No projects yet/)).toBeVisible();
      await expectAccessible(page, "Projects, empty");

      await page.getByRole("button", { name: /^State machine/ }).click();
      await expect(page.getByRole("dialog", { name: "New project" })).toBeVisible();
      await expectAccessible(page, "New project");
      await page.keyboard.press("Escape");

      await upload(page, '{ "statewright": "1.0", "canvases": 3 }', "broken.json");
      await expect(page.getByRole("dialog", { name: "This file can't be opened" })).toBeVisible();
      await expectAccessible(page, "A file that can't be opened");
      await page.keyboard.press("Escape");

      await upload(page, exampleText("get-paid-as-built"), "get-paid.sttw");
      await page.waitForURL(/\/p\/prj_getPaid$/);
      await page.goto("/");
      const changed = JSON.parse(exampleText("get-paid-as-built"));
      changed.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting";
      await upload(page, JSON.stringify(changed, null, 2), "get-paid.sttw");
      await expect(page.getByRole("dialog", { name: "This file was changed outside Statewright" })).toBeVisible();
      await expectAccessible(page, "A file changed outside Statewright");
      await page.keyboard.press("Escape");
      await expectAccessible(page, "Projects, with a project");
    });

    test("the editor: a level, the inspector in both layers, Problems, the menus, the legend and the minimap", async ({
      page
    }) => {
      await openPayments(page);
      await expectAccessible(page, "A level");

      await page.locator('.react-flow__node[data-id="nod_lifecycleEngine"]').click();
      const inspector = page.getByRole("dialog", { name: "Inspector" });
      await expect(inspector).toBeVisible();
      await expectAccessible(page, "The inspector's basics");
      await inspector.getByRole("button", { name: "Show details" }).click();
      await expectAccessible(page, "The inspector's details");
      await inspector.getByRole("button", { name: "Hide details" }).click();
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: /problems$/ }).click();
      await expect(page.getByRole("dialog", { name: "Problems" })).toBeVisible();
      await expectAccessible(page, "Problems");
      await page.keyboard.press("Escape");

      await menu(page).click();
      await expectAccessible(page, "The project menu");
      await page.getByRole("menuitemcheckbox", { name: "Legend" }).click();
      await menu(page).click();
      await page.getByRole("menuitemcheckbox", { name: "Minimap" }).click();
      await expect(page.getByRole("region", { name: "Legend" })).toBeVisible();
      await expectAccessible(page, "The legend and the minimap");

      await page.getByRole("button", { name: "Export" }).click();
      await expectAccessible(page, "Export");
      await page.keyboard.press("Escape");
    });

    test("a state machine: renaming, a trigger, insert by name, the canvas menu, details of the level and the project", async ({
      page
    }) => {
      await openPayments(page, "cnv_lifecycle");
      await expectAccessible(page, "A state machine");

      await page.locator('.react-flow__node[data-id="nod_complianceHold"]').click();
      await page.keyboard.press("F2");
      await expectAccessible(page, "Renaming a box in place");
      await page.keyboard.press("Escape");

      await page.locator(".react-flow__edge").first().click({ force: true });
      await expectAccessible(page, "The inspector of a transition");
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: /^When does/ })).toBeVisible();
      await expectAccessible(page, "The trigger editor");
      await page.keyboard.press("Escape");

      await page.locator(".react-flow__pane").click({ position: { x: 700, y: 120 } });
      await page.keyboard.press("/");
      await expectAccessible(page, "Insert by name");
      await page.keyboard.press("Escape");

      await page.locator(".react-flow__pane").click({ button: "right", position: { x: 700, y: 120 } });
      await expect(page.getByRole("menu")).toBeVisible();
      await expectAccessible(page, "The canvas menu");
      await page.keyboard.press("Escape");

      await page.keyboard.press("Shift+I");
      await expectAccessible(page, "The level's details");
      await page.keyboard.press("Shift+I");
      await menu(page).click();
      await page.getByRole("menuitem", { name: "Project details" }).click();
      await expectAccessible(page, "The project's details");
    });

    test("the catalog with a type, search and commands, the levels and renaming the project", async ({ page }) => {
      await openPayments(page);
      await page.locator(".react-flow__pane").click({ position: { x: 700, y: 120 } });
      await page.keyboard.press("g");
      const sheet = page.getByRole("dialog", { name: /Catalog/ });
      await expect(sheet).toBeVisible();
      await expectAccessible(page, "The catalog");
      await sheet.getByRole("button", { name: /^Types/ }).click();
      await sheet.locator("section ul button").first().click();
      await expectAccessible(page, "A type in the catalog");
      await page.keyboard.press("Escape");

      await page.keyboard.press("Control+k");
      await expect(page.getByRole("dialog", { name: "Search and commands" })).toBeVisible();
      await expectAccessible(page, "Search and commands");
      await page.keyboard.press("Escape");

      await menu(page).click();
      await page.getByRole("menuitem", { name: "Levels…" }).click();
      await expectAccessible(page, "The levels");
      await page.keyboard.press("Escape");

      await menu(page).click();
      await page.getByRole("menuitem", { name: "Rename…" }).click();
      await expectAccessible(page, "Renaming the project");
    });

    test("the simulation: the Start panel, a run on the canvas, a question, its steps and data, the picker, saving", async ({
      page
    }) => {
      await openPayments(page, "cnv_crossBorderSend");
      await page.goto("/p/prj_payments/cnv_lifecycle");
      await page.getByRole("button", { name: "Simulate" }).click();
      const panel = page.getByRole("dialog", { name: "Simulation" });
      await expect(panel.getByRole("region", { name: "Scenarios" })).toBeVisible();
      await expectAccessible(page, "The Start panel");
      await panel.getByLabel(/^expiresAt/).fill("next week");
      await expectAccessible(page, "A starting value that cannot be read");
      await panel.getByLabel(/^expiresAt/).fill("2026-01-15 09:00");
      await panel.getByRole("button", { name: "Start" }).click();
      await expect(panel.getByRole("region", { name: "What can happen" })).toBeVisible();
      await expectAccessible(page, "A run, marked on its level");

      await panel.getByRole("button", { name: "Other event…" }).click();
      await expectAccessible(page, "Other event");
      await page.keyboard.press("Escape");
      await panel.getByRole("button", { name: "Let time pass…" }).click();
      await expectAccessible(page, "Let time pass");
      await page.keyboard.press("Escape");

      await panel.getByRole("button", { name: /^payin\.confirmed/ }).click();
      await page.locator('.react-flow__node[data-id="nod_sendCrossBorder"]').getByText("converting").click();
      await expect(page).toHaveURL(/\/cnv_crossBorderSend$/);
      await panel.getByRole("button", { name: /^leg\.completed/ }).click();
      await expect(panel.getByRole("region", { name: "Question" })).toBeVisible();
      await expectAccessible(page, "A question, numbered on the canvas");
      await page.keyboard.press("1");
      await panel.getByRole("button", { name: /^1/ }).first().click();
      await panel.getByRole("button", { name: "Data" }).click();
      await expectAccessible(page, "A step's micro-events and the data");

      await panel.getByRole("button", { name: "Save as scenario…" }).click();
      await expectAccessible(page, "Save as scenario");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Stop", exact: true }).click();
      await expectAccessible(page, "Stopping with steps not saved");
    });

    test("the stage: a scenario presented, at its start and at a step on its level", async ({ page }) => {
      await openPayments(page, "cnv_crossBorderSend");
      await page.goto("/p/prj_payments/cnv_lifecycle");
      await page.getByRole("button", { name: "Simulate" }).click();
      await page.getByRole("button", { name: "Present Verification pauses the clock" }).click();
      const stage = page.getByRole("region", { name: "Presenting Verification pauses the clock" });
      await expect(stage.getByText("Start", { exact: true })).toBeVisible();
      await expectAccessible(page, "The stage at its start");
      await page.keyboard.press("ArrowRight");
      await expect(page).toHaveURL(/\/cnv_expiryClock$/);
      await expect(stage.getByText("1 / 3", { exact: true })).toBeVisible();
      await expectAccessible(page, "The stage at a step");
    });

    test("an agent's change in a toast, and its note on the canvas", async ({ page }) => {
      await openPayments(page, "cnv_expiryClock");
      await page.evaluate(() =>
        globalThis.statewright.batch.apply({
          label: "An event for late payers",
          commands: [{ type: "catalog.add", args: { collection: "events", item: { name: "late.notice" } } }]
        })
      );
      await page.evaluate(() =>
        globalThis.statewright.view.point({ ids: ["nod_running"], note: "The clock runs from here" })
      );
      await expect(page.getByTestId("toast")).toBeVisible();
      await expect(page.getByTestId("canvas-point")).toBeVisible();
      await expectAccessible(page, "An agent's change and its note");
    });

    test("Connect an AI…, waiting and failing, and the agent paired in the actions island", async ({ page }) => {
      const mcp = await startMcp({ agent: "claude-code" });
      try {
        // Nothing answers at the address the Editor looks at first.
        await page.route("http://127.0.0.1:47615/**", route => route.abort());
        await openPayments(page);
        await page.getByTestId("project-menu").click();
        await page.getByTestId("project-menu-connect").click();
        await expect(page.getByTestId("connect-status")).toHaveText("Nothing answers at 127.0.0.1:47615.");
        await expectAccessible(page, "Connect an AI…, nothing answering");
        await page.getByTestId("connect-address").fill(mcp.address);
        await page.getByTestId("connect-address").press("Enter");
        await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
        await expectAccessible(page, "Connect an AI…, waiting for the agent");
        await mcp.pair(await page.getByTestId("connect-code").textContent());
        await expect(page.getByTestId("connect-dialog")).toBeHidden();
        await expect(page.getByTestId("actions-agent")).toBeVisible();
        await expectAccessible(page, "The actions island, an agent paired");
      } finally {
        await mcp.stop();
      }
    });

    test("a read-only tab, the guide and an address with nothing there", async ({ page, context }) => {
      await openPayments(page);
      const second = await context.newPage();
      await second.goto("/p/prj_payments");
      await expect(second.getByText(/read-only/)).toBeVisible();
      await expectAccessible(second, "A read-only tab");

      await second.goto("/readme");
      await expect(second.getByRole("heading", { name: "Reading a diagram" })).toBeVisible();
      await expectAccessible(second, "The guide");
      await second.goto("/nowhere");
      await expectAccessible(second, "Nothing here");
    });
  });
}

test("a scenario page, as exported, and presented", async ({ page, context }) => {
  await openPayments(page);
  await page.goto("/p/prj_payments/cnv_lifecycle");
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("menuitem", { name: /^Scenario page…/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("dialog", { name: "Scenario page" })
      .getByRole("button", { name: /^Pays in time/ })
      .click()
  ]);
  const reader = await context.newPage();
  await reader.setContent(readFileSync(await download.path(), "utf8"));
  await reader.keyboard.press("End");
  await expectAccessible(reader, "A scenario page");
  await reader.getByRole("button", { name: "Present" }).click();
  await expectAccessible(reader, "A scenario page, presented");
});

test("opens the top islands' menus over the inspector and the Problems panel, where they can be used", async ({
  page
}) => {
  await page.addInitScript(() => delete window.showSaveFilePicker);
  await openPayments(page);
  await page.locator('.react-flow__node[data-id="nod_lifecycleEngine"]').click();
  await page.getByRole("button", { name: /problems$/ }).click();
  await expect(page.getByRole("dialog", { name: "Inspector" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Problems" })).toBeVisible();

  await page.getByRole("button", { name: "Export" }).click();
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: /Image \(SVG\)/ }).click()
  ]);
  expect(file.suggestedFilename()).toBe("payments-runtime.svg");

  await menu(page).click();
  await page.getByRole("menuitemcheckbox", { name: "Legend" }).click();
  await expect(page.getByRole("region", { name: "Legend" })).toBeVisible();
});
