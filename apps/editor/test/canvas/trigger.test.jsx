// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editingStore } from "@/editing/state";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

/** A machine — Open → Paid by edg_go, no trigger yet — placed, with an event psp.received used once. */
async function machine() {
  let doc = newProject({ name: "Pay", kind: "machine", names: { state: "Open", end: "Done" } }, new Set());
  doc = applyBatch(doc, [
    { type: "catalog.add", args: { collection: "events", id: "evt_pspReceived", item: { name: "psp.received" } } },
    { type: "node.add", args: { canvas: doc.root, id: "nod_paid", node: { kind: "state", name: "Paid" } } },
    { type: "node.add", args: { canvas: doc.root, id: "nod_failed", node: { kind: "state", name: "Failed" } } },
    { type: "edge.add", args: { canvas: doc.root, id: "edg_go", edge: { from: "nod_firstState", to: "nod_paid" } } },
    {
      type: "edge.add",
      args: {
        canvas: doc.root,
        id: "edg_fail",
        edge: { from: "nod_firstState", to: "nod_failed", on: ["evt_pspReceived"] }
      }
    },
    ...["nod_initial", "nod_firstState", "nod_paid", "nod_failed"].map((id, index) => ({
      type: "layout.node.set",
      args: { canvas: doc.root, id, x: index * 220, y: index === 3 ? 160 : 0 }
    }))
  ]).doc;
  return doc;
}

function edit(doc, edgeId) {
  act(() => editorStore.getState().open(doc));
  const view = render(<Canvas />);
  act(() => editingStore.getState().open({ type: "trigger", edgeId }));
  return view;
}

const edge = id => editorStore.getState().doc.canvases[editorStore.getState().doc.root].edges[id];

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
});

describe("the trigger editor", () => {
  it("shows what makes the transition happen now, adds the event picked, and takes one out with ×", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_fail");
    const now = screen.getByRole("list", { name: "Current trigger" });
    expect(within(now).getByText("psp.received")).toBeTruthy();
    // What it already happens on is not offered again.
    await user.type(screen.getByRole("combobox", { name: "Event" }), "psp.re");
    expect(screen.getAllByRole("option").map(option => option.textContent)).not.toContainEqual(
      expect.stringMatching(/psp\.received/)
    );
    await user.type(screen.getByRole("combobox", { name: "Event" }), "fund{Enter}");
    expect(edge("edg_fail").on).toEqual(["evt_pspReceived", "evt_pspRefund"]);
    act(() => editingStore.getState().open({ type: "trigger", edgeId: "edg_fail" }));
    await user.click(screen.getByRole("button", { name: "Take out psp.received" }));
    expect(edge("edg_fail").on).toEqual(["evt_pspRefund"]);
  });

  it("opens on the timer a transition waits for", async () => {
    const doc = applyBatch(await machine(), [
      {
        type: "catalog.add",
        args: { collection: "timers", id: "tmr_ttl", item: { name: "Quote TTL", duration: "PT10M" } }
      },
      { type: "edge.update", args: { id: "edg_go", set: { after: "tmr_ttl" } } }
    ]).doc;
    edit(doc, "edg_go");
    expect(screen.getByRole("combobox", { name: "Timer" })).toBeTruthy();
    expect(within(screen.getByRole("list", { name: "Current trigger" })).getByText("Quote TTL")).toBeTruthy();
  });

  it("asks when the transition happens, and creates a new event with Enter, as one change", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_go");
    const editor = screen.getByRole("dialog", { name: "When does Open go to Paid?" });
    const field = screen.getByRole("combobox", { name: "Event" });
    expect(document.activeElement).toBe(field);
    await user.type(field, "psp.refund");
    const options = screen.getAllByRole("option");
    expect(options[0].textContent).toContain("Create event psp.refund");
    await user.keyboard("{Enter}");
    const { doc, history } = editorStore.getState();
    expect(doc.catalog.events.evt_pspRefund).toEqual({ name: "psp.refund" });
    expect(edge("edg_go").on).toEqual(["evt_pspRefund"]);
    expect(history.past.map(entry => entry.label)).toEqual(["Set trigger"]);
    expect(editor.isConnected).toBe(false);
  });

  it("finds an existing event, says how often it is used, and picks it with the arrows", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_go");
    await user.type(screen.getByRole("combobox", { name: "Event" }), "psp.re");
    const options = screen.getAllByRole("option");
    expect(options.map(option => option.textContent)).toEqual([
      expect.stringContaining("Create event psp.re"),
      expect.stringContaining("psp.receivedused once")
    ]);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(edge("edg_go").on).toEqual(["evt_pspReceived"]);
    expect(Object.keys(editorStore.getState().doc.catalog.events)).toEqual(["evt_pspReceived"]);
  });

  it("says what an event name looks like when what is typed cannot be one", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_go");
    await user.type(screen.getByRole("combobox", { name: "Event" }), "42{Enter}");
    expect(screen.getByRole("option").textContent).toContain("Event names look like payin.confirmed");
    expect(edge("edg_go").on).toBeUndefined();
  });

  it("guards the transition with a condition in plain words, or a new guard", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_go");
    await user.click(screen.getByRole("button", { name: "+ Guard" }));
    await user.type(screen.getByRole("combobox", { name: "Guard" }), "amount covered");
    expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual([
      expect.stringContaining("Create guard “amount covered”"),
      expect.stringContaining("Use “amount covered” as the condition")
    ]);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(edge("edg_go").guard).toEqual({ text: "amount covered" });
  });

  it("waits for a new timer whose name says how long, or for nothing", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_go");
    await user.click(screen.getByRole("button", { name: "After a timer" }));
    await user.type(screen.getByRole("combobox", { name: "Timer" }), "30 min");
    expect(screen.getByRole("option").textContent).toContain("PT30M");
    await user.keyboard("{Enter}");
    const { doc } = editorStore.getState();
    expect(doc.catalog.timers[edge("edg_go").after]).toEqual({ name: "30 min", duration: "PT30M" });
    act(() => editingStore.getState().open({ type: "trigger", edgeId: "edg_go" }));
    await user.click(screen.getByRole("button", { name: "No trigger" }));
    expect(edge("edg_go").after).toBeUndefined();
  });

  it("closes with Esc or a click elsewhere, changing nothing", async () => {
    const user = userEvent.setup();
    edit(await machine(), "edg_go");
    await user.keyboard("psp{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => editingStore.getState().open({ type: "trigger", edgeId: "edg_go" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(editorStore.getState().history.past).toEqual([]);
  });

  it("opens with a double-click on an edge", async () => {
    const doc = await machine();
    act(() => editorStore.getState().open(doc));
    const { container } = render(<Canvas />);
    await act(async () => {});
    fireEvent.doubleClick(container.querySelector('.react-flow__edge[data-id="edg_go"]'));
    expect(screen.getByRole("dialog", { name: "When does Open go to Paid?" })).toBeTruthy();
  });
});

