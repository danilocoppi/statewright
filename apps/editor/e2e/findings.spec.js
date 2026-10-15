// A finding badge's details: resting the pointer on a badge shows its findings beside it, whole; they stay while the
// pointer is on them, and go on Esc, when the pointer leaves, and when the view moves.
import { expect, test } from "@playwright/test";

import { getPaidWithFindings } from "./fixtures/findings.js";

test("shows a badge's findings when the pointer rests on it, and closes them with Esc", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Open file…").setInputFiles(await getPaidWithFindings());
  await expect(page).toHaveURL(/\/p\/prj_getPaid$/);
  await page.goto("/p/prj_getPaid/cnv_transaction");
  const badge = page.locator('.react-flow__node[data-id="nod_processing"] .badge');
  await expect(badge).toHaveAttribute("data-codes", "H1 L4 diverged");
  const details = page.getByRole("dialog", { name: "Findings on processing" });

  await badge.hover();
  await expect(details).toBeVisible();
  await expect(details.getByRole("listitem")).toHaveCount(3);
  const audit = details.getByRole("listitem").first();
  await expect(audit.getByText("High", { exact: true })).toBeVisible();
  await expect(audit.getByRole("heading", { name: "advanceStatus trusts its callers" })).toBeVisible();
  await expect(audit.getByText(/^Eight call sites move transactions/)).toBeVisible();
  await expect(audit.getByText("core.js:34-52")).toBeVisible();
  await expect(audit.getByText("Payout runbook")).toBeVisible();
  // Beside the badge, inside the window.
  const [shown, at, room] = [await details.boundingBox(), await badge.boundingBox(), page.viewportSize()];
  expect(shown.x >= at.x + at.width || shown.x + shown.width <= at.x).toBe(true);
  expect(shown.x).toBeGreaterThanOrEqual(0);
  expect(shown.x + shown.width).toBeLessThanOrEqual(room.width);
  expect(shown.y + shown.height).toBeLessThanOrEqual(room.height);

  // The pointer goes onto them: they stay, and their words can be selected.
  await details.hover();
  await page.waitForTimeout(400);
  await expect(details).toBeVisible();
  await audit.getByText(/^Eight call sites/).dblclick();
  // A double-click selects the word under the pointer, in the middle of the description.
  expect(await page.evaluate(() => getSelection().toString().trim())).toMatch(/^[a-z]+$/);
  await expect(details).toBeVisible();

  // Esc closes them, and does nothing else: the level is still shown.
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(page).toHaveURL(/\/cnv_transaction$/);

  // Leaving the badge for the canvas, or moving the view, they go.
  await badge.hover();
  await expect(details).toBeVisible();
  await page.mouse.move(8, 600);
  await expect(details).toHaveCount(0);
  await badge.hover();
  await expect(details).toBeVisible();
  await page.mouse.wheel(0, 80);
  await expect(details).toHaveCount(0);

  // "Show in the inspector": the box selected, the inspector on its details, where its findings are.
  await page.mouse.move(8, 600);
  await badge.hover();
  await details.getByRole("button", { name: "Show in the inspector" }).click();
  await expect(details).toHaveCount(0);
  const inspector = page.getByRole("dialog", { name: "Inspector" });
  await expect(inspector.getByRole("button", { name: "Hide details" })).toBeVisible();
  await expect(inspector.getByRole("button", { name: /A retried payout is still processing/ })).toBeVisible();
});

test("shows an edge's findings from its badge too", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.goto("/p/prj_payments/cnv_expiryClock");
  await expect(page.locator('.react-flow__node[data-id="nod_running"]')).toBeVisible();
  await page.evaluate(() =>
    globalThis.statewright.call("batch.apply", {
      label: "A finding on an edge",
      commands: [
        {
          type: "finding.upsert",
          args: {
            id: "fnd_T1",
            finding: {
              code: "T1",
              title: "The clock never resumes",
              severity: "medium",
              targets: ["edg_runningPaused"]
            }
          }
        }
      ]
    })
  );
  // An edge's badge takes the pointer through its hit area, above every edge.
  const badge = page.locator('.badge-hit[data-target="edg_runningPaused"]');
  await badge.hover();
  const details = page.getByTestId("canvas-finding");
  await expect(details).toBeVisible();
  await expect(details.getByText("Medium", { exact: true })).toBeVisible();
  await expect(details.getByRole("heading", { name: "The clock never resumes" })).toBeVisible();
});

test("lets the pointer reach every edge's badge, even where an edge meets a box", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Get paid/ }).click();
  await page.waitForURL(/\/p\/prj_getPaid$/);
  for (const canvas of ["cnv_transaction", "cnv_open"]) {
    await page.goto(`/p/prj_getPaid/${canvas}`);
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
    const answer = await page.evaluate(
      canvasId => globalThis.statewright.call("level.get", { canvas: canvasId }),
      canvas
    );
    const ids = (answer.result ?? answer).edges.map(edge => edge.id);
    const applied = await page.evaluate(
      ([canvasId, edgeIds]) =>
        globalThis.statewright.call("batch.apply", {
          label: `Findings on every edge of ${canvasId}`,
          commands: edgeIds.map((id, index) => ({
            type: "finding.upsert",
            args: {
              id: `fnd_${canvasId.slice(4)}${index}`,
              finding: { code: `E${index}`, title: `About ${id}`, severity: "low", targets: [id] }
            }
          }))
        }),
      [canvas, ids]
    );
    expect(applied.error ?? null, canvas).toBeNull();
    for (const id of ids) {
      const badge = page.locator(`.badge[data-target="${id}"]`);
      await expect(badge, id).toHaveCount(1);
      const reached = await badge.evaluate(element => {
        const { x, y, width, height } = element.getBoundingClientRect();
        const hit = document.elementFromPoint(x + width / 2, y + height / 2);
        const reached = element.contains(hit) || hit?.closest(".badge-hit")?.dataset.target === element.dataset.target;
        return reached ? "badge" : (hit?.className?.baseVal ?? hit?.className ?? hit?.tagName);
      });
      expect(reached, id).toBe("badge");
    }
    // And resting on it shows its findings.
    const last = ids.at(-1);
    await page.mouse.move(0, 0);
    const box = await page.locator(`.badge[data-target="${last}"]`).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId("canvas-finding")).toContainText(`About ${last}`);
    await page.keyboard.press("Escape");
  }
});
