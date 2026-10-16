// @vitest-environment jsdom
// The Highlights field (highlights spec §6): a box's highlights in their look, added, taken out, reordered, and a new
// one made and applied in one change.
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

const add = (id, item) => ({ type: "catalog.add", args: { collection: "highlights", id, item } });
/** Get paid with Critical (red, tint, tag) and Review (amber) declared, Critical on "created". */
const marked = () =>
  applyBatch(readExample("get-paid-as-built"), [
    add("hlt_critical", { name: "Critical", colour: "red", border: "bold", fill: "tint", chip: true }),
    add("hlt_review", { name: "Review", colour: "amber", fill: "tint" }),
    { type: "node.update", args: { id: "nod_created", set: { highlights: ["hlt_critical"] } } }
  ]).doc;

function inspect(doc, id = "nod_created") {
  act(() => useView.setState({ inspectorDetails: false }));
  act(() => editorStore.getState().open(doc, { canvasId: "cnv_open" }));
  const view = render(<Inspector />);
  act(() => inspectorStore.getState().show(id));
  return view;
}
const doc = () => editorStore.getState().doc;
const highlightsOf = () => doc().canvases.cnv_open.nodes.nod_created.highlights;
const field = () => screen.getByText("Highlights").parentElement;

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("the Highlights field", () => {
  it("shows a box's highlights in their look", () => {
    inspect(marked());
    const chip = within(field()).getByText("Critical").closest("li");
    expect(chip.style.borderColor).toBe("var(--sw-dc2626)");
    expect(chip.style.color).toBe("var(--sw-991b1b)");
  });

  it("adds one of the project's highlights and takes one out, each one change", async () => {
    const user = userEvent.setup();
    inspect(marked());
    await user.click(within(field()).getByRole("button", { name: "Add highlight" }));
    await user.keyboard("Rev");
    await user.keyboard("{Enter}");
    expect(highlightsOf()).toEqual(["hlt_critical", "hlt_review"]);
    await user.click(within(field()).getByRole("button", { name: "Take out Critical" }));
    expect(highlightsOf()).toEqual(["hlt_review"]);
  });

  it("puts a highlight first with Alt+←, since the first one gives the look", () => {
    const doc = applyBatch(marked(), [
      { type: "node.update", args: { id: "nod_created", set: { highlights: ["hlt_critical", "hlt_review"] } } }
    ]).doc;
    inspect(doc);
    fireEvent.keyDown(within(field()).getByRole("button", { name: /^Review/ }), { key: "ArrowLeft", altKey: true });
    expect(highlightsOf()).toEqual(["hlt_review", "hlt_critical"]);
  });

  it("makes a new highlight and applies it in one change, which one Undo takes back", async () => {
    const user = userEvent.setup();
    inspect(marked());
    await user.click(within(field()).getByRole("button", { name: "Add highlight" }));
    await user.keyboard("Hot path");
    await user.click(screen.getByRole("option", { name: /New highlight/ }));
    const dialog = screen.getByRole("dialog", { name: "New highlight" });
    expect(within(dialog).getByLabelText("Name").value).toBe("Hot path");
    await user.click(within(dialog).getByRole("radio", { name: "Violet" }));
    await user.click(within(dialog).getByRole("radio", { name: "Heavy" }));
    await user.click(within(dialog).getByRole("radio", { name: "Tint" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Show its name as a tag" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(doc().catalog.highlights.hlt_hotPath).toEqual({
      name: "Hot path",
      colour: "violet",
      border: "heavy",
      fill: "tint",
      chip: true
    });
    expect(highlightsOf()).toEqual(["hlt_critical", "hlt_hotPath"]);
    act(() => editorStore.getState().undo());
    expect(doc().catalog.highlights.hlt_hotPath).toBeUndefined();
    expect(highlightsOf()).toEqual(["hlt_critical"]);
  });
});
