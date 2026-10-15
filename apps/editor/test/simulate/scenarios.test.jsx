// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch, check } from "statewright";
import { replay } from "statewright/simulate";
import { afterEach, describe, expect, it } from "vitest";

import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { placedExample } from "../fixtures.js";
import { openEditor, panel, resetStores } from "./editor.jsx";

const sim = () => simulationStore.getState();
const INIT = { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };
const actions = () => screen.getByRole("group", { name: "Problems and actions" });

/** Payments as stored, with a change to its design, on the lifecycle level. */
async function payments(change = () => {}) {
  const doc = structuredClone(await placedExample("payments"));
  change(doc);
  await openEditor(applyBatch(doc, []).doc, "/p/prj_payments/cnv_lifecycle");
}

/** The Start panel, once Problems have said how each scenario replays. */
async function startPanel(user) {
  await screen.findByRole("button", { name: /problems$/ }, { timeout: 4000 });
  await user.click(screen.getByRole("button", { name: "Simulate" }));
  return within(panel()).getByRole("region", { name: "Scenarios" });
}

afterEach(() => resetStores());

describe("saved scenarios in the editor (simulator spec §6.4)", () => {
  it("lists the scenarios of what it simulates with their last result, and runs one a step at a time", async () => {
    const user = userEvent.setup();
    await payments();
    const scenarios = await startPanel(user);
    expect(
      within(scenarios)
        .getAllByRole("listitem")
        .map(item => item.textContent)
    ).toEqual(["Pays in time4 steps · same as recorded", "Verification pauses the clock3 steps · same as recorded"]);
    await user.click(within(scenarios).getByRole("button", { name: "Run Pays in time" }));
    expect(within(panel()).getByText("Pays in time · step 0 of 4")).toBeTruthy();
    const steps = within(panel()).getByRole("region", { name: "Steps" });
    expect(within(steps).getByText("The payer's money is seen: the expiry clock stops.")).toBeTruthy();
    await user.click(within(panel()).getByRole("button", { name: /^Next step/ }));
    expect(sim().points).toHaveLength(2);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(sim().points).toHaveLength(3);
    expect(within(panel()).getByText("Pays in time · step 2 of 4")).toBeTruthy();
  });

  it("shows where a scenario now goes elsewhere, and accepts the new path: Problems no longer report it", async () => {
    const user = userEvent.setup();
    await payments(doc => (doc.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped"));
    const scenarios = await startPanel(user);
    expect(within(scenarios).getByText("changed at step 3 of 3")).toBeTruthy();
    await user.click(within(scenarios).getByRole("button", { name: "Run Verification pauses the clock" }));
    act(() => {
      for (let step = 0; step < 3; step += 1) sim().next();
    });
    const steps = within(panel()).getByRole("region", { name: "Steps" });
    expect(within(steps).getByText("Recorded: running · Now: stopped")).toBeTruthy();
    await user.click(within(steps).getByRole("button", { name: "Accept the new path" }));
    const doc = editorStore.getState().doc;
    expect(replay(doc, doc.annotations.scenarios.scn_verificationPausesTheClock).first).toBeNull();
    expect(check(doc).filter(problem => problem.code === "scenario.diverged")).toEqual([]);
    expect(editorStore.getState().history.past.at(-1).label).toBe("Accept the new path at step 3");
    expect(within(steps).queryByText("Recorded: running · Now: stopped")).toBeNull();
  });

  it("says how many later steps the new path drops, and asks first", async () => {
    const user = userEvent.setup();
    await payments(doc => (doc.canvases.cnv_crossBorderSend.edges.edg_awaitingFundsConverting.to = "nod_payingOut"));
    await startPanel(user);
    act(() => sim().followTo("scn_paysInTime", 2));
    await user.click(within(panel()).getByRole("button", { name: "Accept the new path" }));
    const ask = screen.getByRole("dialog", { name: "Accept the new path?" });
    expect(
      within(ask).getByText(
        "From step 2 on, “Pays in time” records what the design does now. 2 later steps can no longer be taken and are dropped."
      )
    ).toBeTruthy();
    await user.click(within(ask).getByRole("button", { name: "Accept and drop 2 steps" }));
    expect(editorStore.getState().doc.annotations.scenarios.scn_paysInTime.steps).toHaveLength(2);
  });

  it("stops following where the person says, and goes on as their own run, to be saved", async () => {
    const user = userEvent.setup();
    await payments(doc => (doc.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped"));
    await startPanel(user);
    act(() => sim().followTo("scn_verificationPausesTheClock", 3));
    await user.click(within(panel()).getByRole("button", { name: "Stop here" }));
    expect(sim().script.following).toBe(false);
    await user.click(within(panel()).getByRole("button", { name: /^hold\.opened/ }));
    expect(within(panel()).getByRole("button", { name: "Save as scenario…" })).toBeTruthy();
  });

  it("asks before stopping with steps not saved, and saves them as a scenario first", async () => {
    const user = userEvent.setup();
    await payments();
    act(() => {
      sim().open("cnv_lifecycle");
      sim().begin(INIT);
      sim().take({ event: "evt_verifyStarted" });
    });
    await user.click(within(actions()).getByRole("button", { name: "Stop" }));
    const leave = screen.getByRole("dialog", { name: "Stop with steps not saved?" });
    expect(
      within(leave).getByText("This run has 1 step no scenario holds. Save it as a scenario, or discard it.")
    ).toBeTruthy();
    await user.click(within(leave).getByRole("button", { name: "Save as scenario…" }));
    const save = screen.getByRole("dialog", { name: "Save as scenario" });
    await user.type(within(save).getByLabelText("Name"), "Paused");
    await user.click(within(save).getByRole("button", { name: "Save" }));
    const scenarios = editorStore.getState().doc.annotations.scenarios;
    expect(Object.values(scenarios).map(scenario => scenario.name)).toContain("Paused");
    expect(sim().mode).toBeNull();
    expect(useToastStore.getState().items.at(-1)).toMatchObject({
      tone: "success",
      message: "Saved as scenario Paused"
    });
  });

  it("discards the run when asked to, and starts over without saving", async () => {
    const user = userEvent.setup();
    await payments();
    act(() => {
      sim().open("cnv_lifecycle");
      sim().begin(INIT);
      sim().take({ event: "evt_verifyStarted" });
    });
    await user.click(within(panel()).getByRole("button", { name: "Start over" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "Start over with steps not saved?" })).getByRole("button", {
        name: "Discard and start over"
      })
    );
    expect(sim().points).toHaveLength(1);
    act(() => sim().take({ event: "evt_verifyStarted" }));
    await user.click(within(actions()).getByRole("button", { name: "Stop" }));
    await user.click(screen.getByRole("button", { name: "Discard run" }));
    expect(sim().mode).toBeNull();
  });

  it("writes a step's caption with the pencil, stored in its scenario once saved", async () => {
    const user = userEvent.setup();
    await payments();
    await startPanel(user);
    act(() => sim().followTo("scn_paysInTime", 1));
    const steps = within(panel()).getByRole("region", { name: "Steps" });
    await user.click(within(steps).getByRole("button", { name: "Change the caption of step 1" }));
    const field = within(steps).getByLabelText("Change the caption of step 1");
    await user.clear(field);
    await user.type(field, "The money is seen.{Enter}");
    expect(editorStore.getState().doc.annotations.scenarios.scn_paysInTime.steps[0].caption).toBe("The money is seen.");
  });

  it("opens a scenario at the step where it now goes elsewhere, from its Problem", async () => {
    const user = userEvent.setup();
    await payments(doc => (doc.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped"));
    await user.click(await screen.findByRole("button", { name: /problems$/ }, { timeout: 4000 }));
    const problems = screen.getByRole("dialog", { name: "Problems" });
    await user.click(within(problems).getByText(/goes elsewhere at step 3/));
    expect(sim()).toMatchObject({ mode: "run", script: { id: "scn_verificationPausesTheClock", following: true } });
    expect(sim().points).toHaveLength(4);
    expect(sim().points[3].status).toBe("diverged");
  });

  it("simulates in a read-only tab, but says why it cannot save", async () => {
    const user = userEvent.setup();
    await payments();
    act(() => {
      editorStore.getState().setReadOnly(true);
      sim().open("cnv_lifecycle");
      sim().begin(INIT);
      sim().take({ event: "evt_verifyStarted" });
    });
    expect(within(panel()).getByRole("button", { name: "Save as scenario…" }).disabled).toBe(true);
    expect(
      within(panel()).getByText("This tab is read-only: scenarios are saved in the tab that edits the project.")
    ).toBeTruthy();
    await waitFor(() => expect(sim().points).toHaveLength(2));
    await user.click(within(actions()).getByRole("button", { name: "Stop" }));
    expect(screen.getByRole("dialog", { name: "Stop with steps not saved?" })).toBeTruthy();
  });

  it("asks before a Problem's row replaces a run that has steps not saved", async () => {
    const user = userEvent.setup();
    await payments(doc => (doc.canvases.cnv_expiryClock.edges.edg_pausedRunning.to = "nod_stopped"));
    await user.click(await screen.findByRole("button", { name: /problems$/ }, { timeout: 4000 }));
    act(() => {
      sim().open("cnv_lifecycle");
      sim().begin(INIT);
      sim().take({ event: "evt_holdOpened" });
    });
    const problems = screen.getByRole("dialog", { name: "Problems" });
    await user.click(within(problems).getByText(/goes elsewhere at step 3/));
    const leave = screen.getByRole("dialog", { name: "Open the scenario with steps not saved?" });
    expect(sim().points).toHaveLength(2);
    await user.click(within(leave).getByRole("button", { name: "Discard and open it" }));
    expect(sim()).toMatchObject({ mode: "run", script: { id: "scn_verificationPausesTheClock", following: true } });
    expect(sim().points).toHaveLength(4);
  });

  it("accepts a new start when a scenario now asks a question while starting", async () => {
    const user = userEvent.setup();
    const doc = structuredClone(await placedExample("payout-batch"));
    doc.annotations.scenarios.scn_aPayoutIsRefused.start.answers.pop();
    await openEditor(doc, "/p/prj_payoutBatch/cnv_payOutBatch");
    act(() => sim().followTo("scn_aPayoutIsRefused", 0));
    await user.keyboard("2");
    const steps = within(panel()).getByRole("region", { name: "Steps" });
    expect(within(steps).getByText("It now asks a question the recording does not answer.")).toBeTruthy();
    await user.click(within(steps).getByRole("button", { name: "Accept the new path" }));
    const stored = editorStore.getState().doc;
    expect(stored.annotations.scenarios.scn_aPayoutIsRefused.start.answers).toHaveLength(2);
    expect(replay(stored, stored.annotations.scenarios.scn_aPayoutIsRefused).first).toBeNull();
  });

  it("says why a scenario can no longer start, its steps numbered from 1, with nothing to accept", async () => {
    const doc = applyBatch(await placedExample("payments"), [
      { type: "node.remove", args: { id: "nod_complianceInitial", cascade: true } }
    ]).doc;
    await openEditor(doc, "/p/prj_payments/cnv_lifecycle");
    act(() => sim().followTo("scn_paysInTime", 0));
    expect(within(within(panel()).getByRole("alert")).getByText("The run has nowhere to start")).toBeTruthy();
    const steps = within(panel()).getByRole("region", { name: "Steps" });
    expect(within(steps).getAllByRole("listitem")[0].textContent).toMatch(/^1payin\.detected/);
    expect(within(panel()).queryByRole("button", { name: "Accept the new path" })).toBeNull();
    expect(within(panel()).queryByRole("button", { name: "Dismiss" })).toBeNull();
  });
});
