// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editingStore } from "@/editing/state";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

function flow() {
  let doc = newProject({ name: "Refunds", kind: "flow", names: { state: "S", end: "Done" } }, new Set());
  doc = applyBatch(doc, [
    { type: "catalog.add", args: { collection: "events", id: "evt_pspRefund", item: { name: "psp.refund" } } },
    { type: "layout.node.set", args: { canvas: doc.root, id: "nod_start", x: 0, y: 0 } },
    { type: "layout.node.set", args: { canvas: doc.root, id: "nod_end", x: 300, y: 0 } }
  ]).doc;
  return doc;
}

function insertAt(doc, at, canvasId) {
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Canvas />);
  act(() => editingStore.getState().open({ type: "insert", at }));
}

const level = () => editorStore.getState().doc.canvases[editorStore.getState().canvasId];

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
});

describe("inserting by name", () => {
  it("finds a step the catalog offers and inserts it where `/` was pressed, as one change", async () => {
    const user = userEvent.setup();
    insertAt(flow(), { x: 150, y: 200 });
    const palette = screen.getByRole("dialog", { name: "Insert" });
    expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Insert" }));
    await user.keyboard("emit{Enter}");
    const [id, node] = Object.entries(level().nodes).find(([, item]) => item.kind === "emit");
    expect(node).toEqual({ kind: "emit", event: "evt_pspRefund" });
    expect(editorStore.getState().history.past.map(entry => entry.label)).toEqual(["Insert Emit psp.refund"]);
    expect(editorStore.getState().view.selections[editorStore.getState().canvasId]).toEqual([id]);
    expect(palette.isConnected).toBe(false);
  });

  it("starts a tool found by name the way the dock does: a state is named in place", async () => {
    const user = userEvent.setup();
    const doc = newProject({ name: "M", kind: "machine", names: { state: "Open", end: "Done" } }, new Set());
    insertAt(doc, { x: 100, y: 100 });
    await user.keyboard("state{Enter}");
    expect(screen.getByRole("textbox", { name: "Name" })).toBeTruthy();
    await user.keyboard("Paid{Enter}");
    expect(Object.values(level().nodes).map(node => node.name)).toContain("Paid");
  });

  it("inserts a reusable part as a box holding it", async () => {
    const user = userEvent.setup();
    insertAt(await placedExample("payments"), { x: 600, y: 600 }, "cnv_runtime");
    await user.keyboard("compliance{Enter}");
    const added = Object.values(level().nodes).find(node => node.inner?.definition === "def_complianceHold");
    expect(added).toMatchObject({ kind: "service", name: "Compliance hold" });
  });

  it("may go above the landing ghost, never over it", () => {
    insertAt(flow(), { x: 150, y: 200 });
    const palette = screen.getByRole("dialog", { name: "Insert" });
    const ghost = document.querySelector(".sw-ghost");
    expect(Number(palette.dataset.above)).toBe(Number.parseFloat(ghost.style.top) - 10);
  });

  it("closes with Esc or a click elsewhere", async () => {
    const user = userEvent.setup();
    insertAt(flow(), { x: 0, y: 0 });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => editingStore.getState().open({ type: "insert", at: { x: 0, y: 0 } }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
