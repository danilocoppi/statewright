// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { autoLayout } from "statewright/layout";
import { afterEach, describe, expect, it } from "vitest";

import { newProject } from "@/files/new-project";
import { simulationStore } from "@/simulate/store";

import { placedExample } from "../fixtures.js";
import { openEditor, panel, resetStores } from "./editor.jsx";

const sim = () => simulationStore.getState();
const INIT = { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };

/** Payments on a level, its lifecycle started and taken through these inputs. */
async function payments(level, ...inputs) {
  await openEditor(await placedExample("payments"), `/p/prj_payments/${level}`);
  act(() => {
    sim().open("cnv_lifecycle");
    sim().begin(INIT);
    for (const input of inputs) sim().take(input);
  });
  return panel();
}

/** A machine whose refund decision has one branch, which never holds, and no else: the run stops there. */
async function refunds() {
  let doc = newProject({ name: "Refunds", kind: "machine", names: { state: "requested", end: "" } }, new Set());
  const root = doc.root;
  doc.catalog.events.evt_decided = { name: "refund.decided" };
  Object.assign(doc.canvases[root].nodes, {
    nod_decide: { kind: "choice", name: "decide" },
    nod_approved: { kind: "state", name: "approved" }
  });
  Object.assign(doc.canvases[root].edges, {
    edg_decide: { from: "nod_firstState", to: "nod_decide", on: ["evt_decided"] },
    edg_approve: { from: "nod_decide", to: "nod_approved", guard: { expr: false } }
  });
  doc = applyBatch(doc, await autoLayout(doc, root)).doc;
  await openEditor(doc);
  return root;
}

afterEach(() => resetStores());

