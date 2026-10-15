// Plan E5 (spec §13: "the app builds to a static folder"): the app built to live under a path (VITE_BASE_URL) works
// there — its pages, its workers, a deep link, the guide and the files it links to.
import { expect, test } from "@playwright/test";

const HERE = "http://localhost:4174/statewright/";

test("works under the platform's path: projects, a level arranged by its worker, a deep link and the guide", async ({
  page,
  request
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await expect(page).toHaveURL(`${HERE}p/prj_payments`);
  await expect(page.locator('.react-flow__node[data-id="nod_commandApi"]')).toBeVisible();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.goto("p/prj_payments/cnv_lifecycle");
  await expect(page.locator('.react-flow__node[data-id="nod_complianceHold"]')).toBeVisible();

  await page.goto("readme#reading-a-diagram");
  const figure = page.getByRole("figure").first().locator("img");
  await expect(figure).toBeVisible();
  expect(await figure.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Back to projects" }).first().click();
  await expect(page).toHaveURL(HERE);

  const readme = await (await request.get("README.md")).text();
  expect(readme).toContain(`](${HERE}guide/payments/cnv_runtime.svg)`);
  expect(await (await request.get("llms.txt")).text()).toContain(`(${HERE}README.md)`);
  expect(await (await request.get("_redirects")).text()).toBe("/statewright/* /statewright/index.html 200\n");
});
