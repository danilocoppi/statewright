// Plan E3's "done when" (spec §2, §13): in a real browser, a person builds a small machine from an empty project —
// states, transitions with new events, a guard and a timer — with nothing but the canvas, and moves and lays out what
// is there.
import { expect, test } from "@playwright/test";

const box = (page, name) => page.locator(".react-flow__node-node", { hasText: name });
const edge = (page, text) => page.locator(".react-flow__edge", { hasText: text });

/** The middle of an element on the screen, once the view has stopped moving (it slides a box clear of the inspector). */
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

/** Drag from a box's handle to a point: another box, or empty canvas. */
async function dragFrom(page, from, to) {
  await from.hover();
  const start = await middle(from.locator(".react-flow__handle-right"));
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 40, start.y + 10, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

test("builds a small machine from an empty project: states, transitions with new events, a guard and a timer", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^State machine/ }).click();
  const create = page.getByRole("dialog", { name: "New project" });
  await create.getByRole("textbox", { name: "Name" }).fill("Refunds");
  await create.getByRole("button", { name: "Create project" }).click();
  const first = box(page, "First state");
  await expect(first).toBeVisible();

  // A state: its tool's key, a click where it goes, its name.
  await page.keyboard.press("s");
  const near = await middle(first);
  await page.mouse.click(near.x + 300, near.y);
  await page.keyboard.type("Paid");
  await page.keyboard.press("Enter");
  await expect(box(page, "Paid")).toBeVisible();

  // A transition with a new event: from First state's handle to Paid; the trigger editor asks when.
  await dragFrom(page, first, await middle(box(page, "Paid")));
  const when = page.getByRole("dialog", { name: "When does First state go to Paid?" });
  await when.getByRole("combobox", { name: "Event" }).fill("payin.confirmed");
  await expect(when.getByRole("option").first()).toContainText("Create event payin.confirmed");
  await page.keyboard.press("Enter");
  await expect(edge(page, "payin.confirmed")).toBeVisible();

  // A guard on it: the transition is still selected, Enter opens its trigger editor.
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "+ Guard" }).click();
  await page.getByRole("combobox", { name: "Guard" }).fill("amount covered");
  await page.keyboard.press("Enter");
  await expect(edge(page, "payin.confirmed [amount covered]")).toBeVisible();

  // A new state from a connection dragged to empty canvas, left after a timer.
  await dragFrom(page, first, { x: near.x + 300, y: near.y + 220 });
  await page.keyboard.type("Expired");
  await page.keyboard.press("Enter");
  const after = page.getByRole("dialog", { name: "When does First state go to Expired?" });
  await after.getByRole("button", { name: "After a timer" }).click();
  await after.getByRole("combobox", { name: "Timer" }).fill("30 min");
  await page.keyboard.press("Enter");
  await expect(edge(page, "30 min")).toBeVisible();

  // Undo and redo say what they change.
  await page.getByRole("button", { name: /^Undo Set trigger/ }).click();
  await expect(edge(page, "30 min")).toHaveCount(0);
  await page.getByRole("button", { name: /^Redo Set trigger/ }).click();
  await expect(edge(page, "30 min")).toBeVisible();

  // Nothing is an error, and everything is kept.
  await page.getByRole("button", { name: /problems?$/ }).click();
  await expect(page.getByRole("radio", { name: /^Errors/ })).toHaveText("Errors 0");
  await expect(page.getByText("Saved")).toBeVisible();
  await page.reload();
  await expect(edge(page, "payin.confirmed [amount covered]")).toBeVisible();
  await expect(edge(page, "30 min")).toBeVisible();
});

test("moves a box as one change, and lays the level out again", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Get paid/ }).click();
  await page.waitForURL(/\/p\/prj_/);
  await page.goto(`${new URL(page.url()).pathname}/cnv_open`);
  const created = box(page, "crypto link, no lock");
  await expect(created).toBeVisible();
  const before = await created.boundingBox();
  const start = await middle(created);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 60, start.y + 140, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await created.boundingBox()).y).toBeGreaterThan(before.y + 100);
  await page.getByRole("button", { name: /^Undo Move/ }).click();
  await expect.poll(async () => Math.round((await created.boundingBox()).y)).toBe(Math.round(before.y));
  await page.getByRole("button", { name: "Auto-layout" }).click();
  await expect(page.getByRole("button", { name: /^Undo Lay out again/ })).toBeVisible();
});

