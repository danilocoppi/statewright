// Mixed levels, plan M5 (spec §4.5, §6): a new mixed project holds states, steps and boxes together; a connection
// means what its ends make it, ends of different kinds are refused, and the level simulates as its machine.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
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

test("a mixed project connects by meaning, refuses what means nothing, and simulates as its machine", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Mixed/ }).click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  await dialog.getByRole("textbox", { name: "Name" }).fill("Floor");
  await dialog.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByTestId("canvas")).toBeVisible();
  await expect(page.getByRole("tab", { name: "State machine elements" })).toHaveAttribute("aria-selected", "true");

  const root = (await agent(page, "document.get")).result.document.root;
  const added = await agent(page, "batch.apply", {
    label: "The floor",
    commands: [
      { type: "catalog.add", args: { collection: "events", id: "evt_pay", item: { name: "order.pay" } } },
      { type: "node.add", args: { canvas: root, id: "nod_init", node: { kind: "initial" } } },
      { type: "node.add", args: { canvas: root, id: "nod_open", node: { kind: "state", name: "Open" } } },
      {
        type: "node.add",
        args: { canvas: root, id: "nod_paid", node: { kind: "state", name: "Paid", terminal: true } }
      },
      {
        type: "edge.add",
        args: { canvas: root, id: "edg_init", edge: { from: "nod_init", to: "nod_open", kind: "transition" } }
      },
      { type: "node.add", args: { canvas: root, id: "nod_web", node: { kind: "service", name: "Web" } } }
    ]
  });
  expect(added.ok).toBe(true);
  await page.getByRole("button", { name: "Auto-layout" }).click();

  // Open onto Paid: a transition; the trigger editor asks when.
  await drag(page, box(page, "Open"), box(page, "Paid"));
  const when = page.getByRole("dialog", { name: "When does Open go to Paid?" });
  await when.getByRole("combobox", { name: "Event" }).fill("order.pay");
  await page.keyboard.press("Enter");
  await expect(page.locator(".react-flow__edge", { hasText: "order.pay" })).toBeVisible();
  const edges = Object.values((await agent(page, "document.get")).result.document.canvases[root].edges);
  expect(edges.filter(edge => edge.kind === "transition")).toHaveLength(2);

  // Web onto Open: a box and a state mean nothing together.
  await drag(page, box(page, "Web"), box(page, "Open"));
  await expect(page.getByText("These two do not connect", { exact: false })).toBeVisible();

  // It simulates as its machine.
  await page.getByRole("button", { name: "Simulate" }).click();
  const panel = page.getByRole("dialog", { name: "Simulation" });
  await panel.getByRole("button", { name: "Start" }).click();
  await expect(panel.getByRole("button", { name: /^order\.pay/ })).toBeVisible();
});
