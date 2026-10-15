// Plan A4 (AI interface spec §2: "With statewright mcp configured …, an agent pairs with an open Editor using the code
// the Editor shows, builds a machine level …, and the person sees each change highlighted on the canvas, finds it in
// the undo history as the agent's, and undoes it"; "Through the tools, an agent runs a scenario step by step, saves
// it, presents it on the stage of the paired Editor, and exports the .statewright.json, which statewright verify
// accepts"; §10): a real `statewright mcp`, its client, and the Editor paired with it.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { BIN, startMcp } from "./mcp.js";

/** Payments, opened from its example, its boxes drawn and stored. */
async function openPayments(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Payments/ }).click();
  await page.waitForURL(/\/p\/prj_payments$/);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
}

/** Connect an AI…, looking at the server's address: the code the Editor shows. */
async function showCode(page, address) {
  await page.getByTestId("project-menu").click();
  await page.getByTestId("project-menu-connect").click();
  await page.getByTestId("connect-address").fill(address);
  await page.getByTestId("connect-address").press("Enter");
  await expect(page.getByTestId("connect-status")).toHaveText("Waiting for the agent…");
  return page.getByTestId("connect-code").textContent();
}

const STATES = {
  label: "A refund's states",
  commands: [
    { type: "catalog.add", args: { collection: "events", item: { name: "refund.approved" } } },
    { type: "catalog.add", args: { collection: "events", item: { name: "refund.paid" } } },
    { type: "node.update", args: { id: "nod_firstState", set: { name: "requested" } } },
    { type: "node.add", args: { canvas: "cnv_refund", id: "nod_approved", node: { kind: "state", name: "approved" } } },
    { type: "node.add", args: { canvas: "cnv_refund", id: "nod_paid", node: { kind: "state", name: "paid" } } },
    {
      type: "edge.add",
      args: { canvas: "cnv_refund", edge: { from: "nod_firstState", to: "nod_approved", on: ["evt_refundApproved"] } }
    },
    {
      type: "edge.add",
      args: { canvas: "cnv_refund", edge: { from: "nod_approved", to: "nod_paid", on: ["evt_refundPaid"] } }
    }
  ]
};

const REFUSED = {
  label: "A state for refused refunds",
  commands: [
    { type: "node.add", args: { canvas: "cnv_refund", id: "nod_refused", node: { kind: "state", name: "refused" } } },
    { type: "layout.node.set", args: { canvas: "cnv_refund", id: "nod_refused", x: 420, y: 320 } },
    { type: "edge.add", args: { canvas: "cnv_refund", edge: { from: "nod_firstState", to: "nod_refused" } } }
  ]
};

