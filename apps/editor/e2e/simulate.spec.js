// Plan S3 (simulator spec §2, §10): the simulation in a real browser — the payments lifecycle run with the keyboard
// alone to its success criteria, a scenario saved, seen to go elsewhere after an edit and accepted, a flow, and a
// read-only tab that simulates but does not save.
import { expect, test } from "@playwright/test";

const focused = page => page.locator(":focus");

/** Press a key until the focus is on what is asked for (at most `limit` times). */
async function pressUntil(page, key, target, limit = 60) {
  for (let step = 0; step < limit; step += 1) {
    if (await target.evaluate(element => element === document.activeElement).catch(() => false)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`${key} never reached the element asked for`);
}

const panel = page => page.getByRole("dialog", { name: "Simulation" });
const now = page => panel(page).getByRole("region", { name: "Now" });
const move = (page, name) => panel(page).getByRole("button", { name: new RegExp(`^${name.replace(/\./g, "\\.")}`) });

/** Payments, opened from its example, on a level, once its boxes are drawn and stored. */
async function openPayments(page, level) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  if (level) await page.goto(`/p/prj_payments/${level}`);
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
}

/** The Start panel of the lifecycle, its expiry deadline typed in, then Start. */
async function startLifecycle(page) {
  await page.getByRole("button", { name: "Simulate" }).click();
  await panel(page)
    .getByLabel(/^expiresAt/)
    .fill("2026-01-15 09:00");
  await panel(page).getByLabel("Clock starts").fill("2026-01-05 09:00");
  await panel(page).getByRole("button", { name: "Start" }).click();
  await expect(now(page)).toBeVisible();
}

