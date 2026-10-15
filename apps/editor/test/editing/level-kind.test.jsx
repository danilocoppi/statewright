// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { editingStore } from "@/editing/state";
import { ToolDock } from "@/editing/ToolDock";
import { newProject } from "@/files/new-project";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

/** The dock on a level of a document, with `selected` selected there. */
function dock(doc, canvasId, selected = []) {
  act(() => editorStore.getState().open(doc, { canvasId }));
  act(() => editorStore.getState().select(selected));
  return render(<ToolDock />);
}

const control = () => screen.getByRole("button", { name: /^Level kind:/ });
const state = () => editorStore.getState();

/** Open the control's menu and give its items. */
async function openMenu(user) {
  await user.click(control());
  return within(screen.getByRole("menu")).getAllByRole("menuitem");
}

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
  inspectorStore.getState().reset();
  simulationStore.setState({ mode: null });
  useView.setState(VIEW_DEFAULTS);
});

describe("the level's kind, under the dock's tools", () => {
  it("names the kind of the level shown, with its icon, and says what it is on hover", async () => {
    const user = userEvent.setup();
    for (const [kind, label] of [
      ["system", "System"],
      ["machine", "State machine"],
      ["flow", "Flow"]
    ]) {
      const { unmount } = dock(newProject({ name: "Acme Billing", kind }, new Set()));
      expect(control().getAttribute("aria-label")).toBe(`Level kind: ${label}`);
      expect(control().textContent).toBe(label);
      expect(control().getAttribute("aria-haspopup")).toBe("menu");
      expect(control().querySelector("svg")).not.toBeNull();
      unmount();
    }
    dock(readExample("payments"), "cnv_runtime");
    await user.hover(control());
    expect(screen.getByRole("tooltip").textContent).toBe("This level is a system: its tools are a system's");
  });

  it("asks for a box when nothing, several boxes or a box that cannot hold a level is selected", async () => {
    const user = userEvent.setup();
    for (const [canvasId, selected] of [
      ["cnv_runtime", []],
      ["cnv_runtime", ["nod_scheduler", "nod_providers"]],
      ["cnv_expiryClock", ["nod_expiryClockInitial"]]
    ]) {
      const { unmount } = dock(readExample("payments"), canvasId, selected);
      const items = await openMenu(user);
      // The level itself can always be changed to mixed (mixed levels spec §6).
      expect(items.map(item => item.querySelector(".text-ink")?.textContent ?? item.textContent)).toEqual([
        "Select a box to create a level inside it",
        "Change to mixed"
      ]);
      expect(items[0].getAttribute("aria-disabled")).toBe("true");
      unmount();
    }
  });

  it("offers the kinds of level a box with nothing inside can hold, each with a hint", async () => {
    const user = userEvent.setup();
    const { unmount } = dock(readExample("payments"), "cnv_runtime", ["nod_scheduler"]);
    await openMenu(user);
    const create = screen.getByRole("group", { name: "Create inside Scheduler" });
    expect(within(create).getByText("Create inside Scheduler")).toBeTruthy();
    const items = within(create).getAllByRole("menuitem");
    expect(items.map(item => item.querySelector(".text-ink").textContent)).toEqual([
      "Flow",
      "State machine",
      "System",
      "Mixed"
    ]);
    expect(items.every(item => item.querySelector("svg") && item.querySelector(".text-muted").textContent)).toBe(true);
    unmount();

    // A state can hold only a state machine (or a mixed level, which runs as one).
    dock(readExample("payments"), "cnv_expiryClock", ["nod_running"]);
    expect((await openMenu(user)).map(item => item.querySelector(".text-ink").textContent)).toEqual([
      "State machine",
      "Mixed",
      "Change to mixed"
    ]);
  });

  it("creates the level as the inspector's Add does, as one change, opens it, and Undo takes it back", async () => {
    const user = userEvent.setup();
    // The inspector's Add a flow inside, for comparison.
    act(() => useView.setState({ inspectorDetails: true }));
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    const inspector = render(<Inspector />);
    act(() => inspectorStore.getState().show("nod_scheduler"));
    await user.click(screen.getByRole("button", { name: "Flow" }));
    const byInspector = { doc: state().doc, entry: state().history.past.at(-1) };
    inspector.unmount();

    dock(readExample("payments"), "cnv_runtime", ["nod_scheduler"]);
    await openMenu(user);
    await user.click(screen.getByRole("menuitem", { name: /^Flow/ }));
    expect(state().doc).toEqual(byInspector.doc);
    const [entry] = state().history.past;
    expect(state().history.past).toHaveLength(1);
    expect(entry.label).toBe("Add an interior");
    expect(entry.commands).toEqual(byInspector.entry.commands);
    const inside = state().doc.canvases.cnv_runtime.nodes.nod_scheduler.inner.canvas;
    expect(state().doc.canvases[inside]).toMatchObject({ kind: "flow", name: "Scheduler" });
    expect(state().canvasId).toBe(inside);
    expect(screen.getByRole("button", { name: "If / else" })).toBeTruthy();
    expect(control().textContent).toBe("Flow");

    act(() => editorStore.getState().undo());
    expect(state().canvasId).toBe("cnv_runtime");
    expect(state().doc.canvases.cnv_runtime.nodes.nod_scheduler).not.toHaveProperty("inner");
    expect(control().textContent).toBe("System");
  });

  it("opens the level a box already has inside, its own or a reusable part's, and offers no other", async () => {
    const user = userEvent.setup();
    const { unmount } = dock(readExample("payments"), "cnv_runtime", ["nod_lifecycleEngine"]);
    const items = await openMenu(user);
    expect(items.map(item => item.querySelector(".text-ink").textContent)).toEqual([
      "Open Lifecycle engine",
      "Change to mixed"
    ]);
    await user.click(items[0]);
    expect(state().canvasId).toBe("cnv_lifecycle");
    unmount();

    dock(readExample("payments"), "cnv_lifecycle", ["nod_expiryClock"]);
    await user.click((await openMenu(user))[0]);
    expect(state().canvasId).toBe("cnv_expiryClock");
    expect(state().history.past).toHaveLength(0);
  });

  it("creates nothing in a read-only tab or while simulating, and still opens a level", async () => {
    const user = userEvent.setup();
    for (const hold of [
      () => editorStore.getState().setReadOnly(true),
      () => simulationStore.setState({ mode: "start" })
    ]) {
      const { unmount } = dock(readExample("payments"), "cnv_runtime", ["nod_scheduler"]);
      act(hold);
      const items = await openMenu(user);
      expect(items).toHaveLength(5);
      expect(items.every(item => item.getAttribute("aria-disabled") === "true")).toBe(true);
      await user.click(items[0]);
      expect(state().doc.canvases.cnv_runtime.nodes.nod_scheduler).not.toHaveProperty("inner");
      unmount();
      act(() => simulationStore.setState({ mode: null }));
    }
    dock(readExample("payments"), "cnv_runtime", ["nod_lifecycleEngine"]);
    act(() => editorStore.getState().setReadOnly(true));
    await user.click((await openMenu(user))[0]);
    expect(state().canvasId).toBe("cnv_lifecycle");
  });

  it("is reached along the dock with the arrows, opened with Enter, and closed with Esc back on it", async () => {
    const user = userEvent.setup();
    dock(readExample("payments"), "cnv_runtime", ["nod_scheduler"]);
    // The dock starts with its tabs: up from the first one is the level's kind, at the bottom.
    const first = screen.getByRole("tab", { name: "System elements" });
    act(() => first.focus());
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(control());
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(first);
    await user.keyboard("{ArrowUp}{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /^Flow/ }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(control());
  });
});
