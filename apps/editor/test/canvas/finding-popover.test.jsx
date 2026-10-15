// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { applyBatch } from "statewright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { findingStore } from "@/canvas/findings";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

/** Get paid, with two findings about the processing box — one with evidence in code and in a document. */
async function withFindings() {
  return applyBatch(await placedExample("get-paid-as-built"), [
    {
      type: "finding.upsert",
      args: {
        id: "fnd_H1",
        finding: {
          code: "H1",
          title: "advanceStatus trusts its callers",
          severity: "high",
          description: "Eight call sites move transactions without checking the table.",
          targets: ["nod_processing"],
          source: "audit",
          evidence: [
            { kind: "code", path: "core.js", lines: "34-52" },
            { kind: "doc", url: "https://example.com/runbook", title: "Runbook" }
          ]
        }
      }
    },
    {
      type: "finding.upsert",
      args: {
        id: "fnd_H2",
        finding: {
          code: "H2",
          title: "Seven updates skip the table",
          severity: "critical",
          targets: ["nod_processing"],
          source: "conformance",
          evidence: [{ kind: "code", path: "payouts/update.js", lines: "112", symbol: "settle" }]
        }
      }
    }
  ]).doc;
}

function show(doc, { inspector = false } = {}) {
  act(() => editorStore.getState().open(doc, { canvasId: "cnv_transaction" }));
  return render(
    <>
      <Canvas />
      {inspector && <Inspector />}
    </>
  );
}

const badgeOf = (container, target) => container.querySelector(`.badge[data-target="${target}"]`);
const popover = () => screen.queryByRole("dialog", { name: "Findings on processing" });

/** The pointer comes to rest on a badge, long enough for its findings to show. */
function rest(badge) {
  fireEvent.pointerOver(badge.querySelector("rect"));
  act(() => vi.advanceTimersByTime(150));
}

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));

afterEach(() => {
  vi.useRealTimers();
  act(() => editorStore.getState().close());
  act(() => findingStore.getState().close());
  inspectorStore.getState().reset();
});

describe("a finding badge on the canvas", () => {
  it("is marked with its element and codes, without the browser's tooltip the Editor replaces", async () => {
    const { container } = show(await withFindings());
    const badge = badgeOf(container, "nod_processing");
    expect(badge.getAttribute("data-codes")).toBe("H1 H2");
    expect(badge.querySelector("title")).toBeNull();
  });

  it("shows its findings once the pointer rests on it: severity, code, title, description, source, evidence", async () => {
    const { container } = show(await withFindings());
    fireEvent.pointerOver(badgeOf(container, "nod_processing").querySelector("rect"));
    act(() => vi.advanceTimersByTime(100));
    expect(popover()).toBeNull();
    act(() => vi.advanceTimersByTime(50));
    const [first, second] = within(popover()).getAllByRole("listitem");
    expect(within(popover()).getAllByRole("listitem")).toHaveLength(2);

    expect(within(first).getByText("High")).toBeTruthy();
    expect(within(first).getByText("H1")).toBeTruthy();
    expect(within(first).getByRole("heading", { name: "advanceStatus trusts its callers" })).toBeTruthy();
    expect(within(first).getByText("Eight call sites move transactions without checking the table.")).toBeTruthy();
    expect(within(first).getByText("audit")).toBeTruthy();
    expect(within(first).getByText("core.js:34-52")).toBeTruthy();
    expect(within(first).getByText("Runbook")).toBeTruthy();

    expect(within(second).getByText("Critical")).toBeTruthy();
    expect(within(second).getByText("H2")).toBeTruthy();
    expect(within(second).getByRole("heading", { name: "Seven updates skip the table" })).toBeTruthy();
    expect(within(second).getByText("conformance")).toBeTruthy();
    expect(within(second).getByText("payouts/update.js:112")).toBeTruthy();
    expect(within(second).getByText("settle")).toBeTruthy();
  });

  it("stays while the pointer is on the badge or on its findings, and goes when it leaves both, or on Esc", async () => {
    const { container } = show(await withFindings());
    const badge = badgeOf(container, "nod_processing");
    rest(badge);
    fireEvent.pointerOut(badge.querySelector("rect"), { relatedTarget: popover() });
    fireEvent.pointerEnter(popover());
    act(() => vi.advanceTimersByTime(1000));
    expect(popover()).toBeTruthy();
    fireEvent.pointerLeave(popover());
    act(() => vi.advanceTimersByTime(200));
    expect(popover()).toBeNull();

    // Leaving the badge for the canvas, it goes too; resting again, it comes back, and Esc closes it.
    rest(badge);
    fireEvent.pointerOut(badge.querySelector("rect"));
    act(() => vi.advanceTimersByTime(200));
    expect(popover()).toBeNull();
    rest(badge);
    expect(popover()).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(popover()).toBeNull();
  });

  it("shows the element in the inspector, selected, on its details", async () => {
    show(await withFindings(), { inspector: true });
    rest(badgeOf(document.body, "nod_processing"));
    fireEvent.click(within(popover()).getByRole("button", { name: "Show in the inspector" }));
    expect(popover()).toBeNull();
    expect(editorStore.getState().view.selections.cnv_transaction).toEqual(["nod_processing"]);
    const inspector = screen.getByRole("dialog", { name: "Inspector" });
    expect(within(inspector).getByText("Findings", { selector: "span" })).toBeTruthy();
    expect(within(inspector).getByRole("button", { name: /Seven updates skip the table/ })).toBeTruthy();
  });
});
