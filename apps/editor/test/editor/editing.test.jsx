// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { editingStore } from "@/editing/state";
import EditorPage from "@/features/editor/EditorPage";
import { memoryRepository } from "@/persistence/repository";
import { useView, VIEW_DEFAULTS } from "@/stores/view";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

async function openPayments(path = "/p/prj_payments") {
  const repository = { ...memoryRepository(), persistent: true };
  await repository.save(await placedExample("payments"));
  render(
    <RepositoryContext value={repository}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/p/:projectId/:canvasId?" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    </RepositoryContext>
  );
  await screen.findByTestId("canvas");
  await waitFor(() => expect(box("nod_scheduler")).toBeTruthy());
}

const box = id => document.querySelector(`.react-flow__node[data-id="${id}"]`);
const nodes = () => editorStore.getState().doc.canvases.cnv_runtime.nodes;
const selection = () => editorStore.getState().view.selections.cnv_runtime ?? [];

/** A clipboard event as the browser sends it, with its data. */
function clipboardEvent(type, text = "") {
  const data = new Map([["text/plain", text]]);
  const event = new Event(type, { bubbles: true, cancelable: true });
  event.clipboardData = {
    getData: format => data.get(format) ?? "",
    setData: (format, value) => data.set(format, value)
  };
  return { event, data };
}

afterEach(() => {
  editingStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("the canvas menu", () => {
  it("selects what is right-clicked and offers what can be done to it, aligning two boxes as one change", async () => {
    const user = userEvent.setup();
    await openPayments();
    act(() => editorStore.getState().select(["nod_clients"]));
    fireEvent.contextMenu(box("nod_scheduler"));
    expect(selection()).toEqual(["nod_scheduler"]);
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /Align left/ })).toBeNull();
    await user.keyboard("{Escape}");
    act(() => editorStore.getState().select(["nod_clients", "nod_scheduler"]));
    fireEvent.contextMenu(box("nod_scheduler"));
    await user.click(screen.getByRole("menuitem", { name: /Align left/ }));
    const layout = editorStore.getState().doc.layout.canvases.cnv_runtime.nodes;
    expect(layout.nod_scheduler.x).toBe(layout.nod_clients.x);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens from the keyboard under the selection, and offers to paste and select all on the empty canvas", async () => {
    const user = userEvent.setup();
    await openPayments();
    act(() => editorStore.getState().select(["nod_scheduler"]));
    fireEvent.keyDown(window, { key: "F10", shiftKey: true });
    expect(await screen.findByRole("menu", { name: "Canvas" })).toBeTruthy();
    await user.keyboard("{Escape}");
    fireEvent.contextMenu(document.querySelector(".react-flow__pane"));
    expect(selection()).toEqual([]);
    await user.click(screen.getByRole("menuitem", { name: /Select all/ }));
    expect(selection()).toHaveLength(8);
  });
});

describe("the actions island", () => {
  it("undoes and redoes what it says it will, and lays the level out again as one change", async () => {
    const user = userEvent.setup();
    await openPayments("/p/prj_payments/cnv_runtime");
    expect(screen.getByRole("button", { name: "Nothing to undo" }).disabled).toBe(true);
    act(() => editorStore.getState().select(["nod_scheduler"]));
    fireEvent.keyDown(document.body, { key: "Delete" });
    await user.click(screen.getByRole("button", { name: "Undo Delete (Ctrl+Z)" }));
    expect(nodes().nod_scheduler).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Redo Delete (Ctrl+Y)" }));
    expect(nodes().nod_scheduler).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "Auto-layout" }));
    await waitFor(() =>
      expect(editorStore.getState().history.past.map(entry => entry.label)).toEqual(["Delete", "Lay out again"])
    );
  });

  it("fits the level with Shift+1 and zooms with Ctrl and + or −", async () => {
    // Without motion each zoom is one jump, measured once it is made: an animated zoom waits on frames a busy machine
    // gives late, and starts from wherever the one before it has got to.
    const motion = vi.spyOn(window, "matchMedia").mockImplementation(query => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener() {},
      removeEventListener() {}
    }));
    onTestFinished(() => motion.mockRestore());
    await openPayments("/p/prj_payments/cnv_runtime");
    const zoom = () =>
      Number(document.querySelector(".react-flow__viewport").style.transform.match(/scale\(([0-9.]+)\)/)[1]);
    const fit = () => fireEvent.keyDown(document.body, { key: "!", shiftKey: true, code: "Digit1" });
    const initial = zoom();
    fireEvent.keyDown(document.body, { key: "=", ctrlKey: true });
    await waitFor(() => expect(zoom()).toBeGreaterThan(initial));
    const zoomed = zoom();
    fit();
    await waitFor(() => expect(zoom()).toBeLessThan(zoomed));
    const fitted = zoom();
    fireEvent.keyDown(document.body, { key: "-", ctrlKey: true });
    await waitFor(() => expect(zoom()).toBeLessThan(fitted));
    fit();
    await waitFor(() => expect(zoom()).toBeCloseTo(fitted, 2));
  });
});

