// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { simulationStore } from "@/simulate/store";

import { placedExample } from "../fixtures.js";
import { openEditor, panel, resetStores } from "./editor.jsx";

const sim = () => simulationStore.getState();
const stage = () => screen.queryByRole("region", { name: /^Presenting / });
const shows = text => within(stage()).getByText(text);

/** The browser's full screen, as the page asks for it and leaves it. */
let full = null;
const fullScreen = () => {
  act(() => {
    full = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
};
const leaveFullScreen = () => {
  act(() => {
    full = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
};

/** Payments on its lifecycle, with the Start panel open. */
async function startPanel(user, change = () => {}) {
  const doc = structuredClone(await placedExample("payments"));
  change(doc);
  await openEditor(doc, "/p/prj_payments/cnv_lifecycle");
  await user.click(screen.getByRole("button", { name: "Simulate" }));
}

beforeEach(() => {
  full = null;
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => full });
  document.documentElement.requestFullscreen = vi.fn(async () => {});
  document.exitFullscreen = vi.fn(async () => {});
});
afterEach(() => {
  delete document.fullscreenElement;
  resetStores();
});

describe("the stage (simulator spec §7.1, mockup 05)", () => {
  it("presents a scenario from its row in full screen, its start first, in the islands' place", async () => {
    const user = userEvent.setup();
    await startPanel(user);
    expect(screen.getByRole("button", { name: "Support" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(stage()).toBeTruthy();
    expect(sim()).toMatchObject({ stage: true, shown: 0 });
    expect(sim().points).toHaveLength(4);
    expect(within(stage()).getByRole("heading", { level: 1 }).textContent).toBe(
      "Payments / Verification pauses the clock"
    );
    expect(within(stage()).getByRole("list", { name: "Levels" }).textContent).toBe("Lifecycle engine");
    shows("Start");
    shows("Mon 5 Jan 2026, 09:00");
    shows("Starts in clear, running and awaiting_funds.");
    expect(panel()).toBeNull();
    expect(screen.queryByRole("group", { name: "Problems and actions" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Support" })).toBeNull();
  });

  it("steps with the keys: → Space Page Down on, ← Page Up back, Home and End", async () => {
    const user = userEvent.setup();
    await startPanel(user);
    await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
    await user.keyboard("{ArrowRight}");
    shows("1 / 3");
    shows("verify.started");
    shows("The payer starts identity verification. The clock stops.");
    expect(within(stage()).getByRole("list", { name: "Levels" }).textContent).toBe("Lifecycle engineExpiry clock");
    await user.keyboard(" ");
    shows("2 / 3");
    shows("2 days later");
    shows("Wed 7 Jan 2026, 09:00");
    await user.keyboard("{PageDown}");
    shows("3 / 3");
    expect(
      screen.getByText("Step 3 of 3: verify.ended. Verification ends; the clock runs again, the deadline extended.")
    ).toBeTruthy();
    await user.keyboard("{ArrowRight}");
    shows("3 / 3");
    await user.keyboard("{PageUp}");
    shows("2 / 3");
    await user.keyboard("{Home}");
    shows("Start");
    await user.keyboard("{ArrowLeft}");
    shows("Start");
    expect(within(stage()).getByRole("button", { name: "Previous step" }).disabled).toBe(true);
    await user.keyboard("{End}");
    shows("3 / 3");
    expect(within(stage()).getByRole("button", { name: "Next step" }).disabled).toBe(true);
    await user.click(within(stage()).getByRole("button", { name: "Previous step" }));
    shows("2 / 3");
  });

  it("goes back to the panel at the same step when full screen is left, or with Esc", async () => {
    const user = userEvent.setup();
    await startPanel(user);
    await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
    fullScreen();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    // The browser leaves full screen on Esc itself, and says so.
    leaveFullScreen();
    expect(stage()).toBeNull();
    expect(sim()).toMatchObject({ stage: false, shown: 2 });
    const steps = within(panel()).getByRole("region", { name: "Steps" });
    await waitFor(() => expect(document.activeElement).toBe(steps.querySelector('[data-step="2"]')));

    await user.click(within(panel()).getByRole("button", { name: "Present Verification pauses the clock" }));
    shows("2 / 3");
    await user.keyboard("{Escape}");
    expect(stage()).toBeNull();
    expect(document.exitFullscreen).not.toHaveBeenCalled();
    await user.click(within(panel()).getByRole("button", { name: "Present Verification pauses the clock" }));
    fullScreen();
    await user.click(within(stage()).getByRole("button", { name: /Exit/ }));
    expect(document.exitFullscreen).toHaveBeenCalled();
    expect(stage()).toBeNull();
  });

  it("presents the scenario a run follows from where it is, its later steps taken first", async () => {
    const user = userEvent.setup();
    await startPanel(user);
    await user.click(screen.getByRole("button", { name: "Run Verification pauses the clock" }));
    await user.click(within(panel()).getByRole("button", { name: /^Next step/ }));
    expect(sim().points).toHaveLength(2);
    await user.click(within(panel()).getByRole("button", { name: "Present Verification pauses the clock" }));
    shows("1 / 3");
    expect(sim().points).toHaveLength(4);
    await user.keyboard("{ArrowRight}");
    shows("2 / 3");
  });

  it("says what a step without a caption did, and the answers it was taken with", async () => {
    const user = userEvent.setup();
    await startPanel(user, doc => {
      for (const step of doc.annotations.scenarios.scn_paysInTime.steps) delete step.caption;
    });
    await user.click(screen.getByRole("button", { name: "Present Pays in time" }));
    await user.keyboard("{End}");
    shows("4 / 4");
    shows("paying_out → completed.");
    shows("Which condition holds in paying_out? full amount → completed");
  });

  it("says why a presented scenario stops before its end, at its last step", async () => {
    const user = userEvent.setup();
    await startPanel(user, doc => delete doc.annotations.scenarios.scn_paysInTime.steps[2].answers);
    await user.click(screen.getByRole("button", { name: "Present Pays in time" }));
    await user.keyboard("{End}");
    shows("2 / 4");
    shows(
      "The design no longer takes step 3: it now asks “Which condition holds in converting?”, which the recording does not answer."
    );
    expect(within(stage()).getByRole("button", { name: "Next step" }).disabled).toBe(true);
  });

  it("puts the focus on the card's next step, where Space goes on once", async () => {
    const user = userEvent.setup();
    await startPanel(user);
    await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(within(stage()).getByRole("button", { name: "Next step" }))
    );
    await user.keyboard(" ");
    shows("1 / 3");
  });

  it("fills the window when full screen is refused, and leaves full screen when the simulation goes", async () => {
    const user = userEvent.setup();
    document.documentElement.requestFullscreen = vi.fn(() => Promise.reject(new Error("Not allowed")));
    await startPanel(user);
    await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
    expect(stage()).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(stage()).toBeNull();

    document.documentElement.requestFullscreen = vi.fn(async () => {});
    await user.click(within(panel()).getByRole("button", { name: "Present Verification pauses the clock" }));
    fullScreen();
    act(() => sim().close());
    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it("says why a scenario can no longer start, with the way out, instead of an empty stage", async () => {
    const user = userEvent.setup();
    const doc = structuredClone(await placedExample("payout-batch"));
    delete doc.annotations.scenarios.scn_aPayoutIsRefused.start.answers;
    await openEditor(doc, "/p/prj_payoutBatch/cnv_payOutBatch");
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    await user.click(screen.getByRole("button", { name: "Present A payout is refused" }));
    expect(stage()).toBeTruthy();
    shows(/^The design can no longer start this scenario: it now asks “.+”, which the recording does not answer\.$/);
    await user.click(within(stage()).getByRole("button", { name: /Exit/ }));
    expect(stage()).toBeNull();
  });
});
