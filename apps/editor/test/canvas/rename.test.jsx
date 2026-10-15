// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

const box = (container, id) => container.querySelector(`.react-flow__node[data-id="${id}"]`);

function show(doc, canvasId, options = {}) {
  act(() => editorStore.getState().open(doc, { canvasId, ...options }));
  return render(<Canvas />);
}

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
});

describe("renaming in place", () => {
  it("renames a box with a double-click, keeping the new name with Enter as one undoable change", async () => {
    const user = userEvent.setup();
    const { container } = show(await placedExample("payments"), "cnv_runtime");
    fireEvent.doubleClick(box(container, "nod_scheduler"));
    const field = await screen.findByRole("textbox", { name: "Name" });
    expect(field.value).toBe("Scheduler");
    expect(document.activeElement).toBe(field);
    await user.clear(field);
    await user.type(field, "Timer service{Enter}");
    const { doc, history } = editorStore.getState();
    expect(doc.canvases.cnv_runtime.nodes.nod_scheduler.name).toBe("Timer service");
    expect(history.past.map(entry => entry.label)).toEqual(["Rename"]);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.activeElement).toBe(box(container, "nod_scheduler"));
  });

  it("drops what was typed with Esc, and keeps it when the field loses the focus", async () => {
    const user = userEvent.setup();
    const { container } = show(await placedExample("payments"), "cnv_runtime");
    fireEvent.doubleClick(box(container, "nod_scheduler"));
    await user.type(await screen.findByRole("textbox", { name: "Name" }), "Clock{Escape}");
    expect(editorStore.getState().doc.canvases.cnv_runtime.nodes.nod_scheduler.name).toBe("Scheduler");
    fireEvent.doubleClick(box(container, "nod_scheduler"));
    const field = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(field);
    await user.type(field, "Clock");
    act(() => field.blur());
    expect(editorStore.getState().doc.canvases.cnv_runtime.nodes.nod_scheduler.name).toBe("Clock");
  });

  it("keeps a state's name when its field is emptied", async () => {
    const user = userEvent.setup();
    const { container } = show(await placedExample("get-paid-as-built"), "cnv_open");
    fireEvent.doubleClick(box(container, "nod_created"));
    const field = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(field);
    await user.keyboard("{Enter}");
    expect(editorStore.getState().doc.canvases.cnv_open.nodes.nod_created.name).toBe("created");
    expect(editorStore.getState().history.past).toEqual([]);
  });

  it("rewrites a note's text, on several lines", async () => {
    const user = userEvent.setup();
    let doc = await placedExample("payments");
    doc = applyBatch(doc, [
      { type: "note.add", args: { id: "nte_ask", note: { canvas: "cnv_runtime", text: "Ask ops" } } },
      { type: "layout.note.set", args: { canvas: "cnv_runtime", id: "nte_ask", x: 0, y: 400 } }
    ]).doc;
    const { container } = show(doc, "cnv_runtime");
    await waitFor(() => expect(box(container, "nte_ask")).toBeTruthy());
    fireEvent.doubleClick(box(container, "nte_ask"));
    const field = await screen.findByRole("textbox", { name: "Note" });
    await user.type(field, "{Shift>}{Enter}{/Shift}about retries{Enter}");
    expect(editorStore.getState().doc.annotations.notes.nte_ask.text).toBe("Ask ops\nabout retries");
  });

  it("renames nothing in a read-only tab", async () => {
    const { container } = show(await placedExample("payments"), "cnv_runtime", { readOnly: true });
    fireEvent.doubleClick(box(container, "nod_scheduler"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