describe("inserting by name", () => {
  it("opens with / in the middle of the view, and the hint that says so goes once it has been used", async () => {
    await openPayments("/p/prj_payments/cnv_runtime");
    expect(screen.getByText(/to insert anything by name/)).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(await screen.findByRole("dialog", { name: "Insert" })).toBeTruthy();
    expect(screen.queryByText(/to insert anything by name/)).toBeNull();
  });
});

describe("tools", () => {
  it("takes a tool with its key and puts it down with Esc, before anything else Esc does", async () => {
    await openPayments("/p/prj_payments/cnv_runtime");
    const queue = screen.getByRole("button", { name: "Queue" });
    act(() => editorStore.getState().select(["nod_scheduler"]));
    fireEvent.keyDown(document.body, { key: "q" });
    expect(queue.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(queue.getAttribute("aria-pressed")).toBe("false");
    expect(selection()).toEqual(["nod_scheduler"]);
  });
});

describe("triggers", () => {
  it("opens the selected edge's trigger editor with Enter, and from the canvas menu", async () => {
    const user = userEvent.setup();
    await openPayments();
    const [edgeId, edge] = Object.entries(editorStore.getState().doc.canvases.cnv_runtime.edges)[0];
    const names = [edge.from, edge.to].map(id => nodes()[id].name);
    const question = `What does ${names[0]} send to ${names[1]}?`;
    act(() => editorStore.getState().select([edgeId]));
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: question })).toBeTruthy();
    await user.keyboard("{Escape}");
    fireEvent.contextMenu(document.querySelector(`.react-flow__edge[data-id="${edgeId}"]`));
    await user.click(screen.getByRole("menuitem", { name: /Edit trigger/ }));
    expect(await screen.findByRole("dialog", { name: question })).toBeTruthy();
  });
});

describe("keys for the canvas while something is open over it", () => {
  it("leaves select all, duplicate, undo and redo alone while the trigger editor or insert by name is open", async () => {
    await openPayments();
    const [edgeId] = Object.keys(editorStore.getState().doc.canvases.cnv_runtime.edges);
    act(() => editorStore.getState().dispatch([{ type: "project.update", args: { set: { name: "Renamed" } } }], {}));
    act(() => editorStore.getState().select([edgeId]));
    fireEvent.keyDown(document.body, { key: "Enter" });
    const popovers = [
      () => screen.findByRole("dialog", { name: /^What does/ }),
      async () => {
        await act(async () => editingStore.getState().close());
        fireEvent.keyDown(document.body, { key: "/" });
        return screen.findByRole("dialog", { name: /Insert/ });
      }
    ];
    for (const open of popovers) {
      const popover = await open();
      const before = editorStore.getState();
      for (const key of ["a", "d", "z", "y"]) {
        fireEvent.keyDown(popover.querySelector("button") ?? document.body, { key, ctrlKey: true });
        fireEvent.keyDown(document.body, { key, ctrlKey: true });
      }
      expect(editorStore.getState().doc).toBe(before.doc);
      expect(selection()).toEqual(before.view.selections.cnv_runtime ?? []);
    }
  });
});

