// Following a link (a `ref` box): a double-click, Enter or its go-to mark goes where it leads — a box on another level
// shown, selected and ringed by the beacon, a level opened, a catalog item shown in the catalog — and Esc or the
// browser's Back return to the link.
import { expect, test } from "@playwright/test";

import { acmeBillingWithLinks } from "./fixtures/links.js";

const box = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
const levels = page => page.getByTestId("levels-breadcrumb").getByRole("link");

/** Acme Billing, open on its issuing level (inside the issued state, inside the invoicing service). */
async function openIssuing(page, options) {
  await page.goto("/");
  await page.getByLabel("Open file…").setInputFiles(await acmeBillingWithLinks(options));
  await expect(page).toHaveURL(/\/p\/prj_acmeBilling$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto("/p/prj_acmeBilling/cnv_issuing");
  await expect(box(page, "nod_toPaid")).toBeVisible();
}

test("follows a link to a state one level up, rings it, and comes back with Esc and with Back", async ({ page }) => {
  await openIssuing(page);
  const mark = box(page, "nod_toPaid").locator("[data-follow]");
  await expect(mark).toHaveAttribute("title", "Go to Paid");
  expect(await mark.evaluate(element => getComputedStyle(element).cursor)).toBe("pointer");

  await box(page, "nod_toPaid").dblclick();
  await expect(page).toHaveURL(/\/p\/prj_acmeBilling\/cnv_invoiceLifecycle$/);
  await expect(levels(page)).toHaveText(["", "Acme Billing", "Invoice lifecycle"]);
  await expect(page.getByTestId("levels-breadcrumb").locator('[aria-current="page"]')).toHaveText("Invoice lifecycle");
  const paid = box(page, "nod_paid");
  await expect(paid).toHaveClass(/\bselected\b/);
  await expect(paid).toHaveClass(/\bsw-beacon\b/);
  const ring = paid.locator(".sw-beacon-ring");
  await expect(ring).toBeVisible();
  expect(await ring.evaluate(element => getComputedStyle(element).animationName)).toContain("sw-beacon-wave");
  // Brought into view: in the middle of the canvas, or near it.
  const [at, room] = [await paid.boundingBox(), page.viewportSize()];
  expect(Math.abs(at.x + at.width / 2 - room.width / 2)).toBeLessThan(room.width / 4);
  // It rings for about 2 s, then goes; the state stays selected.
  await expect(paid).not.toHaveClass(/\bsw-beacon\b/, { timeout: 4000 });
  await expect(paid).toHaveClass(/\bselected\b/);

  // Esc clears the selection, then goes back to the link — not up a level.
  await page.keyboard.press("Escape");
  await expect(paid).not.toHaveClass(/\bselected\b/);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/cnv_issuing$/);
  await expect(box(page, "nod_toPaid")).toHaveClass(/\bselected\b/);

  // The browser's Back does the same.
  await box(page, "nod_toPaid").locator("[data-follow]").click();
  await expect(page).toHaveURL(/\/cnv_invoiceLifecycle$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/cnv_issuing$/);
  await expect(levels(page)).toHaveText(["", "Acme Billing", "Invoice lifecycle", "Issuing"]);
  await expect(box(page, "nod_toPaid")).toHaveClass(/\bselected\b/);
});

test("follows a link to a level with Enter, and one to a catalog item from its mark", async ({ page }) => {
  await openIssuing(page);
  await expect(box(page, "nod_toLedger").locator("[data-follow]")).toHaveAttribute("title", "Go to Post to the ledger");
  await box(page, "nod_toLedger").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/p\/prj_acmeBilling\/cnv_postToLedger$/);
  await expect(levels(page)).toHaveText(["", "Acme Billing", "Post to the ledger"]);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/cnv_issuing$/);

  const mark = box(page, "nod_toEvent").locator("[data-follow]");
  await expect(mark).toHaveAttribute("title", "Go to invoice.paid");
  await mark.click();
  const sheet = page.getByTestId("catalog-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[aria-current="true"]', { hasText: "invoice.paid" })).toBeVisible();
  await expect(page).toHaveURL(/\/cnv_issuing$/);
});

test("says so when what a link led to is gone, and goes nowhere", async ({ page }) => {
  await openIssuing(page, { gone: true });
  await expect(box(page, "nod_toArchive").locator("[data-follow]")).toHaveAttribute(
    "title",
    "What this link led to is no longer in the project."
  );
  await box(page, "nod_toArchive").dblclick();
  await expect(page.getByTestId("toast").filter({ hasText: "no longer in the project" })).toBeVisible();
  await expect(page).toHaveURL(/\/cnv_issuing$/);
  await expect(page.locator(".sw-beacon")).toHaveCount(0);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("rings what a link led to with a still ring instead of a pulse", async ({ page }) => {
    await openIssuing(page);
    await box(page, "nod_toPaid").dblclick();
    const ring = box(page, "nod_paid").locator(".sw-beacon-ring");
    await expect(ring).toBeVisible();
    const style = await ring.evaluate(element => {
      const { animationName, boxShadow, borderTopWidth } = getComputedStyle(element);
      return { animationName, boxShadow, borderTopWidth };
    });
    expect(style.animationName).toBe("none");
    expect(style.boxShadow).not.toBe("none");
    expect(style.borderTopWidth).toBe("2px");
    await expect(box(page, "nod_paid")).not.toHaveClass(/\bsw-beacon\b/, { timeout: 4000 });
  });
});
