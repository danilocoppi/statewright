// Source-of-truth spec §2 and §10, in a real browser: a bug planted in the fixture system becomes a finding on the
// transition it breaks — `statewright conform --write` keeps it in the design, and the Editor shows it on the canvas.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { parse } from "statewright";
import { runVectors, writeResults } from "statewright/conform";
import { toContract } from "statewright/contract";

import { bookingsDriver } from "../../../packages/core/test/fixtures/bookings-api/driver.js";

const BOOKINGS = resolve(import.meta.dirname, "../../../examples/bookings.statewright.json");
const CLI = resolve(import.meta.dirname, "../../../packages/core/src/cli/bin.js");

test("shows on the canvas the finding statewright conform wrote for a planted bug", async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), "statewright-conform-"));
  const design = join(dir, "bookings.statewright.json");
  copyFileSync(BOOKINGS, design);
  const { contract } = await toContract(parse(readFileSync(BOOKINGS, "utf8")).doc);
  const results = await runVectors(contract, bookingsDriver({ plantedBug: true }), { only: "booking.status" });
  await writeResults(join(dir, "results.json"), results);
  const conform = spawnSync(process.execPath, [CLI, "conform", design, join(dir, "results.json"), "--write"], {
    encoding: "utf8"
  });
  expect(conform.status).toBe(1);

  await page.goto("/");
  await page.getByLabel("Open file…").setInputFiles({
    name: "bookings.statewright.json",
    mimeType: "application/json",
    buffer: readFileSync(design)
  });
  await expect(page).toHaveURL(/\/p\/prj_bookings$/);
  await page.goto("/p/prj_bookings/cnv_booking");
  const seated = page.locator('.react-flow__edge[data-id="edg_confirmedSeated"]');
  await expect(seated).toContainText("guest.arrived");
  await expect(seated).toContainText("diverged");

  // A click on the middle of its route selects it; the inspector's details read the finding.
  const route = seated.locator(".react-flow__edge-interaction");
  const middle = await route.evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = path.getScreenCTM();
    return { x: screen.a * point.x + screen.e, y: screen.d * point.y + screen.f };
  });
  await page.mouse.click(middle.x, middle.y);
  await page.getByRole("dialog", { name: "Inspector" }).getByRole("button", { name: "Show details" }).click();
  await expect(
    page.getByText(
      'Scenario "A confirmed guest is seated", step 2 (guest.arrived): the design expects seated; the code is in confirmed'
    )
  ).toBeVisible();
});