describe("Enter with an edge selected", () => {
  it("opens the edge's trigger even when a box has the focus, and the box's level otherwise", async () => {
    await openPayments("/p/prj_payments/cnv_runtime");
    const [edgeId] = Object.keys(editorStore.getState().doc.canvases.cnv_runtime.edges);
    box("nod_lifecycleEngine").focus();
    act(() => editorStore.getState().select([edgeId]));
    fireEvent.keyDown(document.activeElement, { key: "Enter" });
    expect(await screen.findByRole("dialog", { name: /^What does/ })).toBeTruthy();
    expect(editorStore.getState().canvasId).toBe("cnv_runtime");
  });
});

describe("renaming", () => {
  it("renames the selected box with F2, and from the canvas menu", async () => {
    const user = userEvent.setup();
    await openPayments();
    act(() => editorStore.getState().select(["nod_scheduler"]));
    fireEvent.keyDown(window, { key: "F2" });
    // The name in the box (the inspector beside it has a name field too).
    const canvas = within(screen.getByTestId("canvas"));
    const field = await canvas.findByRole("textbox", { name: "Name" });
    await user.type(field, "{Escape}");
    fireEvent.contextMenu(box("nod_scheduler"));
    await user.click(screen.getByRole("menuitem", { name: /Rename/ }));
    const again = await canvas.findByRole("textbox", { name: "Name" });
    expect(document.activeElement).toBe(again);
    await user.clear(again);
    await user.type(again, "Timers{Enter}");
    expect(nodes().nod_scheduler.name).toBe("Timers");
  });
});

describe("editing with the keyboard", () => {
  it("deletes the selected box with Delete, and brings it back with undo", async () => {
    await openPayments();
    act(() => editorStore.getState().select(["nod_scheduler"]));
    fireEvent.keyDown(window, { key: "Delete" });
    expect(nodes().nod_scheduler).toBeUndefined();
    await waitFor(() => expect(box("nod_scheduler")).toBeNull());
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(nodes().nod_scheduler).toBeTruthy();
  });

  it("selects a focused box with Space and walks to a connected box with the arrows", async () => {
    await openPayments();
    box("nod_lifecycleEngine").focus();
    fireEvent.keyDown(document.activeElement, { key: "ArrowRight" });
    const reached = document.activeElement.dataset.id;
    expect(reached).not.toBe("nod_lifecycleEngine");
    expect(
      Object.values(editorStore.getState().doc.canvases.cnv_runtime.edges).some(
        edge =>
          (edge.from === "nod_lifecycleEngine" && edge.to === reached) ||
          (edge.to === "nod_lifecycleEngine" && edge.from === reached)
      )
    ).toBe(true);
    fireEvent.keyDown(document.activeElement, { key: " " });
    expect(selection()).toEqual([reached]);
  });

  it("copies the selection to the clipboard as text, and pastes it as new boxes", async () => {
    await openPayments();
    act(() => editorStore.getState().select(["nod_scheduler"]));
    const copy = clipboardEvent("copy");
    document.dispatchEvent(copy.event);
    expect(copy.event.defaultPrevented).toBe(true);
    expect(JSON.parse(copy.data.get("text/plain")).format).toBe("statewright/clip");
    document.dispatchEvent(clipboardEvent("paste", copy.data.get("text/plain")).event);
    const [pasted] = selection();
    expect(pasted).not.toBe("nod_scheduler");
    expect(nodes()[pasted].name).toBe(nodes().nod_scheduler.name);
  });

  it("leaves copy and paste to the browser in a text field, and ignores pasted text that is not Statewright's", async () => {
    await openPayments();
    act(() => editorStore.getState().select(["nod_scheduler"]));
    const field = document.body.appendChild(document.createElement("input"));
    const copy = clipboardEvent("copy");
    field.dispatchEvent(copy.event);
    expect(copy.event.defaultPrevented).toBe(false);
    const paste = clipboardEvent("paste", "hello");
    document.dispatchEvent(paste.event);
    expect(paste.event.defaultPrevented).toBe(false);
    expect(Object.keys(nodes())).toHaveLength(8);
    field.remove();
  });
});
