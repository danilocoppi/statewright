// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";
import { openEditor, panel, resetStores } from "./editor.jsx";

const sim = () => simulationStore.getState();
const INIT = { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };

/** Payments with its lifecycle started from the store, as the Start panel starts it. */
async function running() {
  await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
  act(() => {
    sim().open("cnv_lifecycle");
    sim().begin(INIT);
  });
  return within(panel()).getByRole("region", { name: "What can happen" });
}

const lastPoint = () => sim().points.at(-1);

afterEach(() => resetStores());

describe("what can happen in the panel (simulator spec §6.2)", () => {
  it("lists the moves by region, each with where it leads, and takes the one clicked", async () => {
    const user = userEvent.setup();
    const moves = await running();
    expect(
      within(moves)
        .getAllByRole("group")
        .map(group => group.getAttribute("aria-label"))
    ).toEqual(["Compliance hold", "Expiry clock", "Phase"]);
    const expiry = within(moves).getByRole("group", { name: "Expiry clock" });
    expect(
      within(expiry)
        .getAllByRole("button")
        .map(button => button.textContent)
    ).toEqual([
      "parent.final→ stopped",
      "payin.detected→ stopped",
      "verify.started→ paused",
      "timer.expiryin 10 d→ elapsed"
    ]);
    expect(within(moves).getByRole("button", { name: /quote_ttl/ }).textContent).toBe("quote_ttlin 15 minstays");
    await user.click(within(expiry).getByRole("button", { name: /^verify\.started/ }));
    expect(sim().points).toHaveLength(2);
    expect(lastPoint().session.active).toContain("nod_expiryClock/nod_paused");
    expect(within(panel()).getByText("Lifecycle engine · step 1")).toBeTruthy();
  });

  it("sends any event or call of the catalog, asking first for what it carries — empty allowed", async () => {
    const user = userEvent.setup();
    const moves = await running();
    await user.click(within(moves).getByRole("button", { name: "Other event…" }));
    const picker = screen.getByRole("dialog", { name: "Send an event or a call" });
    await user.keyboard("ops.fail");
    expect(
      within(picker)
        .getAllByRole("option")
        .map(option => option.textContent)
    ).toEqual(["ops.fail"]);
    await user.keyboard("{Enter}");
    const card = within(panel()).getByRole("region", { name: "Payload of ops.fail" });
    expect(within(card).getByLabelText(/^code/).getAttribute("aria-required")).toBe("true");
    expect(document.activeElement).toBe(within(card).getByLabelText(/^code/));
    await user.keyboard("E42{Enter}");
    expect(lastPoint().do).toEqual({ event: "evt_opsFail", payload: { code: "E42" } });
    // It enables nothing from where the run is: a step where nothing happened.
    expect(lastPoint().trace.some(entry => entry.type === "nothing")).toBe(true);

    await user.click(within(panel()).getByRole("button", { name: "Other event…" }));
    await user.keyboard("ops.fail{Enter}");
    await user.click(within(panel()).getByRole("button", { name: "Send" }));
    expect(lastPoint().do).toEqual({ event: "evt_opsFail" });
  });

  it("lets time pass an hour, a day, until the next timer, or until a moment typed", async () => {
    const user = userEvent.setup();
    const moves = await running();
    await user.click(within(moves).getByRole("button", { name: "Let time pass…" }));
    await user.click(within(panel()).getByRole("button", { name: "+1 hour" }));
    expect(lastPoint()).toMatchObject({ do: { wait: "PT1H" }, session: { clock: "2026-01-05T10:00:00Z" } });
    await user.click(within(panel()).getByRole("button", { name: "Let time pass…" }));
    await user.click(within(panel()).getByRole("button", { name: "Until the next timer" }));
    // The next timer is the expiry deadline (the quote's refresh does not arm again: an internal transition).
    expect(lastPoint()).toMatchObject({ do: { wait: "next" }, session: { clock: "2026-01-15T09:00:00Z" } });
    await user.click(within(panel()).getByRole("button", { name: "Let time pass…" }));
    const card = within(panel()).getByRole("region", { name: "Let time pass" });
    await user.type(within(card).getByLabelText("Or a duration, or a date and time"), "2026-01-20 12:00");
    expect(within(card).getByText("Until Tue 20 Jan 2026, 12:00")).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(lastPoint()).toMatchObject({ do: { wait: "P5DT3H" }, session: { clock: "2026-01-20T12:00:00Z" } });
  });

  it("gives the focus back to what opened a card left with Esc, and takes nothing", async () => {
    const user = userEvent.setup();
    const moves = await running();
    await user.click(within(moves).getByRole("button", { name: "Let time pass…" }));
    expect(document.activeElement.textContent).toBe("+1 hour");
    await user.keyboard("{Escape}");
    expect(document.activeElement.textContent).toBe("Let time pass…");
    expect(sim().points).toHaveLength(1);
  });

  it("says the run no longer matches the design when the document changes under it, and offers no move", async () => {
    await running();
    // The stored copy reloaded under the run (another tab handed the project back) no longer has its active state.
    const { doc } = editorStore.getState();
    const changed = applyBatch(doc, [{ type: "node.remove", args: { id: "nod_running", cascade: true } }]).doc;
    act(() => editorStore.getState().open(changed, { canvasId: "cnv_lifecycle" }));
    const moves = within(panel()).getByRole("region", { name: "What can happen" });
    expect(within(moves).getByText("This run no longer matches the design. Start over to run it again.")).toBeTruthy();
    expect(within(moves).queryByRole("button", { name: /^verify\.started/ })).toBeNull();
    expect(within(panel()).getByRole("region", { name: "Now" }).textContent).toContain("nod_expiryClock/nod_running");
  });
});
