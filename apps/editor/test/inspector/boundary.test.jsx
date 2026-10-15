// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

// A control that fails, as a bug in one would: the tags of every element.
vi.mock("@/inspector/controls/common", async original => ({
  ...(await original()),
  TagsControl: () => {
    throw new Error("The tags control failed");
  }
}));

const FAILED = "This part of the screen ran into a problem.";

beforeEach(() => {
  // React reports what an error boundary caught; the test reads the screen instead.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
  vi.restoreAllMocks();
});

describe("a control that fails (spec §10)", () => {
  it("keeps the failure inside the inspector's fields, with the document and the other layer still there", async () => {
    const user = userEvent.setup();
    act(() => useView.setState({ inspectorDetails: true }));
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    render(<Inspector />);
    act(() => editorStore.getState().select(["nod_scheduler"]));
    const inspector = screen.getByRole("dialog", { name: "Inspector" });
    expect(within(inspector).getByText(FAILED)).toBeTruthy();
    expect(within(inspector).getByRole("button", { name: "Download a copy of the document" })).toBeTruthy();
    expect(editorStore.getState().doc.canvases.cnv_runtime.nodes).toHaveProperty("nod_scheduler");
    await user.click(within(inspector).getByRole("button", { name: "Hide details" }));
    expect(within(inspector).queryByText(FAILED)).toBeNull();
    expect(within(inspector).getByRole("textbox", { name: "Description" })).toBeTruthy();
  });

  it("keeps it inside the catalog sheet's item, with the list still there", () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    render(<CatalogSheet onNavigate={vi.fn()} />);
    act(() => catalogStore.getState().show({ collection: "events", item: "evt_expiryElapsed" }));
    const sheet = screen.getByRole("dialog", { name: "Catalog" });
    expect(within(sheet).getByText(FAILED)).toBeTruthy();
    expect(within(sheet).getByRole("navigation")).toBeTruthy();
  });
});
