// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { problemStore } from "@/canvas/problemDetails";
import { problemsStore } from "@/problems/store";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

/** Problems about the compliance hold (a box) and the edge into the expiry clock, the worst last as Core may list. */
const PROBLEMS = [
  {
    code: "confidence.low",
    severity: "incomplete",
    target: "nod_complianceHold",
    canvas: "cnv_lifecycle",
    message: 'state "compliance_hold" has confidence: low and needs verification'
  },
  {
    code: "machine.stuck",
    severity: "incomplete",
    target: "nod_complianceHold",
    canvas: "cnv_lifecycle",
    message: 'state "compliance_hold" has no way out'
  },
  {
    code: "machine.sameName",
    severity: "warning",
    target: "nod_complianceHold",
    canvas: "cnv_lifecycle",
    message: 'two states are named "compliance_hold"'
  },
  {
    code: "machine.terminalWithExits",
    severity: "error",
    target: "nod_complianceHold",
    canvas: "cnv_lifecycle",
    message: 'terminal state "compliance_hold" has transitions out'
  },
  {
    code: "transition.noTrigger",
    severity: "incomplete",
    target: "edg_expiryStart",
    canvas: "cnv_lifecycle",
    message: "transition expiry_initial → expiry_clock does not say what triggers it"
  }
];

/** Payments, laid out once (with real timers: the layout waits on them). */
let payments;
beforeAll(async () => {
  payments = await placedExample("payments");
});

function show(problems = PROBLEMS) {
  act(() => editorStore.getState().open(payments, { canvasId: "cnv_lifecycle" }));
  act(() => problemsStore.getState().set(1, problems));
  return render(<Canvas />);
}

const markerOf = target => document.querySelector(`.problem-marker[data-target="${target}"]`);
const popover = name => screen.queryByRole("dialog", { name: `Problems on ${name}` });

/** The pointer comes to rest on a marker, long enough for its Problems to show. */
function rest(marker) {
  fireEvent.pointerOver(marker);
  act(() => vi.advanceTimersByTime(150));
}

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));

afterEach(() => {
  vi.useRealTimers();
  act(() => editorStore.getState().close());
  act(() => problemStore.getState().close());
  act(() => problemsStore.getState().clear());
});

describe("a Problems marker on the canvas", () => {
  it("is marked with its element on a box, and reached through a hit area above the edges on an edge", () => {
    show();
    const box = markerOf("nod_complianceHold");
    expect(box.closest('.react-flow__node[data-id="nod_complianceHold"]')).toBeTruthy();
    expect(box.dataset.severity).toBe("error");
    const edge = markerOf("edg_expiryStart");
    expect(edge.closest(".react-flow__edgelabel-renderer")).toBeTruthy();
  });

  it("is named for screen readers by its severity, on a box and on an edge", () => {
    show();
    const box = document.querySelector('.react-flow__node[data-id="nod_complianceHold"]');
    expect(within(box).getByRole("img", { name: "Problems: Error" })).toBe(markerOf("nod_complianceHold"));
    const edge = document.querySelector('.react-flow__edge[data-id="edg_expiryStart"]');
    expect(within(edge).getByRole("img", { name: "Problems: Incomplete" }).dataset.severity).toBe("incomplete");
  });

  it("shows the element's Problems once the pointer rests on it, worst first, each with its rule", () => {
    show();
    fireEvent.pointerOver(markerOf("nod_complianceHold"));
    act(() => vi.advanceTimersByTime(100));
    expect(popover("compliance_hold")).toBeNull();
    act(() => vi.advanceTimersByTime(50));
    const rows = within(popover("compliance_hold")).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    const [error, warning, low, byLevel] = rows;

    expect(within(error).getByText("Error")).toBeTruthy();
    expect(within(error).getByText('Terminal state "compliance_hold" has transitions out')).toBeTruthy();
    const link = within(error).getByRole("link", { name: "What machine.terminalWithExits means (opens in a new tab)" });
    expect(link.textContent).toBe("machine.terminalWithExits");
    expect(link.getAttribute("href")).toBe("/readme#rule-machine.terminalWithExits");
    expect(link.getAttribute("target")).toBe("_blank");
    // Core's words stay English in every interface language, and say so.
    expect(
      within(error)
        .getByText(/has transitions out/)
        .getAttribute("lang")
    ).toBe("en");

    expect(within(warning).getByText("Warning")).toBeTruthy();
    expect(within(warning).getByText('Two states are named "compliance_hold"')).toBeTruthy();
    expect(within(warning).queryByText(/^Not an error/)).toBeNull();

    // Incomplete says what it means: a rule that follows the level's transitions, or a reminder.
    expect(within(byLevel).getByText("Incomplete")).toBeTruthy();
    expect(within(byLevel).getByText('State "compliance_hold" has no way out')).toBeTruthy();
    expect(
      within(byLevel).getByText(
        "Not an error: this level shows only some of its transitions, so the rule only reminds you."
      )
    ).toBeTruthy();
    expect(within(low).getByText("Incomplete")).toBeTruthy();
    expect(within(low).getByText("Not an error: a reminder of what is still to be decided or specified.")).toBeTruthy();
    expect(within(low).getByRole("link", { name: /^What confidence\.low means/ })).toBeTruthy();
  });

  it("shows an edge's Problems from its marker", () => {
    show();
    rest(markerOf("edg_expiryStart"));
    const details = screen.getByTestId("canvas-problem");
    expect(within(details).getAllByRole("listitem")).toHaveLength(1);
    expect(within(details).getByText("Incomplete")).toBeTruthy();
    expect(
      within(details).getByText("Transition expiry_initial → expiry_clock does not say what triggers it")
    ).toBeTruthy();
  });

  it("stays while the pointer is on the marker or on its Problems, and goes when it leaves both, or on Esc", () => {
    show();
    const marker = markerOf("nod_complianceHold");
    rest(marker);
    fireEvent.pointerOut(marker, { relatedTarget: popover("compliance_hold") });
    fireEvent.pointerEnter(popover("compliance_hold"));
    act(() => vi.advanceTimersByTime(1000));
    expect(popover("compliance_hold")).toBeTruthy();
    fireEvent.pointerLeave(popover("compliance_hold"));
    act(() => vi.advanceTimersByTime(200));
    expect(popover("compliance_hold")).toBeNull();

    rest(marker);
    expect(popover("compliance_hold")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(popover("compliance_hold")).toBeNull();
  });

  it("goes when the element's Problems are gone", () => {
    show();
    rest(markerOf("nod_complianceHold"));
    expect(popover("compliance_hold")).toBeTruthy();
    act(() =>
      problemsStore.getState().set(
        2,
        PROBLEMS.filter(problem => problem.target !== "nod_complianceHold")
      )
    );
    expect(popover("compliance_hold")).toBeNull();
  });

  it("shows the element in the Problems panel", () => {
    show();
    rest(markerOf("nod_complianceHold"));
    fireEvent.click(within(popover("compliance_hold")).getByRole("button", { name: "Show in Problems" }));
    expect(popover("compliance_hold")).toBeNull();
    expect(problemsStore.getState().focus).toBe("nod_complianceHold");
    expect(problemsStore.getState().highlight).toBe("nod_complianceHold");
  });
});
