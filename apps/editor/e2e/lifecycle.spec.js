// Mixed levels, plan M3 (spec §4.3): a lifecycle on a system level, open as a frame; a service dragged onto one of its
// transitions drives it, asking first whom the service acts for.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
const role = (page, name) => page.locator(`[data-testid="canvas-association"][data-role="${name}"]`);
const agent = (page, name, args) =>
  page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);

/** The middle of an element on the screen, once the view has stopped moving. */
async function middle(locator) {
  let last = null;
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await locator.boundingBox());
        const still = now === last;
        last = now;
        return still;
      },
      { intervals: [120] }
    )
    .toBe(true);
  const { x, y, width, height } = JSON.parse(last);
  return { x: x + width / 2, y: y + height / 2 };
}

test("a service drives a transition of a lifecycle framed on the system", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^System/ }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Shop");
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByTestId("canvas")).toBeVisible();

  // The lifecycle, from the Machine tab: a store named Order with a machine inside, open as a frame.
  await page.keyboard.press("2");
  await page.getByRole("button", { name: "Lifecycle", exact: true }).click();
  const area = await page.getByTestId("canvas").boundingBox();
  await page.mouse.click(area.x + area.width / 2 + 120, area.y + area.height / 2);
  await page.keyboard.type("Order");
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__node-frame", { hasText: "Order" })).toBeVisible();

  // A transition inside it, and a service beside it, through the page's agent interface.
  const doc = (await agent(page, "document.get")).result.document;
  const shop = doc.root;
  const order = Object.entries(doc.canvases).find(([, canvas]) => canvas.kind === "machine")[0];
  const first = Object.entries(doc.canvases[order].nodes).find(([, node]) => node.kind === "state")[0];
  const added = await agent(page, "batch.apply", {
    label: "Paying",
    commands: [
      { type: "catalog.add", args: { collection: "events", id: "evt_paid", item: { name: "order.paid" } } },
      {
        type: "node.add",
        args: { canvas: order, id: "nod_paid", node: { kind: "state", name: "Paid", terminal: true } }
      },
      {
        type: "edge.add",
        args: { canvas: order, id: "edg_paid", edge: { from: first, to: "nod_paid", on: ["evt_paid"] } }
      },
      { type: "node.add", args: { canvas: shop, id: "nod_payments", node: { kind: "service", name: "Payments" } } }
    ]
  });
  expect(added.ok).toBe(true);
  await page.getByRole("button", { name: "Auto-layout" }).click();
  await expect(page.locator(".react-flow__edge", { hasText: "order.paid" })).toBeVisible();

  // Payments onto the transition's label: it asks whom Payments acts for; a new party named Payments.
  const payments = box(page, "Payments");
  await payments.hover();
  const start = await middle(payments.locator(".react-flow__handle-right"));
  const target = await middle(page.locator(".react-flow__edge", { hasText: "order.paid" }).locator("g.label"));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y + 10, { steps: 4 });
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
  const whom = page.getByRole("dialog", { name: "Whom does Payments act for?" });
  await expect(whom.getByRole("combobox")).toHaveValue("Payments");
  await page.keyboard.press("Enter");
  await expect(role(page, "drives")).toHaveCount(1);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(role(page, "drives")).toHaveCount(0);
});
