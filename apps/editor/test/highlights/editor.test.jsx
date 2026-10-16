// @vitest-environment jsdom
// The highlight editor (highlights spec §6): name, colour (a swatch or a hex), border, fill, tag, meaning, a live
// preview, and suggestions for a project that has none.
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { highlightLook } from "statewright";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HighlightEditor } from "@/highlights/HighlightEditor";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

function open(doc, props = {}) {
  act(() => editorStore.getState().open(doc, { canvasId: "cnv_open" }));
  render(<HighlightEditor open onClose={vi.fn()} {...props} />);
  return screen.getByRole("dialog");
}
const preview = dialog => within(dialog).getByTestId("highlight-preview").querySelector("rect");

afterEach(() => act(() => editorStore.getState().close()));

describe("the highlight editor", () => {
  it("draws its preview in the colour chosen", async () => {
    const user = userEvent.setup();
    const dialog = open(readExample("get-paid-as-built"));
    await user.click(within(dialog).getByRole("radio", { name: "Blue" }));
    expect(preview(dialog).getAttribute("stroke")).toBe(highlightLook({ colour: "blue" }).stroke);
    await user.type(within(dialog).getByLabelText("Hex colour"), "#C2410C");
    expect(preview(dialog).getAttribute("stroke")).toBe(highlightLook({ colour: "#C2410C" }).stroke);
  });

  it("will not save a hex that is not six digits, and says why", async () => {
    const user = userEvent.setup();
    const dialog = open(readExample("get-paid-as-built"), { name: "Brand" });
    await user.type(within(dialog).getByLabelText("Hex colour"), "#12");
    expect(within(dialog).getByRole("button", { name: "Save" }).disabled).toBe(true);
    expect(within(dialog).getByText("Use six hex digits, like #C2410C")).toBeTruthy();
  });

  it("offers suggestions when the project has no highlight, which fill the form", async () => {
    const user = userEvent.setup();
    const dialog = open(readExample("get-paid-as-built"));
    const suggestions = within(dialog).getByRole("group", { name: "Start from" });
    expect(
      within(suggestions)
        .getAllByRole("button")
        .map(button => button.textContent)
    ).toEqual(["Start", "Critical", "Review", "Done"]);
    await user.click(within(suggestions).getByRole("button", { name: "Critical" }));
    expect(within(dialog).getByLabelText("Name").value).toBe("Critical");
    expect(within(dialog).getByRole("radio", { name: "Red" }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByRole("checkbox", { name: "Show its name as a tag" }).checked).toBe(true);
  });

  it("offers no suggestions once the project has highlights, and edits one in place", async () => {
    const user = userEvent.setup();
    const doc = readExample("get-paid-as-built");
    doc.catalog.highlights.hlt_critical = { name: "Critical", colour: "red" };
    const dialog = open(doc, { id: "hlt_critical" });
    expect(within(dialog).queryByRole("group", { name: "Start from" })).toBeNull();
    await user.click(within(dialog).getByRole("radio", { name: "Amber" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(editorStore.getState().doc.catalog.highlights.hlt_critical.colour).toBe("amber");
  });
});
