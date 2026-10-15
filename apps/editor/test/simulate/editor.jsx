// The editor page on a project, for the simulation's component tests (files that start with
// `// @vitest-environment jsdom` and import ../dom.js, ../flow.js and ../i18n.js first).
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { editingStore } from "@/editing/state";
import EditorPage from "@/features/editor/EditorPage";
import { inspectorStore } from "@/inspector/state";
import { memoryRepository } from "@/persistence/repository";
import { simulationStore } from "@/simulate/store";
import { inspectorWidthStore } from "@/stores/inspector";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

/**
 * Show a project in the editor on a level, its boxes drawn.
 * @param {object} doc
 * @param {string} [path] The address, `/p/<project>` by default.
 */
export async function openEditor(doc, path = `/p/${doc.project.id}`) {
  const repository = { ...memoryRepository(), persistent: true };
  await repository.save(doc);
  render(
    <RepositoryContext value={repository}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/p/:projectId/:canvasId?" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    </RepositoryContext>
  );
  await screen.findByTestId("canvas");
  await waitFor(() => expect(document.querySelector(".react-flow__node-node")).toBeTruthy());
  return repository;
}

/** Leave every store as a fresh page finds it. */
export function resetStores() {
  act(() => {
    simulationStore.getState().close();
    editingStore.getState().reset();
    inspectorStore.getState().reset();
    useView.setState(VIEW_DEFAULTS);
    inspectorWidthStore.setState({ width: 340 });
  });
}

/** The simulation panel. */
export const panel = () => screen.queryByRole("dialog", { name: "Simulation" });

/** A box of the level shown. */
export const box = id => document.querySelector(`.react-flow__node[data-id="${id}"]`);