describe("the run in the panel (simulator spec §6.2)", () => {
  it("asks what the design leaves open: the question in plain words, its answers numbered, answered with 1–9", async () => {
    const user = userEvent.setup();
    const run = await payments("cnv_crossBorderSend", { event: "evt_payinConfirmed" }, { event: "evt_legCompleted" });
    act(() => sim().answer("edg_convertingPayingOut"));
    act(() => sim().take({ event: "evt_payoutCompleted" }));
    const question = within(run).getByRole("region", { name: "Question" });
    expect(within(question).getByText("payout.completed")).toBeTruthy();
    expect(within(question).getByRole("heading", { name: "Which condition holds in paying_out?" })).toBeTruthy();
    expect(
      within(question)
        .getAllByRole("listitem")
        .map(item => item.textContent)
    ).toEqual([
      "1full amount → completed",
      "2Scaled payout → partially_completedThe payout was reduced to the funds actually received.",
      "3Neither · stays in paying_out"
    ]);
    expect(within(question).getByText("Asked because these conditions have no expression.")).toBeTruthy();
    expect(within(run).queryByRole("region", { name: "What can happen" })).toBeNull();
    await user.keyboard("2");
    expect(sim().asking).toBeNull();
    expect(sim().points.at(-1).session.active).toContain("nod_sendCrossBorder/nod_partiallyCompleted");
    expect(within(run).getByText("Lifecycle engine · step 3")).toBeTruthy();
  });

  it("leaves a question with Esc: the input is not taken", async () => {
    const user = userEvent.setup();
    const run = await payments("cnv_crossBorderSend", { event: "evt_payinConfirmed" }, { event: "evt_legCompleted" });
    const question = within(run).getByRole("region", { name: "Question" });
    expect(document.activeElement).toBe(within(question).getAllByRole("button")[0]);
    await user.keyboard("{Escape}");
    expect(within(run).queryByRole("region", { name: "Question" })).toBeNull();
    expect(sim().points).toHaveLength(2);
  });

  it("asks how many items a flow goes through when it cannot tell, then goes on", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payout-batch"), "/p/prj_payoutBatch/cnv_payOutBatch");
    act(() => {
      sim().open("cnv_payOutBatch");
      sim().begin({ at: "2026-01-05T09:00:00Z" });
    });
    const question = within(panel()).getByRole("region", { name: "Question" });
    expect(within(question).getByText("While starting")).toBeTruthy();
    expect(within(question).getByRole("heading", { name: "How many items does each payout go through?" })).toBeTruthy();
    await user.type(within(question).getByLabelText("How many items"), "0{Enter}");
    expect(sim().points[0].answers).toEqual([{ kind: "count", at: "nod_each", value: 0 }]);
    expect(within(panel()).getByText("the bank confirms")).toBeTruthy();
  });

  it("lists the steps, opens one's micro-events and shows the run there, then continues from it", async () => {
    const user = userEvent.setup();
    const run = await payments(
      "cnv_lifecycle",
      { event: "evt_verifyStarted" },
      { wait: "P2D" },
      { event: "evt_verifyEnded" }
    );
    const steps = within(run).getByRole("region", { name: "Steps" });
    const lines = [...steps.querySelectorAll("[data-step]")];
    expect(lines.map(line => line.textContent)).toEqual([
      "1verify.started → paused",
      "22 days later · quote_ttl fell due",
      "3verify.ended → running"
    ]);
    expect(lines[2].getAttribute("aria-expanded")).toBe("true");
    await user.click(lines[0]);
    expect(sim().shown).toBe(1);
    expect(lines[0].getAttribute("aria-expanded")).toBe("true");
    const events = within(steps)
      .getAllByRole("listitem")
      .filter(item => !item.querySelector("button"));
    expect(events.map(item => item.textContent)).toEqual([
      "leaves running",
      "cancels timer.expiry",
      "running → paused, sent by Client",
      "enters paused"
    ]);
    expect(within(run).getByText("The run as it was after step 1 of 3.")).toBeTruthy();
    expect(within(run).getByRole("region", { name: "Now" }).textContent).toContain("paused");
    await user.keyboard("{ArrowDown}");
    expect(sim().shown).toBe(2);
    await user.click(within(run).getByRole("button", { name: "Continue from here" }));
    expect(sim().points).toHaveLength(3);
    expect(within(run).getByRole("region", { name: "What can happen" })).toBeTruthy();
  });

  it("shows the context of each machine instance in Data, when asked for", async () => {
    const user = userEvent.setup();
    const run = await payments("cnv_lifecycle");
    const data = within(run).getByRole("button", { name: "Data" });
    expect(data.getAttribute("aria-expanded")).toBe("false");
    await user.click(data);
    const shown = document.getElementById(data.getAttribute("aria-controls"));
    expect(within(shown).getByText("Expiry clock")).toBeTruthy();
    expect(within(shown).getByText("expiresAt").nextSibling.textContent).toBe('"2026-01-15T09:00:00Z"');
  });

  it("says why the run cannot go on, with the Problem about the same element, and leaves the run where it was", async () => {
    const user = userEvent.setup();
    const root = await refunds();
    act(() => {
      sim().open(root);
      sim().begin({ at: "2026-01-05T09:00:00Z" });
      sim().take({ event: "evt_decided" });
    });
    const alert = within(panel()).getByRole("alert");
    expect(within(alert).getByText("The run has nowhere to go")).toBeTruthy();
    expect(within(alert).getByText("No branch of decide holds, and it has no else")).toBeTruthy();
    const rule = await within(alert).findByText("choice.else");
    expect(rule.closest("a").getAttribute("href")).toContain("#rule-choice.else");
    expect(within(alert).getByText(/has 0 else branches; it needs exactly one$/)).toBeTruthy();
    expect(sim().points).toHaveLength(1);
    await user.click(within(panel()).getByRole("button", { name: "Dismiss" }));
    expect(within(panel()).queryByRole("alert")).toBeNull();
  });

  it("announces each step's result to a screen reader", async () => {
    const run = await payments("cnv_lifecycle", { event: "evt_verifyStarted" });
    expect(run.querySelector("[aria-live]").textContent).toBe("Step 1: verify.started → paused");
    act(() => sim().take({ event: "evt_payinDetected" }));
    expect(run.querySelector("[aria-live]").textContent).toBe("Step 2: payin.detected → stopped");
    expect(screen.getAllByText("Step 2: payin.detected → stopped")).toHaveLength(1);
  });
});
