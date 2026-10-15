// Plan E1's "done when" (spec §13): a file can be imported (intact, changed, invalid), listed, saved to a file and
// exported — in a real browser.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { parse, verify } from "statewright";
import { toSVG } from "statewright/render";

const EXAMPLES = resolve(import.meta.dirname, "../../../examples");
const exampleText = name => readFileSync(resolve(EXAMPLES, `${name}.statewright.json`), "utf8");

/** The example's text after a hand edit, so its signature no longer matches. */
function edited(name, edit) {
  const raw = JSON.parse(exampleText(name));
  edit(raw);
  return JSON.stringify(raw, null, 2);
}

async function importFile(page, text, name) {
  await page.getByLabel("Open file…").setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(text) });
}

/** The text of a download started by `action`. */
async function download(page, action) {
  const [file] = await Promise.all([page.waitForEvent("download"), action()]);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  return { name: file.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

// Playwright cannot answer the system's file dialogs, so saving takes the download path.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });
});

test("imports an intact file, lists it, and exports the level as exactly Core's SVG", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/No projects yet/)).toBeVisible();
  await importFile(page, exampleText("payments"), "payments.statewright.json");
  await expect(page).toHaveURL(/\/p\/prj_payments$/);
  await expect(page.getByTestId("canvas").locator(".react-flow__node-node").first()).toBeVisible();

  await page.getByRole("button", { name: "Export" }).click();
  const svg = await download(page, () => page.getByRole("menuitem", { name: /Image \(SVG\)/ }).click());
  const doc = parse(exampleText("payments")).doc;
  expect(svg.name).toBe("payments-runtime.svg");
  expect(svg.bytes.toString("utf8")).toBe(await toSVG(doc, doc.root));

  await page.getByRole("link", { name: "Back to projects" }).click();
  await expect(page.getByRole("heading", { name: "Payments", level: 3 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Payments", level: 3 })).toBeVisible();
});

test("reviews a file changed outside Statewright, imports it signed, and saves it to a file", async ({ page }) => {
  await page.goto("/");
  await importFile(
    page,
    edited("get-paid-as-built", raw => (raw.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting")),
    "get-paid.statewright.json"
  );
  const dialog = page.getByRole("dialog", { name: "This file was changed outside Statewright" });
  await expect(dialog).toContainText("Content");
  await dialog.getByRole("button", { name: "Import and sign" }).click();
  await expect(page).toHaveURL(/\/p\/prj_getPaid$/);

  await page.getByRole("button", { name: /^Get paid \(as built\)/ }).click();
  const saved = await download(page, () => page.getByRole("menuitem", { name: "Save to file" }).click());
  expect(saved.name).toBe("get-paid-as-built.statewright.json");
  const result = parse(saved.bytes.toString("utf8"));
  expect(result.ok).toBe(true);
  expect(result.doc.canvases.cnv_open.nodes.nod_awaitingPayment.name).toBe("waiting");
  expect(await verify(result.doc)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  await expect(page.getByText("Downloaded get-paid-as-built.statewright.json")).toBeVisible();
});

test("refuses a file that is not a Statewright document and imports nothing", async ({ page }) => {
  await page.goto("/");
  await importFile(page, "these are not the droids", "notes.json");
  const dialog = page.getByRole("dialog", { name: "This file can't be opened" });
  await expect(dialog).toContainText("Invalid JSON");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText(/No projects yet/)).toBeVisible();
});

test("exports the level as a PNG at twice its size", async ({ page }) => {
  await page.goto("/");
  await importFile(page, exampleText("get-paid-as-built"), "get-paid.statewright.json");
  await expect(page.getByTestId("canvas").locator(".react-flow__node-node").first()).toBeVisible();
  await page.getByRole("button", { name: "Export" }).click();
  const png = await download(page, () => page.getByRole("menuitem", { name: /Image \(PNG/ }).click());
  expect(png.name).toBe("get-paid-as-built-transaction.png");
  expect(png.bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  const doc = parse(exampleText("get-paid-as-built")).doc;
  const width = Number(/width="(\d+)"/.exec(await toSVG(doc, doc.root))[1]);
  expect(png.bytes.readUInt32BE(16)).toBe(width * 2);
});

test("opens a project read-only in a second tab until that tab takes over", async ({ page, context }) => {
  await page.goto("/");
  await importFile(page, exampleText("payments"), "payments.statewright.json");
  await expect(page.getByTestId("canvas")).toBeVisible();

  const second = await context.newPage();
  await second.goto("/p/prj_payments");
  const readOnly = "This project is open in another tab, so this one is read-only.";
  await expect(second.getByText(readOnly)).toBeVisible();
  await second.getByRole("button", { name: "Edit here" }).click();
  await expect(second.getByText(readOnly)).toBeHidden();
  await expect(page.getByText(readOnly)).toBeVisible();
});
