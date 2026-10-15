// Mixed levels, plan M2 (spec §4.1, §4.2, §6): on a machine, a participant is drawn onto the transition it sends, a
// state onto the participant that receives its action, an action's steps onto the state that runs them; each connector
// is one change Undo takes back, and Delete clears what it stands for.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
const role = (page, name) => page.locator(`[data-testid="canvas-association"][data-role="${name}"]`);

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

/** Drag from a box's handle to a point. */
async function dragFrom(page, from, to) {
  await from.hover();
  const start = await middle(from.locator(".react-flow__handle-right"));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 30, start.y + 10, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

/** Run the design through the page's agent interface (window.statewright), as a test of the Editor does. */
const agent = (page, name, args) =>
  page.evaluate(([name, args]) => globalThis.statewright.call(name, args), [name, args]);

test("draws who sends, who receives and where the steps run; undoes and deletes them", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^State machine/ }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Orders");
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(box(page, "First state")).toBeVisible();

  // A second state, a transition with an event, the customer, the payment service and the charge's steps.
  const { canvas } = (await agent(page, "editor.state")).result.level;
  const added = await agent(page, "batch.apply", {
    label: "The order",
    commands: [
      { type: "catalog.add", args: { collection: "events", id: "evt_pay", item: { name: "order.pay" } } },
      {
        type: "catalog.add",
        args: { collection: "parties", id: "pty_customer", item: { kind: "human", name: "Customer" } }
      },
      {
        type: "catalog.add",
        args: { collection: "parties", id: "pty_payments", item: { kind: "system", name: "Payments" } }
      },
      { type: "catalog.add", args: { collection: "actions", id: "act_charge", item: { name: "Charge card" } } },
      { type: "catalog.add", args: { collection: "actions", id: "act_notify", item: { name: "Notify" } } },
      {
        type: "node.add",
        args: {
          canvas,
          id: "nod_paid",
          node: { kind: "state", name: "Paid", onEntry: [{ action: "act_charge" }, { action: "act_notify" }] }
        }
      },
      { type: "node.add", args: { canvas, id: "nod_customer", node: { kind: "participant", party: "pty_customer" } } },
      { type: "node.add", args: { canvas, id: "nod_service", node: { kind: "participant", party: "pty_payments" } } },
      { type: "node.add", args: { canvas, id: "nod_steps", node: { kind: "steps", action: "act_charge" } } },
      {
        type: "edge.add",
        args: { canvas, id: "edg_pay", edge: { from: "nod_firstState", to: "nod_paid", on: ["evt_pay"] } }
      }
    ]
  });
  expect(added.ok).toBe(true);
  await page.getByRole("button", { name: "Auto-layout" }).click();
  await expect(role(page, "runs")).toHaveCount(1);

  // The customer onto the transition's label: it sends it.
  await dragFrom(
    page,
    box(page, "Customer"),
    await middle(page.locator(".react-flow__edge", { hasText: "order.pay" }))
  );
  await expect(role(page, "sends")).toHaveCount(1);

  // Paid onto Payments: it asks which of Paid's actions Payments receives.
  await dragFrom(page, box(page, "Paid"), await middle(box(page, "Payments")));
  const which = page.getByRole("dialog", { name: "Which action does Payments receive?" });
  await which.getByRole("option", { name: "Charge card" }).click();
  await expect(role(page, "receives")).toHaveCount(1);

  // Undo takes the last connector back; Redo brings it again.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(role(page, "receives")).toHaveCount(0);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(role(page, "receives")).toHaveCount(1);

  // Selecting a connector and pressing Delete clears what it stands for.
  // Clicked near where it leaves the customer, clear of the boxes it passes over.
  const near = await role(page, "sends").evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() * 0.15);
    const screen = point.matrixTransform(path.getScreenCTM());
    return { x: screen.x, y: screen.y };
  });
  await page.mouse.click(near.x, near.y);
  await page.keyboard.press("Delete");
  await expect(role(page, "sends")).toHaveCount(0);
  await expect(box(page, "First state")).toBeVisible();

  // A connector that means nothing is refused, saying why.
  await dragFrom(page, box(page, "Customer"), await middle(box(page, "First state")));
  await expect(page.getByText("These two have no role together", { exact: false })).toBeVisible();
});
