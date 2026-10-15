// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { catalogStore } from "@/catalog/state";
import { editingStore } from "@/editing/state";
import EditorPage from "@/features/editor/EditorPage";
import { inspectorStore } from "@/inspector/state";
import { memoryRepository } from "@/persistence/repository";
import { editorStore } from "@/store/editor";
import { inspectorWidthStore } from "@/stores/inspector";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { placedExample } from "../fixtures.js";

async function openPayments() {
  const repository = { ...memoryRepository(), persistent: true };
  await repository.save(await placedExample("payments"));
  render(
    <RepositoryContext value={repository}>
      <MemoryRouter initialEntries={["/p/prj_payments"]}>
        <Routes>
          <Route path="/p/:projectId/:canvasId?" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    </RepositoryContext>
  );
  await screen.findByTestId("canvas");
  await waitFor(() => expect(document.querySelector('.react-flow__node[data-id="nod_scheduler"]')).toBeTruthy());
}

const inspector = () => screen.queryByRole("dialog", { name: "Inspector" });

afterEach(() => {
  act(() => catalogStore.getState().close());
  editingStore.getState().reset();
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
  inspectorWidthStore.setState({ width: 340 });
});

describe("the inspector in the editor", () => {
  it("opens beside the canvas with the selection, the Problems panel moving left of it", async () => {
    const user = userEvent.setup();
    await openPayments();
    expect(inspector()).toBeNull();
    act(() => editorStore.getState().select(["nod_scheduler"]));
    expect(within(inspector()).getByText("Service in Runtime")).toBeTruthy();
    await user.click(document.querySelector('[aria-controls="problems-panel"]'));
    const panel = screen.getByRole("dialog", { name: /Problems/ });
    // Left of the inspector (340 px and its 16 px margin, 12 px apart), never wider than the room left by the tool dock.
    expect(panel.style.right).toContain("min(368px");
    expect(panel.style.width).toMatch(/^max\(280px, min\(400px, .*440px.*\)\)$/);
    act(() => editorStore.getState().select([]));
    expect(panel.style.right).toContain("min(16px");
    expect(panel.style.width).toMatch(/^max\(280px, min\(400px, .*88px.*\)\)$/);
  });

  it("keeps the Problems panel left of a widened inspector", async () => {
    const user = userEvent.setup();
    await openPayments();
    act(() => inspectorWidthStore.getState().setWidth(500));
    act(() => editorStore.getState().select(["nod_scheduler"]));
    expect(inspector().style.width).toBe("500px");
    await user.click(document.querySelector('[aria-controls="problems-panel"]'));
    const panel = screen.getByRole("dialog", { name: /Problems/ });
    // 500 px, its 16 px margin and 12 px apart.
    expect(panel.style.right).toContain("min(528px");
    expect(panel.style.width).toMatch(/^max\(280px, min\(400px, .*600px.*\)\)$/);
  });

  it("shows the project's details from the project menu, and the level's with Shift+I or the canvas menu", async () => {
    const user = userEvent.setup();
    await openPayments();
    await user.click(screen.getByRole("button", { name: /Payments/ }));
    await user.click(screen.getByRole("menuitem", { name: "Project details" }));
    expect(within(inspector()).getByText("Project")).toBeTruthy();
    fireEvent.keyDown(inspector(), { key: "Escape" });
    expect(inspector()).toBeNull();

    fireEvent.keyDown(document.body, { key: "I", shiftKey: true });
    expect(within(inspector()).getByText("System level")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "I", shiftKey: true });
    expect(inspector()).toBeNull();

    act(() => editingStore.getState().open({ type: "menu", x: 300, y: 300 }));
    await user.click(screen.getByRole("menuitem", { name: /Level details/ }));
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe("Runtime");
  });

  it("opens the catalog with G, or from the project menu", async () => {
    const user = userEvent.setup();
    await openPayments();
    fireEvent.keyDown(document.body, { key: "g" });
    expect(screen.getByRole("dialog", { name: "Catalog" })).toBeTruthy();
    act(() => catalogStore.getState().close());
    await user.click(screen.getByRole("button", { name: /Payments/ }));
    await user.click(screen.getByRole("menuitem", { name: /Catalog/ }));
    expect(catalogStore.getState().open).toBe(true);
  });

  it("shows or hides each annotation layer from the View menu", async () => {
    const user = userEvent.setup();
    await openPayments();
    await user.click(screen.getByRole("button", { name: /Payments/ }));
    const notes = screen.getByRole("menuitemcheckbox", { name: "Notes" });
    expect(notes.getAttribute("aria-checked")).toBe("true");
    await user.click(notes);
    expect(useView.getState().notes).toBe(false);
    await user.click(screen.getByRole("button", { name: /Payments/ }));
    for (const layer of ["Findings", "Look here", "Lanes"]) {
      expect(screen.getByRole("menuitemcheckbox", { name: layer })).toBeTruthy();
    }
  });

  it("opens search and commands with Ctrl+K, listing the editor's commands", async () => {
    const user = userEvent.setup();
    await openPayments();
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    const palette = screen.getByRole("dialog", { name: "Search and commands" });
    expect(within(palette).getByRole("group", { name: "Commands" }).textContent).toContain("Lay out this level again");
    await user.keyboard("Scheduler{Enter}");
    expect(editorStore.getState().view.selections.cnv_runtime).toEqual(["nod_scheduler"]);
  });
});
