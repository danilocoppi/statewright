// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { editingStore } from "@/editing/state";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

function show(id) {
  act(() => editorStore.getState().open(readExample("get-paid-as-built"), { canvasId: "cnv_open" }));
  render(<Inspector />);
  act(() => editorStore.getState().select([id]));
}

const level = () => editorStore.getState().doc.canvases.cnv_open;
const selection = () => editorStore.getState().view.selections.cnv_open;
const goesTo = () => screen.getByText("Goes to").parentElement;

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("Basics in plain words", () => {
  it("shows each choice that changes the look in the figure's own colours", () => {
    show("nod_awaitingPayment");
    const hold = screen.getByRole("radio", { name: "On hold" });
    // state.hold is drawn #FFFBEB with a #B45309 stroke: the swatch is painted with the same colours.
    expect(hold.querySelector("span").style.background).toBe("var(--sw-fffbeb)");
    expect(hold.querySelector("span").style.border).toContain("var(--sw-b45309)");
    expect(screen.getByRole("radio", { name: "Failure" }).querySelector("span").style.background).toBe(
      "var(--sw-fef3f2)"
    );
  });

  it("says where a state goes, as the diagram says it, and goes to each arrow and box", async () => {
    const user = userEvent.setup();
    show("nod_created");
    const row = within(goesTo()).getByRole("button", { name: "payer lock" }).closest("li");
    expect(within(row).getByRole("button", { name: "awaiting_payment" })).toBeTruthy();
    await user.click(within(row).getByRole("button", { name: "payer lock" }));
    expect(selection()).toEqual(["edg_createdAwaitingPayment"]);
    act(() => editorStore.getState().select(["nod_created"]));
    await user.click(within(goesTo()).getByRole("button", { name: "awaiting_payment" }));
    expect(selection()).toEqual(["nod_awaitingPayment"]);
    expect(editorStore.getState().view.reveal).toEqual({ canvasId: "cnv_open", id: "nod_awaitingPayment" });
    expect(screen.getByText("Comes from")).toBeTruthy();
  });

  it("adds a transition from the keyboard, to another state or to the state itself, and asks when", async () => {
    const user = userEvent.setup();
    show("nod_created");
    const before = Object.keys(level().edges).length;
    await user.click(screen.getByRole("button", { name: "Add a transition" }));
    await user.keyboard("underpaid{Enter}");
    const [id, edge] = Object.entries(level().edges).find(
      ([, item]) => item.from === "nod_created" && item.to === "nod_underpaid"
    );
    expect(edge).toEqual({ from: "nod_created", to: "nod_underpaid" });
    expect(editingStore.getState().editor).toEqual({ type: "trigger", edgeId: id });

    act(() => editorStore.getState().select(["nod_created"]));
    await user.click(screen.getByRole("button", { name: "Add a transition" }));
    await user.type(screen.getByRole("combobox", { name: "To which box?" }), "created");
    expect(screen.getByRole("option", { name: /itself/ })).toBeTruthy();
    await user.keyboard("{Enter}");
    expect(Object.values(level().edges).some(item => item.from === "nod_created" && item.to === "nod_created")).toBe(
      true
    );
    expect(Object.keys(level().edges)).toHaveLength(before + 2);
  });

  it("says what the format forbids before a box is chosen, and adds nothing from a terminal state", async () => {
    const user = userEvent.setup();
    show("nod_created");
    await user.click(screen.getByRole("button", { name: "Add a transition" }));
    await user.type(screen.getByRole("combobox", { name: "To which box?" }), "Initial");
    const initial = screen.getAllByRole("option")[0];
    expect(initial.getAttribute("aria-disabled")).toBe("true");
    expect(initial.textContent).toContain("Nothing leads into an initial node");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("combobox", { name: "To which box?" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Inspector" })).toBeTruthy();

    act(() => editorStore.getState().open(readExample("get-paid-as-built"), { canvasId: "cnv_transaction" }));
    act(() => editorStore.getState().select(["nod_cancelled"]));
    expect(screen.getByRole("button", { name: "Add a transition" }).disabled).toBe(true);
    expect(screen.getByText("A terminal state has no way out.")).toBeTruthy();
  });
});
