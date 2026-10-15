// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { CommandPalette } from "@/palette/CommandPalette";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

// A failure where a bug would put one: the inspector's heading, the sheet's list, ⌘K's search.
const failing = vi.hoisted(() => ({
  area: null,
  check(area) {
    if (this.area === area) throw new Error(`The ${area} failed`);
  }
}));
vi.mock("@/inspector/describe", async original => {
  const real = await original();
  return { ...real, headingOf: (...args) => (failing.check("inspector"), real.headingOf(...args)) };
});
vi.mock("@/catalog/items", async original => {
  const real = await original();
  return { ...real, itemsOf: (...args) => (failing.check("sheet"), real.itemsOf(...args)) };
});
vi.mock("@/palette/search", async original => {
  const real = await original();
  return { ...real, search: (...args) => (failing.check("palette"), real.search(...args)) };
});

const FAILED = "This part of the screen ran into a problem.";

beforeEach(() => {
  // React reports what an error boundary caught; the test reads the screen instead.
  vi.spyOn(console, "error").mockImplementation(() => {});
  act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
});

afterEach(() => {
  failing.area = null;
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  vi.restoreAllMocks();
});

describe("a failure in an area of the editor (spec §10)", () => {
  it("stays inside the inspector, which reloads, with the document kept", async () => {
    const user = userEvent.setup();
    failing.area = "inspector";
    render(<Inspector />);
    act(() => editorStore.getState().select(["nod_scheduler"]));
    expect(screen.getByText(FAILED)).toBeTruthy();
    expect(editorStore.getState().doc.canvases.cnv_runtime.nodes).toHaveProperty("nod_scheduler");
    failing.area = null;
    await user.click(screen.getByRole("button", { name: "Reload this panel" }));
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe("Scheduler");
  });

  it("stays inside the catalog sheet, which still closes with Esc", () => {
    failing.area = "sheet";
    render(<CatalogSheet onNavigate={vi.fn()} />);
    act(() => catalogStore.getState().show({ collection: "events" }));
    const sheet = screen.getByRole("dialog", { name: "Catalog" });
    expect(within(sheet).getByText(FAILED)).toBeTruthy();
    fireEvent(sheet, new Event("cancel", { cancelable: true }));
    expect(catalogStore.getState().open).toBe(false);
  });

  it("stays inside search and commands, which still closes with Esc", () => {
    failing.area = "palette";
    const onClose = vi.fn();
    render(<CommandPalette open onClose={onClose} commands={[]} />);
    const palette = screen.getByRole("dialog", { name: "Search and commands" });
    expect(within(palette).getByText(FAILED)).toBeTruthy();
    fireEvent(palette, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalled();
  });
});
