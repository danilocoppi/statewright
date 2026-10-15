// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { framesOf } from "@/simulate/stage";

import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";
import { box, openEditor, resetStores } from "./editor.jsx";

// The frames are the stage's: worked out only while it is shown, so a long run does not pay for them at each step.
vi.mock("@/simulate/stage", async original => {
  const real = await original();
  return { ...real, framesOf: vi.fn(real.framesOf) };
});

const sim = () => simulationStore.getState();
const edge = id => document.querySelector(`.react-flow__edge[data-id="${id}"]`);
const level = () => editorStore.getState().canvasId;

/** Payments' lifecycle, its scenario where verification pauses the clock presented. */
async function presenting(user) {
  await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
  await user.click(screen.getByRole("button", { name: "Simulate" }));
  await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
}

beforeEach(() => {
  document.documentElement.requestFullscreen = vi.fn(async () => {});
});
afterEach(() => resetStores());

describe("the run on the stage's canvas (simulator spec §7.1)", () => {
  it("follows the story from level to level: each step where its transition is drawn, the start on top", async () => {
    const user = userEvent.setup();
    await presenting(user);
    expect(level()).toBe("cnv_lifecycle");
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(level()).toBe("cnv_expiryClock"));
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(level()).toBe("cnv_crossBorderSend"));
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(level()).toBe("cnv_expiryClock"));
    await user.keyboard("{Home}");
    await waitFor(() => expect(level()).toBe("cnv_lifecycle"));
  });

  it("marks what a step took — its edge, where the run came from and where it is — and nothing to take", async () => {
    const user = userEvent.setup();
    await presenting(user);
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(edge("edg_runningPaused")?.querySelector(".sw-fired")).toBeTruthy());
    expect(box("nod_running").querySelector(".sw-left")).toBeTruthy();
    expect(box("nod_paused").querySelector(".sw-run")).toBeTruthy();
    expect(box("nod_elapsed").classList.contains("sw-recede")).toBe(true);
    expect(edge("edg_pausedRunning").classList.contains("sw-recede")).toBe(true);
    // On the stage, the labels are shown, not taken.
    expect(document.querySelector(".sw-pill")).toBeNull();
  });

  it("plays a step's edges when the story moves on by one, and shows a step at once otherwise", async () => {
    const user = userEvent.setup();
    await presenting(user);
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(edge("edg_runningPaused")?.querySelector(".sw-pulse")).toBeTruthy());
    expect(document.querySelectorAll(".sw-travel")).toHaveLength(1);
    expect(box("nod_paused").querySelector(".sw-run").style.animationDelay).toBe("600ms");
    await user.keyboard("{End}");
    await user.keyboard("{PageUp}");
    await waitFor(() => expect(level()).toBe("cnv_crossBorderSend"));
    await waitFor(() => expect(document.querySelector(".sw-fired")).toBeTruthy());
    expect(document.querySelector(".sw-pulse")).toBeNull();
    expect(document.querySelector(".sw-travel")).toBeNull();
    expect(sim().stage).toBe(true);
  });

  it("works out the frames of a run only while it is presented", async () => {
    const user = userEvent.setup();
    await openEditor(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    await user.click(screen.getByRole("button", { name: "Run Verification pauses the clock" }));
    await user.click(screen.getByRole("button", { name: /^Next step/ }));
    await user.click(screen.getByRole("button", { name: /^Next step/ }));
    expect(framesOf).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Present Verification pauses the clock" }));
    expect(framesOf).toHaveBeenCalled();
  });
});
