// Plan A3 (AI interface spec §2: "the person sees each change highlighted on the canvas, finds it in the undo history
// as the agent's, and undoes it"; "editor_state reflects what the Editor shows"; §7): an agent in the browser, through
// window.statewright, and the person beside it.
import { expect, test } from "@playwright/test";

/** Payments on a level, opened from its example, its boxes drawn and stored. */
async function openPayments(page, level) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto(`/p/prj_payments/${level}`);
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
}

/** Call the contract as an agent in the page does. */
const agent = (page, name, args) =>
  page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);

const LATE = {
  label: "A state for late payers",
  commands: [
    { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } },
    { type: "layout.node.set", args: { canvas: "cnv_expiryClock", id: "nod_late", x: 560, y: 260 } },
    { type: "edge.add", args: { canvas: "cnv_expiryClock", edge: { from: "nod_running", to: "nod_late" } } }
  ]
};

test("shows an agent's change on the canvas and in a toast, as the agent's in the history, and undoes it (§2)", async ({
  page
}) => {
  await openPayments(page, "cnv_expiryClock");
  expect(await page.evaluate(() => globalThis.statewright.hello({ agent: "test-agent" }))).toEqual({
    agent: "test-agent",
    operations: 39
  });
  const applied = await agent(page, "batch.apply", LATE);
  expect(applied.result.created).toEqual(["nod_late", "edg_runningLate"]);

  await expect(page.locator('.react-flow__node.sw-ai[data-id="nod_late"]')).toBeVisible();
  await expect(page.locator('.react-flow__edge.sw-ai[data-id="edg_runningLate"]')).toHaveCount(1);
  const toast = page.getByTestId("toast");
  await expect(toast).toContainText("AI · test-agent: A state for late payers");
  // The glow lasts 2 s; the change stays.
  await expect(page.locator(".sw-ai")).toHaveCount(0, { timeout: 4000 });

  await page.getByTestId("project-menu").click();
  await expect(page.getByTestId("project-menu-undo")).toContainText("Undo A state for late payers (AI)");
  await page.keyboard.press("Escape");

  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator('.react-flow__node[data-id="nod_late"]')).toHaveCount(0);
  expect((await agent(page, "document.get")).result.document.canvases.cnv_expiryClock.nodes.nod_late).toBeUndefined();
});

test("offers Show for a change on another level, and goes there", async ({ page }) => {
  await openPayments(page, "cnv_lifecycle");
  await agent(page, "batch.apply", LATE);
  await page.getByTestId("toast").getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
  await expect(page.locator('.react-flow__node.sw-ai[data-id="nod_late"]')).toBeVisible();
});

test("points elements out with a note until the person clicks elsewhere, and waits under a dialog", async ({
  page
}) => {
  await openPayments(page, "cnv_lifecycle");
  expect(
    await agent(page, "view.point", { ids: ["nod_running", "nod_paused"], note: "The clock pauses here" })
  ).toEqual({
    ok: true,
    result: { canvas: "cnv_expiryClock" }
  });
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
  await expect(page.getByTestId("canvas-point")).toHaveText("AIThe clock pauses here");
  await expect(page.locator(".react-flow__node.sw-pointed")).toHaveCount(2);
  await page.locator(".react-flow__pane").click({ position: { x: 120, y: 600 } });
  await expect(page.getByTestId("canvas-point")).toHaveCount(0);

  await page.getByTestId("project-menu").click();
  await page.getByTestId("project-menu-levels").click();
  expect(await agent(page, "view.open", { canvas: "cnv_runtime" })).toMatchObject({
    ok: false,
    error: { code: "BUSY" }
  });
  expect((await agent(page, "document.summary")).ok).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
});

test("reads what the Editor shows (§2: editor_state)", async ({ page }) => {
  await openPayments(page, "cnv_lifecycle");
  await page.locator('.react-flow__node[data-id="nod_expiryClock"]').click();
  await page.getByTestId("actions-problems").click();
  await expect(page.getByTestId("problems-panel")).toBeVisible();
  const state = await page.evaluate(() => globalThis.statewright.state());
  expect(state).toMatchObject({
    route: "/p/prj_payments/cnv_lifecycle",
    project: { id: "prj_payments", name: "Payments", readOnly: false },
    level: { canvas: "cnv_lifecycle", name: "Lifecycle engine" },
    trail: [{ canvas: "cnv_runtime" }, { canvas: "cnv_lifecycle" }],
    selection: ["nod_expiryClock"],
    open: { inspector: { id: "nod_expiryClock" }, problems: true, simulation: false, dialog: null },
    theme: "light",
    language: "en",
    run: null
  });
  await agent(page, "run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
  await expect(page.getByTestId("simulation-panel")).toBeVisible();
  expect((await agent(page, "editor.state")).result).toMatchObject({
    open: { simulation: true, inspector: null },
    run: { canvas: "cnv_lifecycle", shown: 0, question: null }
  });
});

test("exports a level as PNG and a scenario as a page with the fonts, from the browser", async ({ page }) => {
  await openPayments(page, "cnv_expiryClock");
  const png = await agent(page, "export.png", { canvas: "cnv_expiryClock" });
  expect(png.result.name).toBe("payments-expiry-clock.png");
  expect(png.result.base64.startsWith("iVBORw0KGgo")).toBe(true);
  const story = await agent(page, "export.scenarioPage", { id: "scn_verificationPausesTheClock" });
  expect(story.result.name).toBe("verification-pauses-the-clock.html");
  expect(story.result.text).toContain("@font-face");
});
