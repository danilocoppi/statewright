// Plan C4 (collaboration spec §7): the agent proposes instead of changing; the person sees the proposal drawn, steps
// through it, accepts it as one change of the agent's or rejects it; removals are always proposed.
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

test("a proposal is drawn, stepped through, accepted as the agent's change; a removal is proposed and rejected", async ({
  page
}) => {
  await openLevel(page, "cnv_lifecycle");
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await pair(page, mcp);
    expect(
      await mcp.tool("batch_apply", {
        label: "Late payers",
        propose: true,
        title: "A state for late payers",
        why: "a payment can come after the deadline",
        commands: [
          {
            type: "node.add",
            args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } }
          },
          {
            type: "edge.add",
            args: { canvas: "cnv_expiryClock", id: "edg_elapsedLate", edge: { from: "nod_elapsed", to: "nod_late" } }
          }
        ]
      })
    ).toEqual({ proposed: "prp_1" });
    const card = page.getByTestId("conversation-proposal");
    await expect(card).toContainText("A state for late payers");
    await expect(card).toContainText("2 new, on 1 level");
    // The changes are on another level: the next one takes the person there, the ghost drawn in a place of its own.
    await card.getByRole("button", { name: "Next change" }).click();
    await expect(page).toHaveURL(/\/cnv_expiryClock$/);
    const ghost = page.locator('[data-proposed="add"][data-id="nod_late"]');
    await expect(ghost).toBeVisible();
    const placed = await ghost.boundingBox();
    for (const id of ["nod_running", "nod_paused", "nod_elapsed", "nod_stopped"]) {
      const other = await page.locator(`.react-flow__node[data-id="${id}"]`).boundingBox();
      const apart =
        placed.x + placed.width <= other.x ||
        other.x + other.width <= placed.x ||
        placed.y + placed.height <= other.y ||
        other.y + other.height <= placed.y;
      expect(apart, id).toBe(true);
    }
    await card.getByRole("button", { name: "Accept" }).click();
    await expect(page.locator('.react-flow__node[data-id="nod_late"]')).toBeVisible();
    await page.getByTestId("project-menu").click();
    await expect(page.getByTestId("project-menu-undo")).toContainText("Undo A state for late payers (AI)");
    await page.keyboard.press("Escape");

    // A removal, not asked to be proposed: proposed all the same, then rejected with a reason.
    expect(
      await mcp.tool("batch_apply", {
        label: "Drop a transition",
        commands: [{ type: "edge.remove", args: { id: "edg_elapsedLate" } }]
      })
    ).toMatchObject({ proposed: "prp_2", forced: "deletes" });
    await expect(card).toContainText("Proposed because it removes");
    await card.getByRole("button", { name: "Reject" }).click();
    await card.getByRole("textbox", { name: "Why not? (optional)" }).fill("late payers still need it");
    await card.getByRole("button", { name: "Reject it" }).click();
    await expect(card).toHaveCount(0);
    const { messages } = await mcp.tool("editor_inbox");
    expect(messages.map(message => message.proposal)).toEqual([
      { id: "prp_1", title: "A state for late payers", accepted: true },
      { id: "prp_2", title: "Drop a transition", accepted: false, reason: "late payers still need it" }
    ]);
    await expect(
      page.locator('.react-flow__edge[data-id="edg_elapsedLate"], [data-testid="rf__edge-edg_elapsedLate"]').first()
    ).toBeAttached();
  } finally {
    await mcp.stop();
  }
});
