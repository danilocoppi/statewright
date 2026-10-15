// Mixed levels, plan M4 (spec §4.4): on a flow, a call dragged onto a participant is performed by its party; an emit
// step dragged onto a state guest leads there, asking which event when several do.
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

/** Drag from a box's handle onto another box. */
async function drag(page, from, to) {
  await from.hover();
  const start = await middle(from.locator(".react-flow__handle-right"));
  const end = await middle(to);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y + 10, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
}

test("a call is performed by a participant; an emit leads to a state of a machine", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Flow/ }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Checkout");
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByTestId("canvas")).toBeVisible();
  const flow = (await agent(page, "document.get")).result.document.root;
  const added = await agent(page, "batch.apply", {
    label: "Checkout",
    commands: [
      {
        type: "catalog.add",
        args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
      },
      { type: "catalog.add", args: { collection: "events", id: "evt_paid", item: { name: "order.paid" } } },
      { type: "catalog.add", args: { collection: "events", id: "evt_captured", item: { name: "payment.captured" } } },
      { type: "catalog.add", args: { collection: "events", id: "evt_noted", item: { name: "order.noted" } } },
      {
        type: "catalog.add",
        args: { collection: "endpoints", id: "ept_pay", item: { name: "Pay", method: "POST", path: "/pay" } }
      },
      {
        type: "node.add",
        args: { canvas: flow, id: "nod_call", node: { kind: "call", endpoint: "ept_pay", name: "Charge" } }
      },
      {
        type: "node.add",
        args: { canvas: flow, id: "nod_tell", node: { kind: "emit", event: "evt_noted", name: "Tell" } }
      },
      {
        type: "node.add",
        args: { canvas: flow, id: "nod_payments", node: { kind: "participant", party: "pty_payments" } }
      }
    ]
  });
  expect(added.ok).toBe(true);
  // A machine whose `paid` two events lead to (a level of its own), and the state guest for it.
  const states = await agent(page, "batch.apply", {
    label: "States",
    commands: [
      { type: "canvas.create", args: { kind: "machine", name: "Order lifecycle", id: "cnv_life" } },
      { type: "node.add", args: { canvas: "cnv_life", id: "nod_open", node: { kind: "state", name: "open" } } },
      { type: "node.add", args: { canvas: "cnv_life", id: "nod_paid", node: { kind: "state", name: "paid" } } },
      {
        type: "edge.add",
        args: {
          canvas: "cnv_life",
          id: "edg_paid",
          edge: { from: "nod_open", to: "nod_paid", on: ["evt_paid", "evt_captured"] }
        }
      },
      { type: "node.add", args: { canvas: flow, id: "nod_paidHere", node: { kind: "state", target: "nod_paid" } } }
    ]
  });
  expect(states.ok).toBe(true);
  await page.getByRole("button", { name: "Auto-layout" }).click();

  await drag(page, box(page, "Charge"), box(page, "Payments"));
  await expect(role(page, "performs")).toHaveCount(1);

  await drag(page, box(page, "Tell"), box(page, "paid"));
  const which = page.getByRole("dialog", { name: "Which event leads to paid?" });
  await which.getByRole("option", { name: "order.paid" }).click();
  await expect(role(page, "leadsTo")).toHaveCount(1);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(role(page, "leadsTo")).toHaveCount(0);
});
