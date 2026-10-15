// Plan E4's "done when" (spec §13: every field of format 1.0 is editable somewhere in the UI): in a real browser, a
// person describes a state in plain words and in Details, connects it from the keyboard, builds a type in the catalog,
// finds a box on another level with ⌘K and turns a reusable part into its own copy — and it is all kept. A long path of
// evidence is cut short, clear of its remove button.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
const edge = (page, text) => page.locator(".react-flow__edge", { hasText: text });
const inspector = page => page.getByRole("dialog", { name: "Inspector" });

test("describes a state in plain words and in Details, and connects it from the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^State machine/ }).click();
  const create = page.getByRole("dialog", { name: "New project" });
  await create.getByRole("textbox", { name: "Name" }).fill("Refunds");
  await create.getByRole("button", { name: "Create project" }).click();
  const first = box(page, "First state");
  await expect(first).toBeVisible();

  // Basics: what a reviewer understands — a description, what happens here (the box shows it at once).
  await first.click();
  const panel = inspector(page);
  await expect(panel.getByText("State in Refunds")).toBeVisible();
  await panel.getByRole("textbox", { name: "Description" }).fill("The refund was asked for.");
  await panel.getByRole("radio", { name: "On hold" }).click();
  await expect(first.getByText("HOLD")).toBeVisible();

  // A transition from the keyboard, to the state itself, with a new event.
  await panel.getByRole("button", { name: "Add a transition" }).click();
  await page.keyboard.type("First");
  await page.keyboard.press("Enter");
  const when = page.getByRole("dialog", { name: "When does First state go to First state?" });
  await when.getByRole("combobox", { name: "Event" }).fill("refund.retried");
  await page.keyboard.press("Enter");
  await expect(edge(page, "refund.retried")).toBeVisible();

  // Details: provenance and a tag.
  await first.click();
  await panel.getByRole("button", { name: "Show details" }).click();
  await panel.getByRole("radio", { name: "Legacy" }).click();
  await panel.getByRole("textbox", { name: "Add a tag" }).fill("pix");
  await page.keyboard.press("Enter");
  await expect(first.getByText("LEGACY")).toBeVisible();

  // Kept after a reload.
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await box(page, "First state").click();
  await expect(inspector(page).getByRole("button", { name: "pix", exact: true })).toBeVisible();
  await inspector(page).getByRole("button", { name: "Hide details" }).click();
  await expect(inspector(page).getByRole("textbox", { name: "Description" })).toHaveValue("The refund was asked for.");
});

test("builds a type in the catalog and reads its JSON Schema, then finds a box on another level with ⌘K", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_/);
  await expect(box(page, "Scheduler")).toBeVisible();

  // The catalog: a new object type with a field, and the JSON Schema exported from it.
  await page.keyboard.press("g");
  const sheet = page.getByRole("dialog", { name: "Catalog" });
  await sheet.getByRole("button", { name: /^Types/ }).click();
  await sheet.getByRole("button", { name: "New type" }).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Refund");
  await sheet.getByRole("button", { name: "Add a field" }).click();
  const field = sheet.getByRole("textbox", { name: "Field name" }).last();
  await field.fill("amount");
  await field.press("Enter");
  await sheet.getByRole("button", { name: "Type of amount: string" }).click();
  await page.keyboard.type("decimal");
  await sheet.getByRole("option", { name: /^decimal/ }).click();
  await sheet.getByRole("tab", { name: "JSON Schema" }).click();
  const schema = sheet.getByLabel("Exported from the fields");
  await expect(schema).toContainText('"title": "Refund"');
  await expect(schema).toContainText('"amount"');
  await page.keyboard.press("Escape");

  // ⌘K: a state of the lifecycle engine, shown on its level, selected; its interior detached into its own copy.
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("compliance_h");
  await page.keyboard.press("Enter");
  await page.waitForURL(/cnv_lifecycle/);
  const panel = inspector(page);
  await expect(panel.getByText("State in Lifecycle engine")).toBeVisible();
  await panel.getByRole("button", { name: "Show details" }).click();
  await expect(panel.getByText("Reusable part, used once")).toBeVisible();
  await panel.getByRole("button", { name: "Detach this use" }).click();
  await expect(panel.getByRole("button", { name: "Make reusable" })).toBeVisible();
});

test("shows a box found with ⌘K on its own level, clear of the inspector", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_/);
  await expect(box(page, "Scheduler")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await page.keyboard.type("completed");
  await page.keyboard.press("Enter");
  await page.waitForURL(/cnv_crossBorderSend/);
  const panel = inspector(page);
  await expect(panel.getByText("State in Cross-border send")).toBeVisible();
  // Once the view is still, the box is on the screen and left of the island.
  const completed = page.locator('.react-flow__node[data-id="nod_completed"]');
  await expect
    .poll(async () => {
      const [shown, island] = [await completed.boundingBox(), await panel.boundingBox()];
      return Boolean(shown && island && shown.x >= 0 && shown.x + shown.width <= island.x);
    })
    .toBe(true);
});

test("cuts a long path of evidence short, whole on hover, clear of its remove button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_/);
  await box(page, "Scheduler").click();
  const panel = inspector(page);
  await panel.getByRole("button", { name: "Show details" }).click();
  await panel.getByRole("button", { name: "In code" }).click();
  const long = "Modules/module-email-sync/src/innerRoutes.js";
  await page.keyboard.type(long);
  await page.keyboard.press("Enter");
  const path = panel.getByTitle(long);
  await expect(path).toHaveText(long);
  const remove = await panel.getByRole("button", { name: `Take out ${long}` }).boundingBox();
  const shown = await path.boundingBox();
  const island = await panel.boundingBox();
  expect(shown.x + shown.width).toBeLessThanOrEqual(remove.x);
  // The remove button stays inside the inspector, within its 16 px of air.
  expect(remove.x + remove.width).toBeLessThanOrEqual(island.x + island.width - 16);
  expect(await path.evaluate(span => span.scrollWidth > span.clientWidth)).toBe(true);
  expect(await path.evaluate(span => getComputedStyle(span).textOverflow)).toBe("ellipsis");
});
