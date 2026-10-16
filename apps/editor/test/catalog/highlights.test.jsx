// @vitest-environment jsdom
// The catalog's Highlights (highlights spec §6): listed with their swatches, made and edited in the highlight editor,
// removed with what loses them, found from search.
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { entriesOf, search } from "@/palette/search";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);
const marked = () =>
  applyBatch(readExample("payments"), [
    {
      type: "catalog.add",
      args: { collection: "highlights", id: "hlt_critical", item: { name: "Critical", colour: "red", fill: "tint" } }
    },
    { type: "node.update", args: { id: "nod_lifecycleEngine", set: { highlights: ["hlt_critical"] } } },
    { type: "node.update", args: { id: "nod_scheduler", set: { highlights: ["hlt_critical"] } } }
  ]).doc;

function open(doc, item) {
  act(() => editorStore.getState().open(doc, { canvasId: "cnv_runtime" }));
  render(<CatalogSheet onNavigate={vi.fn()} />);
  act(() => catalogStore.getState().show({ collection: "highlights", item }));
  return screen.getByRole("dialog", { name: "Catalog" });
}
const doc = () => editorStore.getState().doc;

afterEach(() => {
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
});

describe("the catalog's highlights", () => {
  it("lists them with a swatch in their look, and edits one's look", async () => {
    const user = userEvent.setup();
    const sheet = open(marked());
    const list = within(sheet).getByRole("region", { name: "Highlights" });
    expect(within(list).getByTestId("highlight-swatch").style.borderColor).toBe("var(--sw-dc2626)");
    await user.click(within(sheet).getByRole("button", { name: "Edit look…" }));
    const editor = screen.getByRole("dialog", { name: "Edit highlight" });
    await user.click(within(editor).getByRole("radio", { name: "Amber" }));
    await user.click(within(editor).getByRole("button", { name: "Save" }));
    expect(doc().catalog.highlights.hlt_critical.colour).toBe("amber");
  });

  it("makes a new one in the highlight editor", async () => {
    const user = userEvent.setup();
    const sheet = open(readExample("payments"));
    await user.click(within(sheet).getByRole("button", { name: "New highlight" }));
    const editor = screen.getByRole("dialog", { name: "New highlight" });
    await user.click(
      within(within(editor).getByRole("group", { name: "Start from" })).getByRole("button", { name: "Critical" })
    );
    await user.click(within(editor).getByRole("button", { name: "Save" }));
    expect(doc().catalog.highlights.hlt_critical).toMatchObject({ name: "Critical", colour: "red", chip: true });
  });

  it("says how many elements lose a highlight removed, and one Undo gives it back to all", async () => {
    const user = userEvent.setup();
    const sheet = open(marked(), "hlt_critical");
    await user.click(within(sheet).getByRole("button", { name: "Remove" }));
    expect(within(sheet).getByRole("alert").textContent).toContain("2");
    await user.click(within(sheet).getByRole("button", { name: "Remove it and its uses" }));
    expect(doc().catalog.highlights.hlt_critical).toBeUndefined();
    expect(doc().canvases.cnv_runtime.nodes.nod_scheduler.highlights ?? []).toEqual([]);
    act(() => editorStore.getState().undo());
    expect(doc().canvases.cnv_runtime.nodes.nod_scheduler.highlights).toEqual(["hlt_critical"]);
    expect(doc().canvases.cnv_runtime.nodes.nod_lifecycleEngine.highlights).toEqual(["hlt_critical"]);
  });

  it("is found by name from ⌘K, as a highlight of the catalog", () => {
    const groups = search({ ...entriesOf(t, marked()), commands: [] }, "Critic");
    const [found] = groups.find(entry => entry.group === "catalog").items;
    expect(found).toMatchObject({ id: "hlt_critical", collection: "highlights" });
  });

  it("closes only the highlight editor on Esc, not the catalog", async () => {
    const user = userEvent.setup();
    const sheet = open(readExample("payments"));
    await user.click(within(sheet).getByRole("button", { name: "New highlight" }));
    const editor = screen.getByRole("dialog", { name: "New highlight" });
    fireEvent(editor, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog", { name: "New highlight" })).toBeNull();
    expect(catalogStore.getState().open).toBe(true);
  });

  it("puts the focus in the name field when the highlight editor opens", async () => {
    const user = userEvent.setup();
    const sheet = open(readExample("payments"));
    await user.click(within(sheet).getByRole("button", { name: "New highlight" }));
    const editor = screen.getByRole("dialog", { name: "New highlight" });
    expect(document.activeElement).toBe(within(editor).getByLabelText("Name"));
  });
});
