// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { simulationStore } from "@/simulate/store";

import { placedExample } from "../fixtures.js";
import { box, openEditor, panel, resetStores } from "./editor.jsx";

const sim = () => simulationStore.getState();
const INIT = { at: "2026-01-05T09:00:00Z", context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } } };
const edge = id => document.querySelector(`.react-flow__edge[data-id="${id}"]`);

/** Payments shown on a level, its lifecycle started. */
async function running(level) {
  await openEditor(await placedExample("payments"), `/p/prj_payments/${level}`);
  act(() => {
    sim().open("cnv_lifecycle");
    sim().begin(INIT);
  });
}

afterEach(() => resetStores());

describe("the run on the canvas (simulator spec §6.3)", () => {
  it("rings the active state with its dot, draws what can fire now in the run's colour, and the rest recedes", async () => {
    await running("cnv_expiryClock");
    await waitFor(() => expect(box("nod_running").querySelector(".sw-run")).toBeTruthy());
    expect(box("nod_running").getAttribute("aria-label")).toBe("running, where the run is now");
    expect(box("nod_paused").classList.contains("sw-recede")).toBe(false);
    expect(box("nod_expiryClockInitial").classList.contains("sw-recede")).toBe(true);
    expect(edge("edg_runningPaused").querySelector(".sw-pill")).toBeTruthy();
    expect(edge("edg_pausedRunning").classList.contains("sw-recede")).toBe(true);
    fireEvent.click(edge("edg_runningPaused").querySelector(".sw-pill"));
    expect(sim().points.at(-1).do).toEqual({ event: "evt_verifyStarted" });
    await waitFor(() => expect(box("nod_paused").querySelector(".sw-run")).toBeTruthy());
  });

  it("lets the person pick in the panel when several moves lead through one edge", async () => {
    await running("cnv_expiryClock");
    await waitFor(() => expect(edge("edg_runningStopped").querySelector(".sw-pill")).toBeTruthy());
    fireEvent.click(edge("edg_runningStopped").querySelector(".sw-pill"));
    expect(sim().points).toHaveLength(1);
    expect(document.activeElement.textContent).toMatch(/^parent\.final/);
  });

  it("marks a box with the run inside it with a pill naming the state, which goes down to it", async () => {
    // Without motion, going down is done at once (an animated zoom waits for frames jsdom does not draw).
    const motion = vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }));
    onTestFinished(() => motion.mockRestore());
    await running("cnv_lifecycle");
    const expiry = box("nod_expiryClock");
    await waitFor(() => expect(within(expiry).getByText("running")).toBeTruthy());
    expect(expiry.getAttribute("aria-label")).toBe("expiry_clock, the run is inside: running");
    fireEvent.click(within(expiry).getByText("running"));
    await waitFor(() => expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_expiryClock"));
  });

  it("numbers the edges a question chooses between, and the numbered label answers it", async () => {
    await running("cnv_crossBorderSend");
    act(() => {
      sim().take({ event: "evt_payinConfirmed" });
      sim().take({ event: "evt_legCompleted" });
    });
    const pill = await waitFor(() => {
      const found = edge("edg_convertingPayingOut").querySelector(".sw-pill");
      expect(found).toBeTruthy();
      return found;
    });
    expect(pill.textContent).toMatch(/^1/);
    fireEvent.click(pill);
    expect(sim().asking).toBeNull();
    expect(sim().points.at(-1).answers).toEqual([
      { kind: "transition", at: "nod_sendCrossBorder/nod_converting", value: "edg_convertingPayingOut" }
    ]);
  });

  it("hides the Problems' markers while the run is shown, and gives them back when it stops", async () => {
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    await waitFor(() => expect(box("nod_expiryClock").querySelector("[data-severity]")).toBeTruthy(), {
      timeout: 4000
    });
    act(() => {
      sim().open("cnv_lifecycle");
      sim().begin(INIT);
    });
    expect(box("nod_expiryClock").querySelector("[data-severity]")).toBeNull();
    act(() => sim().close());
    expect(box("nod_expiryClock").querySelector("[data-severity]")).toBeTruthy();
    expect(panel()).toBeNull();
  });
});
