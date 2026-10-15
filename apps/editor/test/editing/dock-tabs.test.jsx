// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { editingStore } from "@/editing/state";
import { ToolDock } from "@/editing/ToolDock";
import { shortcutFor } from "@/features/editor/shortcuts";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

/** The dock on a level of the payments example. */
function dock(canvasId) {
  act(() => editorStore.getState().open(readExample("payments"), { canvasId }));
  return render(<ToolDock />);
}

const tab = name => screen.getByRole("tab", { name });
const tools = () =>
  screen
    .getAllByRole("button")
    .filter(button => button.hasAttribute("aria-pressed"))
    .map(button => button.getAttribute("aria-label"));

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
});

describe("the dock's tabs (mixed levels spec §6)", () => {
  it("opens on the level's own tab, marked, with the level's own tools", () => {
    dock("cnv_lifecycle");
    expect(screen.getAllByRole("tab").map(item => item.getAttribute("aria-label"))).toEqual([
      "System elements",
      "State machine elements",
      "Flow elements"
    ]);
    expect(tab("State machine elements").getAttribute("aria-selected")).toBe("true");
    expect(tools()).toContain("State");
  });

  it("shows another kind's guests on its tab, and puts the tool in hand down", async () => {
    const user = userEvent.setup();
    dock("cnv_lifecycle");
    act(() => editingStore.getState().setTool("state"));
    await user.click(tab("System elements"));
    expect(tab("System elements").getAttribute("aria-selected")).toBe("true");
    expect(tools()).toEqual(["Select", "Actor", "Service", "External system", "Note"]);
    expect(editingStore.getState().tool).toBe("select");
    await user.click(tab("Flow elements"));
    expect(tools()).toEqual(["Select", "Steps of an action", "Note"]);
  });

  it("offers a system level the lifecycle and the procedure", async () => {
    const user = userEvent.setup();
    dock("cnv_runtime");
    await user.click(tab("State machine elements"));
    expect(tools()).toEqual(["Select", "Lifecycle", "Note"]);
    await user.click(tab("Flow elements"));
    expect(tools()).toEqual(["Select", "Procedure", "Note"]);
  });

  it("goes back to the level's own tab on another level", async () => {
    const user = userEvent.setup();
    dock("cnv_lifecycle");
    await user.click(tab("System elements"));
    act(() => editingStore.getState().reset());
    expect(tab("State machine elements").getAttribute("aria-selected")).toBe("true");
  });

  it("answers 1, 2 and 3, but not while typing or with Shift", () => {
    const on = (key, target = document.body, shiftKey = false) =>
      shortcutFor({ key, code: `Digit${key}`, shiftKey, target }, { mac: false });
    expect(["1", "2", "3"].map(key => on(key))).toEqual(["tab", "tab", "tab"]);
    expect(on("4")).toBeNull();
    expect(on("1", document.body, true)).toBe("fit");
    const field = document.createElement("input");
    document.body.append(field);
    expect(on("2", field)).toBeNull();
    field.remove();
  });
});