test("fits the level with Shift+F as with Shift+1, and lays it out again with Shift+A", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Get paid/ }).click();
  await page.waitForURL(/\/p\/prj_/);
  await page.goto(`${new URL(page.url()).pathname}/cnv_open`);
  await expect(box(page, "crypto link, no lock")).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  const zoom = page.getByRole("button", { name: "Zoom to 100 %" });
  /** The zoom shown, once the view has stopped moving. */
  const still = async () => {
    let last = null;
    await expect
      .poll(
        async () => {
          const now = await zoom.textContent();
          const same = now === last;
          last = now;
          return same;
        },
        { intervals: [150] }
      )
      .toBe(true);
    return last;
  };
  /** Zoom in twice, then take the focus off the zoom island, back to the page: the zoom shown then. */
  const zoomIn = async () => {
    const before = await still();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.evaluate(() => document.activeElement?.blur());
    const zoomed = await still();
    expect(zoomed).not.toBe(before);
    return zoomed;
  };

  const zoomed = await zoomIn();
  await page.keyboard.press("Shift+F");
  const fitted = await still();
  expect(fitted).not.toBe(zoomed);
  await zoomIn();
  await page.keyboard.press("Shift+1");
  expect(await still()).toBe(fitted);

  await expect(page.getByRole("button", { name: "Auto-layout" })).toHaveAttribute("title", /⇧A or ⇧L/);
  await page.keyboard.press("Shift+A");
  await expect(page.getByRole("button", { name: /^Undo Lay out again/ })).toBeVisible();
});

test("pastes from the canvas menu where the menu was opened, not where Paste is chosen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Get paid/ }).click();
  await page.waitForURL(/\/p\/prj_/);
  await page.goto(`${new URL(page.url()).pathname}/cnv_open`);
  const created = box(page, "crypto link, no lock");
  await expect(created).toBeVisible();
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  await middle(created);
  await created.click();
  await page.keyboard.press("ControlOrMeta+c");
  const pane = await page.locator(".react-flow__pane").boundingBox();
  const at = { x: pane.x + 320, y: pane.y + pane.height - 160 };
  await page.mouse.click(at.x, at.y, { button: "right" });
  await page.getByRole("menuitem", { name: /^Paste/ }).click();
  const copy = page.locator(".react-flow__node-node.selected");
  await expect(copy).toHaveCount(1);
  const placed = await copy.boundingBox();
  expect(Math.abs(placed.x - at.x)).toBeLessThan(3);
  expect(Math.abs(placed.y - at.y)).toBeLessThan(3);
});

test("creates a flow inside a service from the level's kind under the dock, opens it, and Undo takes it back", async ({
  page
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  const dock = page.getByRole("toolbar", { name: "Tools" });
  const kind = dock.getByRole("button", { name: "Level kind: System" });
  await expect(kind).toHaveText("System");
  await expect(page.getByText("Arranging this level…")).toHaveCount(0);
  await box(page, "Scheduler").click();

  await kind.click();
  const menu = page.getByRole("menu", { name: "Levels inside a box" });
  await expect(menu.getByRole("group", { name: "Create inside Scheduler" })).toBeVisible();
  await menu.getByRole("menuitem", { name: /^Flow/ }).click();
  await page.waitForURL(/\/p\/prj_payments\/cnv_scheduler$/);
  await expect(dock.getByRole("button", { name: "Level kind: Flow" })).toHaveText("Flow");
  await expect(dock.getByRole("button", { name: "If / else" })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Service" })).toHaveCount(0);

  await page.getByRole("button", { name: /^Undo Add an interior/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(kind).toBeVisible();
  await box(page, "Scheduler").click();
  await kind.click();
  await expect(menu.getByRole("menuitem", { name: /^Flow/ })).toBeVisible();
});
