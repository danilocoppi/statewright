// Plan C3 (collaboration spec §6): the agent asks the person — choices, elements marked on the canvas, an answer that
// comes late — and the person asks the agent for the usual things in one click.
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

test("the agent asks with choices and with the canvas, and the person asks for a review", async ({ page }) => {
  await openLevel(page, "cnv_expiryClock");
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    const layer = page.getByTestId("marks-layer");

    // Choices: hovering one rings what it means; a click answers it.
    const asking = mcp.tool("editor_ask", {
      question: "Which state waits for the payer?",
      options: [
        { label: "running", value: "running", point: ["nod_running"] },
        { label: "paused", value: "paused", point: ["nod_paused"] }
      ],
      seconds: 30
    });
    const card = page.getByTestId("conversation-question");
    await expect(card).toContainText("Which state waits for the payer?");
    await card.getByRole("button", { name: "paused" }).hover();
    await expect(layer.locator('[data-hover="nod_paused"]')).toBeVisible();
    await card.getByRole("button", { name: "paused" }).click();
    expect(await asking).toEqual({ answered: true, question: "qst_1", values: ["paused"] });
    await expect(card).toHaveCount(0);

    // Elements, answered after the time ran out: the answer comes as a message.
    expect(
      await mcp.tool("editor_ask", { question: "Which states should time out?", pick: "elements", seconds: 1 })
    ).toEqual({
      answered: false,
      question: "qst_2"
    });
    await card.getByRole("button", { name: "Mark on the canvas" }).click();
    await box(page, "nod_running").click();
    await box(page, "nod_paused").click();
    await card.getByRole("button", { name: "Confirm (2)" }).click();
    const { messages } = await mcp.tool("editor_wait", { seconds: 10 });
    expect(messages).toMatchObject([
      {
        answers: {
          question: "qst_2",
          elements: [
            { id: "nod_running", name: "running", level: "cnv_expiryClock" },
            { id: "nod_paused", name: "paused", level: "cnv_expiryClock" }
          ]
        }
      }
    ]);
    await expect(layer.locator("[data-for-ai]")).toHaveCount(0);

    // A quick request on a selection.
    // Confirmed, the Mark tool is put down: a click selects again.
    await expect(page.locator('[data-testid="conversation-tool"][data-tool="mark"]')).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await box(page, "nod_elapsed").click();
    const waiting = mcp.tool("editor_wait", { seconds: 30 });
    await page.locator('[data-testid="conversation-quick"][data-action="review"]').click();
    await page.getByTestId("conversation-field").press("Enter");
    const [review] = (await waiting).messages;
    expect(review).toMatchObject({
      action: "review",
      text: "Review this: Problems, gaps and inconsistencies.",
      context: { selection: [{ id: "nod_elapsed" }] }
    });
  } finally {
    await mcp.stop();
  }
});
