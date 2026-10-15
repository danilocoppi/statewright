// Plan C2 (collaboration spec §5): the person marks for the agent where they mean — drawing, marking elements,
// labelling, erasing — and the marks go with the message, read and pictured, then leave the canvas.
import { expect, test } from "@playwright/test";

import { startMcp } from "./mcp.js";

async function openLevel(page, canvas) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto(`/p/prj_payments/${canvas}`);
}

async function pair(page, mcp) {
  await page.getByTestId("project-menu").click();
  await page.getByTestId("project-menu-connect").click();
  await page.getByTestId("connect-address").fill(mcp.address);
  await page.getByTestId("connect-address").press("Enter");
  await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
  await mcp.pair(await page.getByTestId("connect-code").textContent());
  await expect(page.getByTestId("connect-dialog")).toBeHidden();
}

const box = (page, id) => page.locator(`.react-flow__node[data-id="${id}"]`);
const tool = (page, name) => page.locator(`[data-testid="conversation-tool"][data-tool="${name}"]`);
const centre = b => [b.x + b.width / 2, b.y + b.height / 2];

/** Drag the mouse through these screen points. */
async function drag(page, points) {
  await page.mouse.move(...points[0]);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(...point, { steps: 6 });
  await page.mouse.up();
}

/** A rectangle drawn round a box, 16 px outside it. */
async function around(page, id) {
  const b = await box(page, id).boundingBox();
  await drag(page, [
    [b.x - 16, b.y - 16],
    [b.x + b.width + 16, b.y + b.height + 16]
  ]);
}

test("marks go with the message, read as the elements they mean, pictured, and leave the canvas", async ({ page }) => {
  await openLevel(page, "cnv_expiryClock");
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    const layer = page.getByTestId("marks-layer");

    // A red rectangle round running.
    await tool(page, "rectangle").click();
    await around(page, "nod_running");
    // A green pencil arrow from running to elapsed.
    await tool(page, "pencil").click();
    await page.getByTestId("marks-colour").getByRole("radio", { name: "Green: right" }).click();
    const running = centre(await box(page, "nod_running").boundingBox());
    const elapsed = centre(await box(page, "nod_elapsed").boundingBox());
    await drag(page, [running, [(running[0] + elapsed[0]) / 2, (running[1] + elapsed[1]) / 2 + 30], elapsed]);
    // A label beside paused.
    const paused = await box(page, "nod_paused").boundingBox();
    await page.keyboard.down("Alt");
    await page.mouse.click(paused.x + paused.width + 12, paused.y + paused.height / 2);
    await page.keyboard.up("Alt");
    await page.getByRole("textbox", { name: "A label" }).fill("needs a timeout");
    await page.getByRole("textbox", { name: "A label" }).press("Enter");
    await expect(layer.locator("[data-mark]")).toHaveCount(3);

    // Ctrl+Z takes back a mark, not a change of the document.
    await tool(page, "rectangle").click();
    await drag(page, [
      [600, 520],
      [680, 580]
    ]);
    await expect(layer.locator("[data-mark]")).toHaveCount(4);
    await page.keyboard.press("Control+z");
    await expect(layer.locator("[data-mark]")).toHaveCount(3);
    // Shift+L, which lays the level out, waits while a tool is in hand.
    await page.keyboard.press("Shift+L");
    await page.waitForTimeout(500);
    await page.getByTestId("project-menu").click();
    await expect(page.getByTestId("project-menu-undo")).toBeDisabled();
    await page.keyboard.press("Escape");

    // On the level above, expiry_clock marked for the AI.
    await page.keyboard.press("Escape");
    await expect(tool(page, "rectangle")).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("navigation", { name: "Levels" }).getByRole("link", { name: "Lifecycle engine" }).click();
    await expect(page).toHaveURL(/\/cnv_lifecycle$/);
    await tool(page, "mark").click();
    await box(page, "nod_expiryClock").click();
    await expect(layer.locator('[data-for-ai="nod_expiryClock"]')).toBeVisible();
    await expect(page.getByTestId("conversation-bar")).toContainText("1 marked on 1 level");
    await expect(page.getByTestId("conversation-bar")).toContainText("3 marks");

    const waiting = mcp.raw("editor_wait", { seconds: 30 });
    await page.getByTestId("conversation-field").fill("these");
    await page.getByTestId("conversation-field").press("Enter");
    const answer = await waiting;
    const [message] = answer.structuredContent.messages;
    expect(message.marks).toEqual([
      expect.objectContaining({
        kind: "rectangle",
        level: "cnv_expiryClock",
        colour: "red",
        meaning: "wrong",
        encloses: [{ id: "nod_running", name: "running" }]
      }),
      expect.objectContaining({
        kind: "stroke",
        colour: "green",
        meaning: "right",
        from: { id: "nod_running", name: "running" },
        to: { id: "nod_elapsed", name: "elapsed" }
      }),
      expect.objectContaining({ kind: "label", text: "needs a timeout", near: { id: "nod_paused", name: "paused" } }),
      {
        kind: "element",
        level: "cnv_lifecycle",
        element: { id: "nod_expiryClock", name: "expiry_clock", kind: "state" }
      }
    ]);
    expect(message.image).toBe("attached");
    expect(answer.content.at(-1)).toMatchObject({ type: "image", mimeType: "image/png" });
    await expect(layer.locator("[data-mark], [data-for-ai]")).toHaveCount(0);
  } finally {
    await mcp.stop();
  }
});

test("a mark reads the same elements at any zoom", async ({ page }) => {
  await openLevel(page, "cnv_expiryClock");
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    const zoom = page.getByRole("toolbar", { name: "Zoom" });
    for (let step = 0; step < 4; step += 1) await zoom.getByRole("button", { name: "Zoom out" }).click();
    await tool(page, "rectangle").click();
    await around(page, "nod_paused");
    const waiting = mcp.tool("editor_wait", { seconds: 30 });
    await page.getByTestId("conversation-field").fill("this one");
    await page.getByTestId("conversation-field").press("Enter");
    const { messages } = await waiting;
    expect(messages[0].marks[0].encloses).toEqual([{ id: "nod_paused", name: "paused" }]);
  } finally {
    await mcp.stop();
  }
});
