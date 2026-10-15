// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

/** Inspect an element of a document, in Basics or in Details. */
function inspect(doc, canvasId, id, { details = false } = {}) {
  act(() => useView.setState({ inspectorDetails: details }));
  act(() => editorStore.getState().open(doc, { canvasId }));
  const view = render(<Inspector />);
  act(() => inspectorStore.getState().show(id));
  return view;
}

const doc = () => editorStore.getState().doc;
const labels = () => editorStore.getState().history.past.map(entry => entry.label);

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("fields that name catalog items", () => {
  it("shows a state's statuses as their pills, takes one out, and adds one — creating it in the same change", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    const statuses = screen.getByText("Status shown to users").parentElement;
    // "created" has the warning tone: its chip has that tone's colours, as its pill on the diagram.
    expect(within(statuses).getByText("created").closest("li").style.color).toBe("var(--sw-92400e)");
    await user.click(within(statuses).getByRole("button", { name: "Take out created" }));
    expect(doc().canvases.cnv_open.nodes.nod_created).not.toHaveProperty("statuses");
    await user.click(within(statuses).getByRole("button", { name: "Add status" }));
    await user.keyboard("On review");
    expect(screen.getByRole("option", { name: /Create status “On review”/ })).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(doc().catalog.statuses.sts_onReview).toEqual({ name: "On review" });
    expect(doc().canvases.cnv_open.nodes.nod_created.statuses).toEqual(["sts_onReview"]);
    expect(labels()).toEqual(["Edit Status shown to users", "Edit Status shown to users"]);
  });

  it("chooses a timer for a transition by name, and clears it", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "edg_createdAwaitingPayment");
    await user.click(screen.getByRole("button", { name: "After" }));
    const timer = Object.values(doc().catalog.timers)[0].name;
    await user.keyboard(timer.slice(0, 4));
    await user.click(screen.getByRole("option", { name: new RegExp(timer) }));
    const id = Object.keys(doc().catalog.timers)[0];
    expect(doc().canvases.cnv_open.edges.edg_createdAwaitingPayment.after).toBe(id);
    await user.click(screen.getByRole("button", { name: "Clear After" }));
    expect(doc().canvases.cnv_open.edges.edg_createdAwaitingPayment).not.toHaveProperty("after");
  });

  it("says an event has no payload, and finds the source among the parties or inside", async () => {
    const user = userEvent.setup();
    const source = readExample("get-paid-as-built");
    const event = Object.keys(source.catalog.events)[0];
    inspect(source, "cnv_open", event);
    await user.click(screen.getByRole("button", { name: /^Payload/ }));
    await user.click(screen.getByRole("option", { name: "Nothing" }));
    expect(doc().catalog.events[event].payload).toBeNull();
    expect(screen.getByRole("button", { name: "Payload: Nothing" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Source/ }));
    await user.click(screen.getByRole("option", { name: "Raised inside" }));
    expect(doc().catalog.events[event].source).toBe("internal");
  });
});

describe("fields that name elements and values", () => {
  it("moves a box to another region, and an arrow's end to another box", async () => {
    const user = userEvent.setup();
    const payments = readExample("payments");
    const [state] = Object.entries(payments.canvases.cnv_lifecycle.nodes).find(([, node]) => node.region);
    const first = inspect(payments, "cnv_lifecycle", state, { details: true });
    const other = Object.keys(payments.canvases.cnv_lifecycle.regions).find(
      region => region !== payments.canvases.cnv_lifecycle.nodes[state].region
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Region" }), other);
    expect(doc().canvases.cnv_lifecycle.nodes[state].region).toBe(other);

    first.unmount();
    inspect(readExample("get-paid-as-built"), "cnv_open", "edg_createdAwaitingPayment", { details: true });
    await user.selectOptions(screen.getByRole("combobox", { name: "To" }), "nod_underpaid");
    expect(doc().canvases.cnv_open.edges.edg_createdAwaitingPayment.to).toBe("nod_underpaid");
  });

  it("reads a timer's duration in plain words, and says when it cannot", async () => {
    const user = userEvent.setup();
    const source = readExample("get-paid-as-built");
    const timer = Object.keys(source.catalog.timers)[0];
    inspect(source, "cnv_open", timer);
    const lasts = screen.getByRole("textbox", { name: "Lasts" });
    await user.clear(lasts);
    await user.type(lasts, "45 min");
    expect(screen.getByText("= PT45M")).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(doc().catalog.timers[timer].duration).toBe("PT45M");
    await user.clear(lasts);
    await user.type(lasts, "soon{Enter}");
    expect(screen.getByRole("alert").textContent).toContain("That cannot be read.");
    expect(doc().catalog.timers[timer].duration).toBe("PT45M");
  });

  it("keeps a duration it cannot read when the field is left, and says why", async () => {
    const user = userEvent.setup();
    const source = readExample("get-paid-as-built");
    const timer = Object.keys(source.catalog.timers)[0];
    const before = source.catalog.timers[timer].duration;
    inspect(source, "cnv_open", timer);
    const lasts = screen.getByRole("textbox", { name: "Lasts" });
    await user.clear(lasts);
    await user.type(lasts, "soon");
    await user.tab();
    expect(lasts.value).toBe("soon");
    expect(screen.getByRole("alert").textContent).toContain("That cannot be read.");
    expect(doc().catalog.timers[timer].duration).toBe(before);
  });

  it("attaches a note to a box of its level, or lets it float", async () => {
    const user = userEvent.setup();
    const source = applyBatch(readExample("get-paid-as-built"), [
      { type: "note.add", args: { id: "nte_check", note: { canvas: "cnv_open", text: "Check the lock" } } }
    ]).doc;
    inspect(source, "cnv_open", "nte_check");
    expect(screen.getByRole("textbox", { name: "Text" }).value).toBe("Check the lock");
    await user.selectOptions(screen.getByRole("combobox", { name: "Attached to" }), "nod_created");
    expect(doc().annotations.notes.nte_check.target).toBe("nod_created");
    await user.selectOptions(screen.getByRole("combobox", { name: "Attached to" }), "");
    expect(doc().annotations.notes.nte_check).not.toHaveProperty("target");
  });

  it("points a shortcut to a level found by name, and lists the states a from-any-state leaves out", async () => {
    const user = userEvent.setup();
    const source = applyBatch(readExample("get-paid-as-built"), [
      {
        type: "node.add",
        args: { canvas: "cnv_open", id: "nod_toTransaction", node: { kind: "ref", target: "cnv_open" } }
      },
      { type: "node.add", args: { canvas: "cnv_open", id: "nod_anywhere", node: { kind: "any" } } }
    ]).doc;
    inspect(source, "cnv_open", "nod_toTransaction");
    await user.click(screen.getByRole("button", { name: /Open/ }));
    await user.keyboard("Transac");
    await user.click(screen.getByRole("option", { name: /Transaction/ }));
    expect(doc().canvases.cnv_open.nodes.nod_toTransaction.target).toBe("cnv_transaction");

    act(() => inspectorStore.getState().show("nod_anywhere"));
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.keyboard("under");
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(doc().canvases.cnv_open.nodes.nod_anywhere.except).toEqual(["nod_underpaid"]);
  });
});
