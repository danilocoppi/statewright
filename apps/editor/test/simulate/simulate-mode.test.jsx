// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { simulationStore } from "@/simulate/store";
import { inspectorWidthStore } from "@/stores/inspector";
import { editorStore } from "@/store/editor";

import { demoDoc, placedExample } from "../fixtures.js";
import { box, openEditor, panel, resetStores } from "./editor.jsx";

const sim = () => simulationStore.getState();

/** Payments on the lifecycle level, its Start panel open and its deadline typed in. */
async function startPayments(user) {
  await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
  await user.click(screen.getByRole("button", { name: "Simulate" }));
  const start = panel();
  await user.type(within(start).getByLabelText(/^expiresAt/), "2026-01-15 09:00");
  const clock = within(start).getByLabelText("Clock starts");
  await user.clear(clock);
  await user.type(clock, "2026-01-05 09:00");
  await user.click(within(start).getByRole("button", { name: "Start" }));
  return panel();
}

afterEach(() => resetStores());

describe("simulating in the editor (simulator spec §6.1, §6.2)", () => {
  it("opens the Start panel for what runs the level, with the starting values its machines declare", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    const simulate = screen.getByRole("button", { name: "Simulate" });
    await user.click(simulate);
    expect(simulate.getAttribute("aria-expanded")).toBe("true");
    const start = panel();
    expect(within(start).getByRole("heading", { name: "Simulate" })).toBeTruthy();
    expect(within(start).getByText("Lifecycle engine · 3 regions, 3 machines inside")).toBeTruthy();
    expect(within(start).getByText("Expiry clock · starting values")).toBeTruthy();
    expect(
      within(start)
        .getByLabelText(/^expiresAt/)
        .getAttribute("aria-required")
    ).toBe("true");
    expect(
      within(start)
        .getByLabelText(/^expiryFrozenAt/)
        .getAttribute("aria-required")
    ).toBeNull();
    expect(within(start).getByText("Starts at each region's initial state.")).toBeTruthy();
    // The document is not edited meanwhile: no tools, no undo, no inspector.
    expect(screen.queryByRole("toolbar", { name: "Tools" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Undo|Nothing to undo/ })).toBeNull();
    await user.click(simulate);
    expect(panel()).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Tools" })).toBeTruthy();
  });

  it("opens its panel in the inspector's place, as wide as the person made the inspector", async () => {
    const user = userEvent.setup();
    act(() => inspectorWidthStore.getState().setWidth(480));
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    expect(panel().style.width).toBe("480px");
  });

  it("starts the run with the values typed: Now names each active state with its region, and the clock", async () => {
    const user = userEvent.setup();
    const run = await startPayments(user);
    expect(within(run).getByRole("heading", { name: "Simulation" })).toBeTruthy();
    expect(within(run).getByText("Lifecycle engine, from its start")).toBeTruthy();
    const now = within(run).getByRole("region", { name: "Now" });
    expect(
      within(now)
        .getAllByRole("listitem")
        .map(item => item.textContent)
    ).toEqual(["clearCompliance hold", "runningExpiry clock", "awaiting_fundsPhase"]);
    expect(within(now).getByText("Mon 5 Jan 2026, 09:00")).toBeTruthy();
    expect(sim().points[0].session.context.nod_expiryClock).toEqual({ expiresAt: "2026-01-15T09:00:00Z" });
    // The actions island says a run is shown, with Stop.
    const actions = screen.getByRole("group", { name: "Problems and actions" });
    expect(within(actions).getByText("Simulating")).toBeTruthy();
    expect(within(actions).queryByRole("button", { name: /problems$/ })).toBeNull();
  });

  it("keeps the document as it is while simulating: boxes are not selected, edits wait, ⌘Z goes back one step", async () => {
    const user = userEvent.setup();
    await startPayments(user);
    act(() => sim().take({ event: "evt_verifyStarted" }));
    expect(within(panel()).getByText("Lifecycle engine · step 1")).toBeTruthy();
    const doc = editorStore.getState().doc;
    fireEvent.click(box("nod_expiryClock"));
    expect(editorStore.getState().view.selections.cnv_lifecycle ?? []).toEqual([]);
    expect(screen.queryByRole("dialog", { name: "Inspector" })).toBeNull();
    fireEvent.keyDown(box("nod_expiryClock"), { key: "Delete" });
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    expect(sim().points).toHaveLength(1);
    expect(editorStore.getState().doc).toBe(doc);
    await user.click(
      within(screen.getByRole("group", { name: "Problems and actions" })).getByRole("button", { name: "Stop" })
    );
    expect(panel()).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Tools" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Simulate" })));
  });

  it("offers no edit from the project menu, and a Problem's row selects nothing, while a run is shown", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    await user.click(await screen.findByRole("button", { name: /problems$/ }, { timeout: 4000 }));
    act(() => {
      sim().open("cnv_lifecycle");
      sim().begin({ at: "2026-01-05T09:00:00Z" });
    });
    await user.click(screen.getByRole("button", { name: /^Payments/ }));
    for (const name of [/^Rename/, /^Project details/, /^Catalog/, /^Undo/, /^Redo/]) {
      expect(screen.getByRole("menuitem", { name }).getAttribute("aria-disabled")).toBe("true");
    }
    await user.keyboard("{Escape}");
    const problems = screen.getByRole("dialog", { name: "Problems" });
    await user.click(within(problems).getAllByRole("button", { name: /Runtime \/ Lifecycle engine/ })[0]);
    expect(Object.values(editorStore.getState().view.selections).flat()).toEqual([]);
  });

  it("simulates what runs inside a system level, and says why when nothing does", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payments"));
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    expect(sim().canvas).toBe("cnv_lifecycle");
    resetStores();
  });

  it("says why a level where nothing runs cannot be simulated", async () => {
    await openEditor(demoDoc());
    const simulate = screen.getByRole("button", { name: "Simulate" });
    expect(simulate.disabled).toBe(true);
    expect(simulate.title).toBe("Nothing on this level runs: it holds no state machine or flow");
  });

  it("refuses values it cannot read, and says how to write them", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    const start = panel();
    await user.type(within(start).getByLabelText(/^expiresAt/), "next week");
    expect(within(start).getByText("Write a date and time such as 2026-01-05 09:00")).toBeTruthy();
    expect(within(start).getByRole("button", { name: "Start" }).disabled).toBe(true);
  });

  it("starts a flow with the input typed as JSON", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payout-batch"), "/p/prj_payoutBatch/cnv_payOutBatch");
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    const start = panel();
    expect(within(start).getByText("Pay out a batch · a flow")).toBeTruthy();
    expect(within(start).getByText("Starts with one token at the start of the flow.")).toBeTruthy();
    fireEvent.change(within(start).getByLabelText("Input"), { target: { value: '{ "payouts": [] }' } });
    await user.click(within(start).getByRole("button", { name: "Start" }));
    expect(sim().points[0].session.vars.input).toEqual({ payouts: [] });
    expect(within(panel()).getByText("the bank confirms")).toBeTruthy();
  });

  it("simulates in a read-only tab", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    act(() => editorStore.getState().setReadOnly(true));
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    expect(panel()).toBeTruthy();
  });
});
