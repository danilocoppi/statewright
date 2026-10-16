// Plan C5 (collaboration spec §8, §9): review comments the person and the agent answer and resolve, locks the agent
// cannot pass, and a document of an older format saved as 1.3.
import { fileURLToPath } from "node:url";

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

test("a comment answered and resolved by the agent; a locked level whose change is only proposed", async ({ page }) => {
  await openLevel(page, "cnv_expiryClock");
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);

    // The person comments on paused.
    await box(page, "nod_paused").click({ button: "right" });
    await page.getByRole("menuitem", { name: /Comment/ }).click();
    const thread = page.getByTestId("comment-thread");
    await thread.getByRole("textbox", { name: "Comment" }).fill("Should paused stop the clock?");
    await thread.getByRole("button", { name: "Comment" }).click();
    const pin = page.getByTestId("comment-pin");
    await expect(pin).toHaveCount(1);

    // The agent finds it in Problems, answers and resolves it.
    const { problems } = await mcp.tool("problems_list");
    const open = problems.find(problem => problem.code === "comment.open");
    expect(open).toMatchObject({ target: "nod_paused", canvas: "cnv_expiryClock" });
    const id = open.data.comment;
    await mcp.tool("batch_apply", {
      label: "Answer",
      commands: [
        {
          type: "comment.reply",
          args: { id, text: "Yes: verify.started pauses it.", author: "agent", name: "claude-code" }
        },
        { type: "comment.resolve", args: { id } }
      ]
    });
    await expect(pin).toHaveCount(0);

    // The person locks the level; the agent's change there is only proposed.
    await page.locator(".react-flow__pane").click({ button: "right", position: { x: 900, y: 200 } });
    await page.getByRole("menuitem", { name: /Level details/ }).click();
    await page.getByTestId("inspector-lock").getByRole("checkbox").check();
    const answer = await mcp.tool("batch_apply", {
      label: "Late",
      commands: [
        { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } }
      ]
    });
    expect(answer).toMatchObject({ proposed: "prp_1", forced: "locked" });
    await expect(page.getByTestId("conversation-proposal")).toContainText("Proposed because it changes what is locked");
  } finally {
    await mcp.stop();
  }
});

test("a document of format 1.2 opens and is kept in the current format", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Payments/ })).toBeVisible();
  // The payments example as it was published in format 1.2, signed.
  await page
    .getByLabel("Open file…")
    .setInputFiles(fileURLToPath(new URL("./fixtures/payments-1.2.sttw", import.meta.url)));
  await expect(page.getByText(/Updated from format 1\.2 to 1\.4/)).toBeVisible();
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    const { document } = await mcp.tool("document_get");
    expect(document.statewright).toBe("1.4");
  } finally {
    await mcp.stop();
  }
});