test("runs the payments lifecycle with the keyboard alone: completed after its questions, then the expiry (§2)", async ({
  page
}) => {
  await page.clock.setFixedTime(new Date("2026-01-05T09:12:00Z"));
  await page.goto("/");
  await pressUntil(page, "Tab", page.getByRole("button", { name: /^Payments/ }));
  await page.keyboard.press("Enter");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await pressUntil(page, "Tab", page.getByRole("group", { name: "Lifecycle engine", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/cnv_lifecycle$/);

  // Simulate, in the actions island; the Start panel's deadline, then Start (the clock starts now, on the hour).
  await pressUntil(page, "F6", page.getByRole("button", { name: /problems$/ }), 10);
  await pressUntil(page, "Tab", page.getByRole("button", { name: "Simulate" }));
  await page.keyboard.press("Enter");
  await pressUntil(page, "F6", panel(page).getByRole("link", { name: /How simulation works/ }), 10);
  await pressUntil(page, "Tab", panel(page).getByLabel(/^expiresAt/));
  await page.keyboard.type("2026-01-15 09:00");
  await pressUntil(page, "Tab", panel(page).getByRole("button", { name: "Start" }));
  await page.keyboard.press("Enter");
  await expect(now(page)).toContainText("Mon 5 Jan 2026, 09:00");

  // What can happen, a move at a time: the questions the guards in words ask are answered with 1.
  await pressUntil(page, "Tab", move(page, "payin.confirmed"));
  await page.keyboard.press("Enter");
  await expect(now(page)).toContainText("converting");
  await pressUntil(page, "Tab", move(page, "leg.completed"));
  await page.keyboard.press("Enter");
  await expect(panel(page).getByRole("heading", { name: "Which condition holds in converting?" })).toBeVisible();
  await page.keyboard.press("1");
  await expect(now(page)).toContainText("paying_out");
  await pressUntil(page, "Tab", move(page, "payout.completed"));
  await page.keyboard.press("Enter");
  await expect(panel(page).getByRole("heading", { name: "Which condition holds in paying_out?" })).toBeVisible();
  await page.keyboard.press("1");
  await expect(now(page).getByRole("listitem").filter({ hasText: "Phase" })).toContainText("completed");

  // Let time pass until the next timer: the expiry clock runs out.
  await pressUntil(page, "Tab", panel(page).getByRole("button", { name: "Let time pass…" }));
  await page.keyboard.press("Enter");
  await pressUntil(page, "Tab", panel(page).getByRole("button", { name: "Until the next timer" }), 5);
  await page.keyboard.press("Enter");
  await expect(now(page).getByRole("listitem").filter({ hasText: "Expiry clock" })).toContainText("elapsed");
  await expect(now(page)).toContainText("Thu 15 Jan 2026, 09:00");
  await expect(focused(page)).toBeAttached();
});

test("saves a run as a scenario, sees it go elsewhere after an edit, and accepts the new path (§2)", async ({
  page
}) => {
  await openPayments(page, "cnv_expiryClock");
  await page.goto("/p/prj_payments/cnv_lifecycle");
  await startLifecycle(page);
  await move(page, "verify.started").click();
  await panel(page).getByRole("button", { name: "Save as scenario…" }).click();
  await page.getByRole("dialog", { name: "Save as scenario" }).getByLabel("Name").fill("The clock pauses");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(panel(page)).toBeHidden();

  // The design changes: the transition the scenario took is removed.
  await page.locator('.react-flow__node[data-id="nod_expiryClock"]').dblclick();
  await expect(page).toHaveURL(/\/cnv_expiryClock$/);
  await expect(page.locator('.react-flow__edge[data-id="edg_runningPaused"]')).toBeVisible();
  // A click on the middle of its route selects it (the rest of its box is the canvas's).
  const route = page.locator('.react-flow__edge[data-id="edg_runningPaused"] .react-flow__edge-interaction');
  const middle = await route.evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = path.getScreenCTM();
    return { x: screen.a * point.x + screen.e, y: screen.d * point.y + screen.f };
  });
  await page.mouse.click(middle.x, middle.y);
  await expect(page.getByText("Selected: verify.started")).toBeAttached();
  await page.keyboard.press("Delete");
  await page.getByRole("button", { name: /problems$/ }).click();
  const problems = page.getByRole("dialog", { name: "Problems" });
  const diverged = problems.getByText('Scenario "The clock pauses" goes elsewhere at step 1: it reaches other states');
  await expect(diverged).toBeVisible();

  // Its row opens the scenario at that step; the new path is accepted, and Problems no longer report it.
  await diverged.click();
  await expect(panel(page).getByText("Recorded: paused · Now: running")).toBeVisible();
  await panel(page).getByRole("button", { name: "Accept the new path" }).click();
  await expect(problems.getByText(/The clock pauses/)).toHaveCount(0);
});

test("runs a flow: its input, a question whether a call worked, its tokens, and how it ends", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payout batch/ }).click();
  await page.waitForURL(/\/p\/prj_payoutBatch$/);
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
  await page.goto("/p/prj_payoutBatch/cnv_payOutBatch");
  await expect(page.locator(".react-flow__node-node").first()).toBeVisible();
  await page.getByRole("button", { name: "Simulate" }).click();
  await panel(page)
    .getByLabel("Input")
    .fill(JSON.stringify({ payouts: [{ amount: 120, id: "pay_1", rail: "pix" }] }));
  await panel(page).getByRole("button", { name: "Start" }).click();
  await expect(panel(page).getByRole("heading", { name: "Did send a Pix work?" })).toBeVisible();
  await page.keyboard.press("1");
  await expect(now(page)).toContainText("the bank confirms");
  await expect(now(page)).toContainText("waiting");
  await move(page, "bank.confirmed").click();
  await expect(now(page)).toContainText("Ended in success");
});

test("simulates in a read-only tab, which says why it cannot save", async ({ page, context }) => {
  await openPayments(page, "cnv_lifecycle");
  const second = await context.newPage();
  await second.goto("/p/prj_payments/cnv_lifecycle");
  await expect(second.getByText(/read-only/).first()).toBeVisible();
  await startLifecycle(second);
  await move(second, "verify.started").click();
  await expect(panel(second).getByRole("button", { name: "Save as scenario…" })).toBeDisabled();
  await expect(
    panel(second).getByText("This tab is read-only: scenarios are saved in the tab that edits the project.")
  ).toBeVisible();
});
