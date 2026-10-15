// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LevelsDialog } from "@/features/editor/LevelsDialog";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

/** Payments with an unused definition and a level nothing reaches. */
function withLoose() {
  const doc = structuredClone(readExample("payments"));
  doc.canvases.cnv_spare = { kind: "flow", name: "Spare", nodes: {}, edges: {} };
  doc.definitions.def_spare = { kind: "flow", name: "Spare", canvas: "cnv_spare" };
  doc.canvases.cnv_lost = {
    kind: "system",
    name: "Lost",
    nodes: { nod_box: { kind: "service", name: "Box" } },
    edges: {}
  };
  return doc;
}

function show() {
  act(() => editorStore.getState().open(withLoose(), { canvasId: "cnv_runtime" }));
  const onClose = vi.fn();
  const onNavigate = vi.fn();
  render(<LevelsDialog open onClose={onClose} onNavigate={onNavigate} />);
  return { onClose, onNavigate, dialog: screen.getByRole("dialog", { name: "Levels" }) };
}

describe("the Levels dialog: the project's map", () => {
  it("shows each level with its kind and how many elements it has, and the levels nothing reaches", () => {
    const { dialog } = show();
    const runtime = within(dialog).getByRole("button", { name: "Runtime" });
    expect(runtime.closest("[data-level]").textContent).toContain("8 elements");
    expect(within(dialog).getByRole("heading", { name: "Unattached levels" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Lost" })).toBeTruthy();
    expect(within(dialog).getByText("Not used anywhere")).toBeTruthy();
  });

  it("opens a level's elements, and takes an element picked to its level, selected", async () => {
    const user = userEvent.setup();
    const { dialog, onClose, onNavigate } = show();
    const toggle = within(dialog).getByRole("button", { name: "Show the elements of Runtime" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(within(dialog).queryByRole("button", { name: /^Command API/ })).toBeNull();
    await user.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.click(within(dialog).getByRole("button", { name: /^Command API/ }));
    expect(onClose).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith("cnv_runtime");
    expect(editorStore.getState().view.selections.cnv_runtime).toEqual(["nod_commandApi"]);
    expect(editorStore.getState().view.reveal).toEqual({ canvasId: "cnv_runtime", id: "nod_commandApi" });
  });

  it("shows a level picked by its name", async () => {
    const user = userEvent.setup();
    const { dialog, onNavigate } = show();
    await user.click(within(dialog).getByRole("button", { name: "Lost" }));
    expect(onNavigate).toHaveBeenCalledWith("cnv_lost");
  });

  it("says where a definition is used, and goes there", async () => {
    const user = userEvent.setup();
    const { dialog, onNavigate } = show();
    await user.click(within(dialog).getByRole("button", { name: "Used by expiry_clock on Lifecycle engine" }));
    expect(onNavigate).toHaveBeenCalledWith("cnv_lifecycle");
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual(["nod_expiryClock"]);
  });

  it("finds an element by what is typed, with the levels down to it open", async () => {
    const user = userEvent.setup();
    const { dialog } = show();
    await user.type(within(dialog).getByRole("searchbox", { name: "Find a level or an element" }), "paused");
    expect(within(dialog).getAllByRole("button", { name: /^paused/ }).length).toBeGreaterThan(0);
    expect(within(dialog).queryByRole("button", { name: "Lost" })).toBeNull();
    await user.clear(within(dialog).getByRole("searchbox"));
    await user.type(within(dialog).getByRole("searchbox"), "nothing like this");
    expect(within(dialog).getByText("Nothing matches.")).toBeTruthy();
  });
});