test("an agent pairs by the code the Editor shows, builds, simulates, presents and exports; the person undoes it (§2)", async ({
  page
}) => {
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await openPayments(page);
    const code = await showCode(page, mcp.address);
    expect(await mcp.pair(code)).toEqual({ paired: true, agent: "claude-code", address: mcp.address });
    await expect(page.getByTestId("connect-status")).toHaveText("Connected to claude-code");
    await expect(page.getByTestId("connect-dialog")).toBeHidden();
    await expect(page.getByTestId("actions-agent")).toHaveText(/claude-code/);

    // A machine level, built through MCP in the tab.
    expect(await mcp.tool("projects_create", { name: "Refund", kind: "machine" })).toEqual({
      project: { id: "prj_refund", name: "Refund" }
    });
    await expect(page).toHaveURL(/\/p\/prj_refund$/);
    expect((await mcp.tool("batch_apply", STATES)).created).toEqual([
      "evt_refundApproved",
      "evt_refundPaid",
      "nod_approved",
      "nod_paid",
      "edg_requestedApproved",
      "edg_approvedPaid"
    ]);
    await expect(page.getByTestId("toast")).toContainText("AI · claude-code: A refund's states");
    expect(await mcp.tool("layout_arrange", { canvas: "cnv_refund" })).not.toHaveProperty("error");
    await mcp.tool("batch_apply", REFUSED);
    await expect(page.locator('.react-flow__node.sw-ai[data-id="nod_refused"]')).toBeVisible();
    await page.getByTestId("project-menu").click();
    await expect(page.getByTestId("project-menu-undo")).toContainText("Undo A state for refused refunds (AI)");
    await page.keyboard.press("Escape");
    // The person undoes the agent's last change from the Editor.
    await page.getByTestId("toast").filter({ hasText: "refused" }).getByRole("button", { name: "Undo" }).click();
    await expect(page.locator('.react-flow__node[data-id="nod_refused"]')).toHaveCount(0);
    const level = await mcp.tool("level_get", { canvas: "cnv_refund" });
    expect(level.nodes.map(node => node.id).sort()).toEqual([
      "nod_approved",
      "nod_firstState",
      "nod_initial",
      "nod_paid"
    ]);
    expect((await mcp.tool("editor_state", {})).project).toEqual({ id: "prj_refund", name: "Refund", readOnly: false });

    // A scenario, run step by step, saved, and presented on the stage.
    await mcp.tool("run_start", { canvas: "cnv_refund", at: "2026-01-05T09:00:00Z" });
    await expect(page.getByTestId("simulation-panel")).toBeVisible();
    const stepped = await mcp.tool("run_step", { do: { event: "evt_refundApproved" } });
    expect(stepped.point.active).toEqual(["nod_approved"]);
    await mcp.tool("run_step", { do: { event: "evt_refundPaid" } });
    expect(await mcp.tool("scenario_save", { name: "A refund paid" })).toEqual({ id: "scn_aRefundPaid" });
    expect(await mcp.tool("run_stop", {})).toEqual({ stopped: true });
    expect(await mcp.tool("scenario_present", { id: "scn_aRefundPaid", step: 1 })).toEqual({ step: 1 });
    await expect(page.getByTestId("stage")).toBeVisible();
    await expect(page.getByTestId("stage-card")).toBeVisible();
    await page.keyboard.press("Escape");

    // The document, exported where the agent runs, as statewright verify accepts it.
    expect(await mcp.tool("export_document", { out: "refund.statewright.json" })).toEqual({
      name: "refund.statewright.json",
      written: "refund.statewright.json"
    });
    const verified = spawnSync(process.execPath, [BIN, "verify", join(mcp.dir, "refund.statewright.json"), "--json"], {
      encoding: "utf8"
    });
    expect(verified.status, verified.stderr).toBe(0);

    // The agent ends the pairing: the island and the person are told.
    expect(await mcp.tool("editor_disconnect", {})).toEqual({ disconnected: true });
    await expect(page.getByTestId("actions-agent")).toHaveCount(0);
    await expect(page.getByTestId("toast").filter({ hasText: "claude-code disconnected." })).toBeVisible();
  } finally {
    await mcp.stop();
  }
});

test("ends the pairing when the person disconnects or closes the tab: the agent is told the Editor has gone", async ({
  page,
  context
}) => {
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await openPayments(page);
    await mcp.pair(await showCode(page, mcp.address));
    await expect(page.getByTestId("actions-agent")).toBeVisible();
    expect((await mcp.tool("document_summary", {})).project.id).toBe("prj_payments");
    await page.getByTestId("actions-disconnect").click();
    await expect(page.getByTestId("actions-agent")).toHaveCount(0);
    expect((await mcp.tool("document_summary", {})).error).toMatchObject({
      code: "EDITOR_GONE",
      message: expect.stringMatching(/^The person disconnected the Editor/)
    });

    const other = await context.newPage();
    await other.goto("/p/prj_payments");
    await expect(other.locator(".react-flow__node").first()).toBeVisible();
    await mcp.pair(await showCode(other, mcp.address));
    await expect(other.getByTestId("actions-agent")).toBeVisible();
    await other.close();
    await expect
      .poll(async () => (await mcp.tool("document_summary", {})).error?.message)
      .toMatch(/^The paired Editor tab was closed or lost its connection/);
  } finally {
    await mcp.stop();
  }
});

test("asks the paired tab before another takes over, and keeps it when the person says so (§6)", async ({
  page,
  context
}) => {
  const mcp = await startMcp({ agent: "claude-code" });
  try {
    await openPayments(page);
    await mcp.pair(await showCode(page, mcp.address));
    const other = await context.newPage();
    await other.goto("/p/prj_payments");
    await expect(other.locator(".react-flow__node").first()).toBeVisible();
    const kept = mcp.pair(await showCode(other, mcp.address));
    await expect(page.getByTestId("handover-dialog")).toBeVisible();
    await expect(page.getByTestId("handover-dialog")).toContainText(
      "claude-code asks to work in another Statewright tab."
    );
    await page.getByRole("button", { name: "Keep here" }).click();
    expect((await kept).error.code).toBe("NOT_ALLOWED");
    await expect(page.getByTestId("actions-agent")).toBeVisible();

    const handed = mcp.pair(await other.getByTestId("connect-code").textContent());
    await page.getByRole("button", { name: "Hand over" }).click();
    expect(await handed).toMatchObject({ paired: true });
    await expect(other.getByTestId("actions-agent")).toBeVisible();
    await expect(page.getByTestId("actions-agent")).toHaveCount(0);
    await expect(page.getByTestId("toast").filter({ hasText: "claude-code now works in another tab." })).toBeVisible();
  } finally {
    await mcp.stop();
  }
});
