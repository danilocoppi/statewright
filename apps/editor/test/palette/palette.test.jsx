// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { catalogStore } from "@/catalog/state";
import { CommandPalette } from "@/palette/CommandPalette";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

function open(commands = []) {
  act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
  const onClose = vi.fn();
  const view = render(<CommandPalette open onClose={onClose} commands={commands} />);
  return { onClose, view };
}

const state = () => editorStore.getState();

afterEach(() => {
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
});

describe("search and commands", () => {
  it("finds a box on another level by name, and shows it there, selected", async () => {
    const user = userEvent.setup();
    const { onClose } = open();
    await user.keyboard("compliance_h");
    const elements = screen.getByRole("group", { name: "Elements" });
    expect(within(elements).getAllByRole("option")[0].textContent).toContain("Payments / Runtime / Lifecycle engine");
    await user.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalled();
    expect(state().canvasId).toBe("cnv_lifecycle");
    expect(state().view.selections.cnv_lifecycle).toEqual(["nod_complianceHold"]);
  });

  it("opens a catalog item in the sheet, and moves through every group with the arrows", async () => {
    const user = userEvent.setup();
    open();
    await user.keyboard("ops.ap");
    const options = screen.getAllByRole("option");
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");
    expect(catalogStore.getState()).toMatchObject({ open: true, collection: "events" });
    expect(state().doc.catalog.events[catalogStore.getState().item].name).toBe("ops.approve");
  });

  it("lists commands with their keys, and runs one", async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    open([{ id: "layout", name: "Lay out this level again", keys: "⇧L", run }]);
    expect(screen.getByRole("group", { name: "Commands" }).textContent).toContain("⇧L");
    await user.keyboard("lay out");
    await user.click(screen.getByRole("option", { name: /Lay out this level again/ }));
    expect(run).toHaveBeenCalled();
  });

  it("shows each of a command's keys when it has more than one", () => {
    open([{ id: "fit", name: "Fit the level", keys: ["⇧F", "⇧1"], run: vi.fn() }]);
    const option = screen.getByRole("option", { name: /Fit the level/ });
    expect([...option.querySelectorAll("kbd")].map(key => key.textContent)).toEqual(["⇧F", "⇧1"]);
  });

  it("says when nothing matches, and closes with Esc", async () => {
    const user = userEvent.setup();
    const { onClose } = open();
    await user.keyboard("zzzz");
    expect(screen.getByText("Nothing matches.")).toBeTruthy();
    fireEvent(screen.getByRole("dialog", { name: "Search and commands" }), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalled();
  });
});
