// Plan A3 (AI interface spec §2: "Every data-testid the guide promises exists and is unique on its screen"; §7.5): the
// hooks agents testing the Editor find it by, each on its screen, walked as a person would — and as an agent would,
// through window.statewright.
import { expect, test } from "@playwright/test";

import { HOOKS } from "../src/agent/hooks.js";

import { startMcp } from "./mcp.js";

test("finds every hook on its screen, once where it is unique (§7.5)", async ({ page }) => {
  const seen = new Set();
  /** Each hook is there: once when it is unique, at least once otherwise. */
  const shows = async (...ids) => {
    for (const id of ids) {
      const hook = HOOKS.find(item => item.id === id);
      expect(hook, id).toBeTruthy();
      const found = page.getByTestId(id);
      if (hook.unique) await expect(found, id).toHaveCount(1);
      else await expect(found.first(), id).toBeVisible();
      seen.add(id);
    }
  };
  const agent = (name, args) => page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);

  // The Projects screen, with nothing kept yet; then payments, from its example.
  await page.goto("/");
  await shows("projects-new", "projects-open-file", "projects-connect");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // The editor's islands and the canvas.
  await shows(
    "project-island",
    "project-menu",
    "levels-breadcrumb",
    "actions-island",
    "actions-problems",
    "actions-undo",
    "actions-redo",
    "actions-layout",
    "actions-simulate",
    "actions-export",
    "tools-dock",
    "zoom-island",
    "canvas"
  );

  // The menus and their main items.
  await page.getByTestId("project-menu").click();
  await shows(
    "project-menu-list",
    "project-menu-rename",
    "project-menu-levels",
    "project-menu-catalog",
    "project-menu-save",
    "project-menu-undo",
    "project-menu-redo"
  );
  await page.keyboard.press("Escape");
  await page.getByTestId("actions-export").click();
  await shows(
    "actions-export-list",
    "actions-export-svg",
    "actions-export-png",
    "actions-export-markdown",
    "actions-export-documentPage",
    "actions-export-aiPack",
    "actions-export-contract",
    "actions-export-scenarioPage"
  );
  await page.keyboard.press("Escape");

  // The panels and dialogs.
  await page.getByTestId("actions-problems").click();
  await shows("problems-panel", "problems-row");
  await page.getByTestId("actions-problems").click();
  await page.goto("/p/prj_payments/cnv_lifecycle");
  await page.locator('.react-flow__node[data-id="nod_expiryClock"]').click();
  await shows("inspector", "inspector-field");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+K");
  await shows("palette");
  await page.keyboard.press("Escape");
  for (const [item, dialog] of [
    ["project-menu-levels", "levels-dialog"],
    ["project-menu-rename", "rename-dialog"],
    ["project-menu-catalog", "catalog-sheet"]
  ]) {
    await page.getByTestId("project-menu").click();
    await page.getByTestId(item).click();
    await shows(dialog);
    await page.keyboard.press("Escape");
    await expect(page.locator(`[data-testid="${dialog}"][open]`)).toHaveCount(0);
  }

  // What an agent shows: its change in a toast, its note on the canvas.
  await agent("batch.apply", {
    label: "Rename the clock",
    commands: [{ type: "node.update", args: { id: "nod_expiryClock", set: { name: "expiry" } } }]
  });
  await agent("view.point", { ids: ["nod_expiryClock"], note: "The clock lives here" });
  await shows("toast", "canvas-point");

  // A badge's findings, the pointer resting on it.
  await agent("batch.apply", {
    label: "A finding on the clock",
    commands: [
      {
        type: "finding.upsert",
        args: {
          id: "fnd_C1",
          finding: { code: "C1", title: "Pauses twice", severity: "low", targets: ["nod_expiryClock"] }
        }
      }
    ]
  });
  await page.locator('.badge[data-target="nod_expiryClock"]').hover();
  await shows("canvas-finding");
  await page.keyboard.press("Escape");

  // A marker's Problems, the pointer resting on it.
  await page.locator('.react-flow__node[data-id="nod_complianceHold"] .problem-marker').hover();
  await shows("canvas-problem");
  await page.keyboard.press("Escape");

  // The simulation: its moves, its steps, the question it asks; the stage and its card.
  await agent("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
  await shows("simulation-panel", "simulation-move", "simulation-stop");
  await agent("run.step", { do: { event: "evt_payinDetected" } });
  await agent("run.step", { do: { event: "evt_payinConfirmed" } });
  await agent("run.step", { do: { event: "evt_legCompleted" } });
  await shows("simulation-step", "simulation-question");
  await agent("run.stop", { discard: true });
  await agent("scenario.present", { id: "scn_verificationPausesTheClock" });
  await shows("stage", "stage-card");
  await page.keyboard.press("Escape");

  // Pairing with an agent: Connect an AI…, the agent in the actions island, and another tab asking to take over.
  const mcp = await startMcp({ agent: "hooks-agent" });
  try {
    await page.getByTestId("project-menu").click();
    await shows("project-menu-connect");
    await page.getByTestId("project-menu-connect").click();
    await shows("connect-dialog", "connect-code", "connect-status", "connect-address");
    await page.getByTestId("connect-address").fill(mcp.address);
    await page.getByTestId("connect-address").press("Enter");
    await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
    await mcp.pair(await page.getByTestId("connect-code").textContent());
    await shows("actions-agent", "actions-disconnect");
    const other = await page.context().newPage();
    await other.goto("/p/prj_payments");
    await other.getByTestId("project-menu").click();
    await other.getByTestId("project-menu-connect").click();
    await other.getByTestId("connect-address").fill(mcp.address);
    await other.getByTestId("connect-address").press("Enter");
    await expect(other.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
    const asking = mcp.pair(await other.getByTestId("connect-code").textContent());
    await shows("handover-dialog");
    await page.getByRole("button", { name: "Keep here" }).click();
    await asking;
    await other.close();
  } finally {
    await mcp.stop();
  }

  // The Projects screen, with payments kept.
  await page.goto("/");
  await shows("projects-list", "projects-card");

  expect([...seen].sort()).toEqual(HOOKS.map(hook => hook.id).sort());
});
