// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it, vi } from "vitest";

import { changedOf } from "@/agent/changes";
import { MARK_MS, announce, markChanged, noticeStore } from "@/agent/notice";
import { connection } from "@/agent/connection";
import { Canvas } from "@/canvas/Canvas";
import { conversationStore } from "@/conversation/store";
import { Toaster } from "@/components/ui/Toaster";
import { EditActions } from "@/features/editor/EditActions";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { placedExample, readExample } from "../fixtures.js";

const LATE = [
  { type: "node.add", args: { canvas: "cnv_expiryClock", node: { kind: "state", name: "late" } } },
  { type: "edge.add", args: { canvas: "cnv_expiryClock", edge: { from: "nod_running", to: "nod_late" } } }
];

/** An agent's batch, recorded as the history's last entry and announced, as the Editor's host does. */
function agentApplies(commands, label = "A state for late payers") {
  const result = editorStore.getState().dispatch(commands, { label, origin: "ai", agent: "claude-code" });
  expect(result.ok).toBe(true);
  act(() => announce(editorStore.getState().history.past.at(-1)));
}

const toasts = () => useToastStore.getState().items;

afterEach(() => {
  vi.useRealTimers();
  act(() => {
    simulationStore.getState().close();
    editorStore.getState().close();
    noticeStore.setState({ marked: null });
    useToastStore.setState({ items: [] });
  });
});

describe("what an agent's change touched (AI interface spec §7.3)", () => {
  it("names the boxes and edges a change created, changed or moved, by level; not those it removed", () => {
    const doc = readExample("payments");
    const { patches } = applyBatch(doc, [
      ...LATE,
      { type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } },
      { type: "catalog.add", args: { collection: "events", item: { name: "late.notice" } } },
      { type: "node.remove", args: { id: "nod_elapsed" } },
      { type: "layout.node.set", args: { canvas: "cnv_lifecycle", id: "nod_expiryClock", x: 10, y: 20 } }
    ]);
    expect(changedOf(patches)).toEqual({
      cnv_expiryClock: ["edg_runningLate", "nod_late", "nod_paused"],
      cnv_lifecycle: ["nod_expiryClock"]
    });
  });
});

describe("an agent's change, made visible (AI interface spec §7.3)", () => {
  it("records the change as the agent's, and says so in the Undo button", () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" }));
    agentApplies(LATE);
    expect(editorStore.getState().history.past.at(-1)).toMatchObject({ origin: "ai", agent: "claude-code" });
    render(<EditActions mac={false} />);
    expect(screen.getByRole("button", { name: "Undo A state for late payers (AI) (Ctrl+Z)" })).toBeTruthy();
  });

  it("makes what it created or changed glow on the level shown for 2 s", async () => {
    const doc = await placedExample("payments");
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_expiryClock" }));
    const { container } = render(<Canvas />);
    vi.useFakeTimers();
    // Placed by the batch itself, the new state is drawn at once.
    agentApplies([
      ...LATE,
      { type: "layout.node.set", args: { canvas: "cnv_expiryClock", id: "nod_late", x: 640, y: 320 } },
      { type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }
    ]);
    const glowing = () => [...container.querySelectorAll(".sw-ai")].map(element => element.dataset.id ?? element.id);
    expect(glowing()).toEqual(expect.arrayContaining(["nod_paused", "nod_late"]));
    expect(container.querySelector('.react-flow__edge.sw-ai[data-id="edg_runningLate"]')).toBeTruthy();
    act(() => vi.advanceTimersByTime(MARK_MS));
    expect(container.querySelectorAll(".sw-ai")).toHaveLength(0);
  });

  it("says who did what in a toast, whose Undo undoes the change", () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" }));
    render(<Toaster />);
    agentApplies(LATE);
    expect(screen.getByRole("status").textContent).toContain("AI · claude-code: A state for late payers");
    expect(screen.queryByRole("button", { name: "Show" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_late).toBeUndefined();
    expect(toasts()).toEqual([]);
  });

  it("offers Show when the change is on another level, and shows it glowing there", () => {
    vi.useFakeTimers();
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_lifecycle" }));
    render(<Toaster />);
    agentApplies(LATE);
    act(() => vi.advanceTimersByTime(MARK_MS));
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(editorStore.getState().canvasId).toBe("cnv_expiryClock");
    expect(noticeStore.getState().marked.canvases.cnv_expiryClock).toContain("nod_late");
  });

  it("takes the toast away once the change is no longer the last one, so its Undo undoes nothing else", () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" }));
    agentApplies(LATE);
    expect(toasts()).toHaveLength(1);
    act(() => {
      editorStore.getState().dispatch([{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }], {
        label: "Rename"
      });
    });
    expect(toasts()).toEqual([]);
  });

  it("says why its Undo cannot undo the change while simulating, or in a tab that only reads", () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" }));
    agentApplies(LATE);
    const entry = editorStore.getState().history.past.at(-1);
    act(() => simulationStore.getState().open("cnv_lifecycle"));
    act(() => toasts()[0].actions[0].onClick());
    expect(editorStore.getState().history.past.at(-1)).toBe(entry);
    expect(toasts().at(-1)).toMatchObject({ tone: "info", message: "Stop simulating to undo this change." });
    act(() => simulationStore.getState().close());
    act(() => editorStore.getState().setReadOnly(true));
    act(() => toasts()[0].actions[0].onClick());
    expect(editorStore.getState().history.past.at(-1)).toBe(entry);
    expect(toasts().at(-1)).toMatchObject({
      tone: "info",
      message: "This tab only reads the project: undo the change in the tab that edits it."
    });
  });

  it("names a change of an agent that gave no name", () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" }));
    editorStore.getState().dispatch(LATE, { label: "Late", origin: "ai" });
    act(() => announce(editorStore.getState().history.past.at(-1)));
    expect(toasts()[0].lead).toBe("AI · an agent");
  });

  it("makes the same elements glow again when they change again", () => {
    act(() => markChanged({ cnv_a: ["nod_a"] }));
    const first = noticeStore.getState().marked.key;
    act(() => markChanged({ cnv_a: ["nod_a"] }));
    expect(noticeStore.getState().marked.key).toBe(first + 1);
  });

  it("writes the change into the conversation instead of a toast while an agent is paired (collaboration spec §4)", async () => {
    const doc = await placedExample("payments");
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_expiryClock" }));
    act(() => connection.store.setState({ status: "connected", agent: "claude-code" }));
    try {
      agentApplies(LATE);
      expect(toasts()).toEqual([]);
      expect(conversationStore.getState().lines).toMatchObject([
        {
          kind: "change",
          label: "A state for late payers",
          agent: "claude-code",
          canvases: { cnv_expiryClock: expect.any(Array) }
        }
      ]);
    } finally {
      act(() => {
        connection.store.setState({ status: "off", agent: null });
        conversationStore.getState().clear();
      });
    }
  });
});
