// Plan C1 (collaboration spec §2, §3, §4): the person writes to a paired agent from the bar at the bottom of the
// Editor, and the agent — a real `statewright mcp` and its client — listens, reads, answers there, and is stopped.
import { expect, test } from "@playwright/test";

import { startMcp } from "./mcp.js";

/** Payments on its Lifecycle engine level, stored. */
async function openLifecycle(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.goto("/p/prj_payments/cnv_lifecycle");
}

/** Pair the tab with the server: Connect an AI…, its code brought by the agent, the dialog closed. */
async function pair(page, mcp) {
  await page.getByTestId("project-menu").click();
  await page.getByTestId("project-menu-connect").click();
  await page.getByTestId("connect-address").fill(mcp.address);
  await page.getByTestId("connect-address").press("Enter");
  await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
  await mcp.pair(await page.getByTestId("connect-code").textContent());
  await expect(page.getByTestId("connect-status")).toContainText("Connected");
  // It closes by itself once it has said so.
  await expect(page.getByTestId("connect-dialog")).toBeHidden();
}

/** Whether two boxes overlap. */
const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("the person writes from the bar, the agent reads it, answers there, and stops when asked", async ({ page }) => {
  await openLifecycle(page);
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    const bar = page.getByTestId("conversation-bar");
    await expect(bar).toBeVisible();

    // Listening: the agent waits; the person selects a state, writes and presses Enter.
    const waiting = mcp.tool("editor_wait", { seconds: 30 });
    await expect(bar.locator("[data-status]")).toHaveAttribute("data-status", "listening");
    await page.locator('.react-flow__node[data-id="nod_expiryClock"]').click();
    await expect(bar).toContainText("1 selected");
    await page.getByTestId("conversation-field").fill("this needs a timeout");
    await page.getByTestId("conversation-field").press("Enter");
    const { messages } = await waiting;
    expect(messages).toMatchObject([
      {
        id: "msg_1",
        text: "this needs a timeout",
        context: {
          level: { id: "cnv_lifecycle" },
          selection: [{ id: "nod_expiryClock", name: "expiry_clock" }]
        }
      }
    ]);
    expect(mcp.notifications().filter(note => note.method === "notifications/claude/channel")).toHaveLength(1);
    await page.getByRole("button", { name: "Conversation history" }).click();
    await expect(page.getByTestId("conversation-line").first()).toContainText("read");

    // The answer, whose element leads to it.
    await mcp.tool("editor_reply", {
      text: "Done: it times out after a day",
      to: "msg_1",
      point: ["nod_complianceHold"]
    });
    await expect(bar).toContainText("Done: it times out after a day");
    await bar.getByRole("button", { name: "compliance_hold" }).click();
    await expect(page.locator('.react-flow__node[data-id="nod_complianceHold"] .sw-selection')).toBeVisible();

    // Stop: while the agent works, the person stops it; its next change is refused until it reads why.
    await mcp.tool("document_summary");
    await bar.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByTestId("conversation-line").last()).toContainText("You asked claude-code to stop");
    expect(await mcp.tool("batch_apply", { label: "x", commands: [] })).toMatchObject({ error: { code: "STOPPED" } });
    expect((await mcp.tool("editor_inbox")).messages).toMatchObject([{ stop: true }]);
    expect((await mcp.tool("batch_apply", { label: "x", commands: [] })).error?.code).not.toBe("STOPPED");

    // Disconnected, the bar goes; paired again, it starts empty.
    await page.getByTestId("actions-disconnect").click();
    await expect(bar).toHaveCount(0);
    await mcp.tool("editor_disconnect");
    await pair(page, mcp);
    await expect(bar).toBeVisible();
    await expect(page.getByTestId("conversation-line")).toHaveCount(0);
  } finally {
    await mcp.stop();
  }
});

test("keeps the bar clear of the zoom island, Support and Problems, however narrow the window", async ({ page }) => {
  await openLifecycle(page);
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    const bar = page.getByTestId("conversation-bar");
    for (const width of [1440, 1024, 640]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(bar).toBeVisible();
      await page.waitForTimeout(100);
      const shown = await bar.boundingBox();
      for (const other of [
        page.getByTestId("zoom-island"),
        page.locator("[data-support]"),
        page.getByRole("button", { name: /problems$/ })
      ]) {
        expect(overlap(shown, await other.boundingBox()), `${width} px`).toBe(false);
      }
      expect(shown.x).toBeGreaterThanOrEqual(0);
      expect(shown.x + shown.width).toBeLessThanOrEqual(width);
    }
  } finally {
    await mcp.stop();
  }
});