describe("the trigger editor's place", () => {
  it("may open above the edge's label, never over it", async () => {
    edit(await machine(), "edg_fail");
    const editor = screen.getByRole("dialog", { name: "When does Open go to Failed?" });
    expect(Number.parseFloat(editor.style.top) - Number(editor.dataset.above)).toBeGreaterThan(20);
  });
});

describe("connections on systems and flows", () => {
  it("sets what a system connection sends", async () => {
    const user = userEvent.setup();
    const doc = await placedExample("payments");
    const [edgeId, value] = Object.entries(doc.canvases.cnv_runtime.edges)[0];
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
    render(<Canvas />);
    act(() => editingStore.getState().open({ type: "trigger", edgeId }));
    const names = [value.from, value.to].map(id => doc.canvases.cnv_runtime.nodes[id].name);
    expect(screen.getByRole("dialog", { name: `What does ${names[0]} send to ${names[1]}?` })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Stream" }));
    expect(editorStore.getState().doc.canvases.cnv_runtime.edges[edgeId].kind).toBe("stream");
  });

  it("says which branch out of an if an edge is, and which case out of a switch", async () => {
    const user = userEvent.setup();
    let doc = newProject({ name: "Flow", kind: "flow", names: { state: "S", end: "Done" } }, new Set());
    doc = applyBatch(doc, [
      {
        type: "node.add",
        args: { canvas: doc.root, id: "nod_check", node: { kind: "if", name: "Paid?" }, at: { x: 0, y: 0 } }
      },
      {
        type: "node.add",
        args: { canvas: doc.root, id: "nod_route", node: { kind: "switch", name: "Route" }, at: { x: 0, y: 200 } }
      },
      {
        type: "edge.add",
        args: { canvas: doc.root, id: "edg_yes", edge: { from: "nod_check", to: "nod_end", kind: "true" } }
      },
      {
        type: "edge.add",
        args: { canvas: doc.root, id: "edg_card", edge: { from: "nod_route", to: "nod_end", kind: "case", case: "a" } }
      },
      { type: "layout.node.set", args: { canvas: doc.root, id: "nod_start", x: -200, y: 0 } },
      { type: "layout.node.set", args: { canvas: doc.root, id: "nod_end", x: 300, y: 0 } }
    ]).doc;
    edit(doc, "edg_yes");
    await user.click(screen.getByRole("button", { name: "False" }));
    expect(edge("edg_yes").kind).toBe("false");
    act(() => editingStore.getState().open({ type: "trigger", edgeId: "edg_card" }));
    const field = screen.getByRole("textbox", { name: "Case" });
    await user.clear(field);
    await user.type(field, "card{Enter}");
    expect(edge("edg_card")).toMatchObject({ kind: "case", case: "card" });
  });
});

describe("the trigger editor on a mixed level (mixed levels spec §4.5)", () => {
  it("asks what a transition asks, keeping it a transition", async () => {
    const user = userEvent.setup();
    const mixed = applyBatch(await machine(), [{ type: "canvas.mix", args: { id: (await machine()).root } }]).doc;
    edit(mixed, "edg_go");
    await user.type(screen.getByRole("combobox", { name: "Event" }), "psp.received{Enter}");
    expect(edge("edg_go")).toMatchObject({ kind: "transition", on: ["evt_pspReceived"] });
  });
});
