// Plan D1 (documentation page spec §2: "Export → Documentation (HTML) downloads <project name>.html: one
// self-contained file that opens offline, makes no request, and shows every level's diagram"; "the contents follow the
// reading (the current section is marked)"): the menu item, and the page it downloads.
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { expect, test } from "@playwright/test";

test("exports the documentation as a page that opens offline, asks for nothing and marks what is read", async ({
  page,
  browser
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: /^Documentation \(HTML\)/ }).click()
  ]);
  expect(download.suggestedFilename()).toBe("payments.html");
  const file = join(mkdtempSync(join(tmpdir(), "statewright-docs-")), download.suggestedFilename());
  writeFileSync(file, readFileSync(await download.path()));

  // Offline, in a browser context of its own; any request it made would be counted.
  const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 900 } });
  const requests = [];
  context.on("request", request => !/^(file|data):/.test(request.url()) && requests.push(request.url()));
  await context.route("**/*", route =>
    /^(file|data):/.test(route.request().url()) ? route.continue() : route.abort()
  );
  const reader = await context.newPage();
  await reader.goto(pathToFileURL(file).href);
  await expect(reader.getByRole("heading", { level: 1, name: "Payments" })).toBeVisible();
  // Every level's diagram, as the Editor draws it.
  await expect(reader.locator("article.level figure.diagram svg")).toHaveCount(5);

  // Scrolling to a level marks it in the contents, and only it.
  const contents = reader.getByRole("navigation", { name: "Contents" });
  await reader.locator("#level-cnv_expiryClock").scrollIntoViewIfNeeded();
  await reader.evaluate(() => document.getElementById("level-cnv_expiryClock").scrollIntoView());
  await expect(contents.getByRole("link", { name: "Expiry clock" })).toHaveAttribute("aria-current", "true");
  await expect(contents.locator("[aria-current]")).toHaveCount(1);
  // A link in the contents takes the reader there, and the mark follows.
  await contents.getByRole("link", { name: "Events" }).click();
  await expect(contents.getByRole("link", { name: "Events" })).toHaveAttribute("aria-current", "true");

  // On paper: the document, even with a diagram open full size, and tables within the page however long a name.
  await reader.goto(`${pathToFileURL(file).href}#figure-cnv_expiryClock`);
  await reader.emulateMedia({ media: "print" });
  await expect(reader.locator("#figure-cnv_expiryClock")).not.toHaveCSS("position", "fixed");
  await expect(contents).toBeHidden();
  // A4's width: the names of every transition's ends as long as a name can be, without a break.
  await reader.setViewportSize({ width: 720, height: 1000 });
  const fits = await reader.evaluate(() => {
    const table = document.querySelector("#level-cnv_expiryClock table.transitions");
    for (const row of table.querySelectorAll("tbody tr"))
      for (const cell of [...row.cells].slice(0, 2))
        cell.textContent = "awaitingCorrespondentBankSettlementConfirmationAcknowledgement";
    return table.getBoundingClientRect().right <= document.querySelector(".content").getBoundingClientRect().right;
  });
  expect(fits).toBe(true);
  await reader.emulateMedia({ media: "screen" });

  // The fonts it shows are the ones it carries.
  expect(
    await reader.evaluate(() => document.fonts.load("16px Inter").then(() => document.fonts.check("16px Inter")))
  ).toBe(true);
  expect(requests).toEqual([]);
  await context.close();
});
