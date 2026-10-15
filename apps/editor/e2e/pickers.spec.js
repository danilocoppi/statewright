// The browser's own file pickers, which the other tests replace: Chrome checks the options before it opens one, and
// refuses an extension longer than 16 characters, so Open file and Save to file must ask with options it accepts.
// Headless, an accepted picker is dismissed at once (AbortError); refused options reject with a TypeError.
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    for (const name of ["showOpenFilePicker", "showSaveFilePicker"]) {
      const real = window[name];
      window[name] = (...args) => {
        window.__asked = [...(window.__asked ?? []), args[0]];
        return real.apply(window, args).catch(error => {
          window.__pickers = [...(window.__pickers ?? []), `${name}: ${error.name}`];
          throw error;
        });
      };
    }
  });
});

test("opens Chrome's file pickers for Open file and Save to file", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByTestId("projects-open-file").click();
  await expect.poll(() => page.evaluate(() => window.__pickers)).toEqual(["showOpenFilePicker: AbortError"]);

  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await page.getByTestId("project-menu").click();
  await page.getByTestId("project-menu-save").click();
  await expect
    .poll(() => page.evaluate(() => window.__pickers))
    .toEqual(["showOpenFilePicker: AbortError", "showSaveFilePicker: AbortError"]);
  // Chrome took a .sttw, and a .json (files saved before 0.1.5 end in .statewright.json), under a MIME type.
  const types = { description: "Statewright document" };
  expect(await page.evaluate(() => window.__asked)).toEqual([
    { types: [{ ...types, accept: { "application/json": [".sttw", ".json"] } }], multiple: false },
    { suggestedName: "payments.sttw", types: [{ ...types, accept: { "application/json": [".sttw"] } }] }
  ]);
  expect(errors).toEqual([]);
});
