// A Problems marker's details: resting the pointer on the red, amber or grey marker of a box or an edge shows that
// element's Problems beside it — what each severity means, the rule linked to the guide — and Show in Problems opens
// the panel on the element; they go on Esc, when the pointer leaves and when the view moves.
import { expect, test } from "@playwright/test";

import { paymentsWithProblems } from "./fixtures/problems.js";

test("shows a box's Problems when the pointer rests on its marker, and opens the panel on it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.goto("/p/prj_payments/cnv_lifecycle");
  const marker = page.locator('.react-flow__node[data-id="nod_complianceHold"] .problem-marker');
  await expect(marker).toHaveAttribute("data-severity", "incomplete");
  const details = page.getByRole("dialog", { name: "Problems on compliance_hold" });

  await marker.hover();
  await expect(details).toBeVisible();
  const [problem] = await details.getByRole("listitem").all();
  await expect(details.getByRole("listitem")).toHaveCount(1);
  await expect(problem.getByText("Incomplete", { exact: true })).toBeVisible();
  await expect(
    problem.getByText("Not an error: this level shows only some of its transitions, so the rule only reminds you.")
  ).toBeVisible();
  await expect(problem.getByText(/^State "compliance_hold" has no way out/)).toBeVisible();
  const rule = problem.getByRole("link", { name: "What machine.stuck means (opens in a new tab)" });
  await expect(rule).toHaveAttribute("href", /\/readme#rule-machine\.stuck$/);
  // Beside the marker, inside the window.
  const [shown, at, room] = [await details.boundingBox(), await marker.boundingBox(), page.viewportSize()];
  expect(shown.x >= at.x + at.width || shown.x + shown.width <= at.x).toBe(true);
  expect(shown.x).toBeGreaterThanOrEqual(0);
  expect(shown.x + shown.width).toBeLessThanOrEqual(room.width);
  expect(shown.y + shown.height).toBeLessThanOrEqual(room.height);

  // The pointer goes onto them: they stay. Esc closes them, and does nothing else.
  await details.hover();
  await page.waitForTimeout(400);
  await expect(details).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(page).toHaveURL(/\/cnv_lifecycle$/);

  // Leaving the marker for the canvas, or moving the view, they go.
  await marker.hover();
  await expect(details).toBeVisible();
  await page.mouse.move(8, 600);
  await expect(details).toHaveCount(0);
  await marker.hover();
  await expect(details).toBeVisible();
  await page.mouse.wheel(0, 80);
  await expect(details).toHaveCount(0);

  // Show in Problems: the panel, open on the box's line.
  await page.mouse.move(8, 600);
  await marker.hover();
  await details.getByRole("button", { name: "Show in Problems" }).click();
  await expect(details).toHaveCount(0);
  const panel = page.getByRole("dialog", { name: "Problems" });
  await expect(panel.locator('[data-testid="problems-row"][aria-current="true"]')).toHaveCount(1);
  await expect(panel.locator('[aria-current="true"]')).toContainText('State "compliance_hold" has no way out');
  await expect(panel.locator('[aria-current="true"]')).toBeInViewport();
});

test("shows an edge's Problems from its marker: incomplete, and an error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Open file…").setInputFiles(await paymentsWithProblems());
  await expect(page).toHaveURL(/\/p\/prj_payments$/);
  await page.goto("/p/prj_payments/cnv_expiryClock");
  await expect(page.locator('.react-flow__node[data-id="nod_running"]')).toBeVisible();
  const details = page.getByTestId("canvas-problem");

  // An edge's marker takes the pointer through its hit area, above every edge.
  const incomplete = page.locator('.problem-marker[data-target="edg_runningPaused"]');
  await expect(page.locator('.react-flow__edge[data-id="edg_runningPaused"] [data-severity]')).toHaveAttribute(
    "data-severity",
    "incomplete"
  );
  await incomplete.hover();
  await expect(details).toBeVisible();
  await expect(details).toHaveAccessibleName("Problems on running → paused");
  await expect(details.getByText("Incomplete", { exact: true })).toBeVisible();
  await expect(
    details.getByText("Not an error: a reminder of what is still to be decided or specified.")
  ).toBeVisible();
  await expect(details.getByText(/does not say what triggers it$/)).toBeVisible();
  await expect(details.getByRole("link", { name: /^What transition\.noTrigger means/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);

  const error = page.locator('.problem-marker[data-target="edg_pausedStopped"]');
  await expect(page.locator('.react-flow__edge[data-id="edg_pausedStopped"] [data-severity]')).toHaveAttribute(
    "data-severity",
    "error"
  );
  await error.hover();
  await expect(details).toBeVisible();
  await expect(details.getByText("Error", { exact: true })).toBeVisible();
  await expect(details.getByText(/which cannot be a target$/)).toBeVisible();
  await expect(details.getByText(/^Not an error/)).toHaveCount(0);
  await expect(details.getByRole("link", { name: /^What edge\.target means/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
});

test("lets the pointer reach every edge's marker, even where an edge meets a box", async ({ page }) => {
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
    // Each edge unsure of itself: an incomplete Problem, and a marker, on every edge of the level.
    const applied = await page.evaluate(
      ([canvasId, edgeIds]) =>
        globalThis.statewright.call("batch.apply", {
          label: `Every edge of ${canvasId} to verify`,
          commands: edgeIds.map(id => ({ type: "edge.update", args: { id, set: { confidence: "low" } } }))
        }),
      [canvas, ids]
    );
    expect(applied.error ?? null, canvas).toBeNull();
    for (const id of ids) {
      const marker = page.locator(`.react-flow__edge[data-id="${id}"] [data-severity]`);
      await expect(marker, id).toHaveCount(1);
      const reached = await marker.evaluate((element, edge) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        const hit = document.elementFromPoint(x + width / 2, y + height / 2);
        const reached = hit?.closest(".problem-marker")?.dataset.target === edge;
        return reached ? "marker" : (hit?.className?.baseVal ?? hit?.className ?? hit?.tagName);
      }, id);
      expect(reached, id).toBe("marker");
    }
    // And resting on it shows its Problems.
    const last = ids.at(-1);
    await page.mouse.move(0, 0);
    const box = await page.locator(`.react-flow__edge[data-id="${last}"] [data-severity]`).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId("canvas-problem")).toContainText("has low confidence; verify it");
    await page.keyboard.press("Escape");
  }
});
