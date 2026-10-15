// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { Toaster } from "@/components/ui/Toaster";
import EditorPage from "@/features/editor/EditorPage";
import { memoryRepository } from "@/persistence/repository";
import { useToastStore } from "@/stores/toast";

import { demoDoc, placedExample } from "../fixtures.js";
import { resetStores } from "../simulate/editor.jsx";

/** The editor on a project, with the toasts. */
async function openProject(doc, path = `/p/${doc.project.id}`) {
  const repository = { ...memoryRepository(), persistent: true };
  await repository.save(doc);
  render(
    <RepositoryContext value={repository}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/p/:projectId/:canvasId?" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </RepositoryContext>
  );
  await screen.findByTestId("canvas");
}

/** Downloads: the blobs handed to URL.createObjectURL, with the names clicked. */
function captureDownloads() {
  const files = [];
  URL.createObjectURL = vi.fn(blob => {
    files.push({ blob });
    return `blob:${files.length}`;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
    files.at(-1).name = this.download;
  });
  return files;
}

/** The bundled fonts as the browser fetches them: three bytes each here. */
const fonts = () => vi.fn(async () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));

beforeEach(() => useToastStore.setState({ items: [] }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  resetStores();
});

describe("a scenario as a page (simulator spec §7.2)", () => {
  it("exports the scenario chosen from the Export menu as Core's page, the fonts in it", async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    vi.stubGlobal("fetch", fonts());
    await openProject(await placedExample("payments"));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("menuitem", { name: /^Scenario page…/ }));
    const dialog = screen.getByRole("dialog", { name: "Scenario page" });
    expect(
      within(dialog)
        .getAllByRole("button", { name: /Lifecycle engine/ })
        .map(button => button.textContent)
    ).toEqual(["Pays in timeLifecycle engine · 4 steps", "Verification pauses the clockLifecycle engine · 3 steps"]);
    await user.click(within(dialog).getByRole("button", { name: /^Verification pauses the clock/ }));
    await waitFor(() => expect(files).toHaveLength(1));
    expect(screen.queryByRole("dialog", { name: "Scenario page" })).toBeNull();
    expect(files[0].name).toBe("verification-pauses-the-clock.html");
    const page = await files[0].blob.text();
    expect(page).toContain("<title>Verification pauses the clock · Payments</title>");
    expect(page).toContain("src: url(data:font/woff2;base64,AQID)");
    expect(await screen.findByText("Exported verification-pauses-the-clock.html")).toBeTruthy();
  });

  it("offers no scenario page when the project has no scenario", async () => {
    const user = userEvent.setup();
    await openProject(demoDoc());
    await user.click(screen.getByRole("button", { name: "Export" }));
    const item = screen.getByRole("menuitem", { name: /^Scenario page…/ });
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.textContent).toContain("No scenario yet");
  });

  it("says when a page could not be made, and makes it again when asked", async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    const fetch = fonts();
    fetch.mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    await openProject(await placedExample("payments"));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("menuitem", { name: /^Scenario page…/ }));
    await user.click(screen.getByRole("button", { name: /^Pays in time/ }));
    const toast = await screen.findByText("The page of “Pays in time” could not be made.");
    expect(files).toHaveLength(0);
    await user.click(within(toast.parentElement).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(files.map(file => file.name)).toEqual(["pays-in-time.html"]));
  });

  it("exports a scenario as a page from its menu in the Start panel", async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    vi.stubGlobal("fetch", fonts());
    await openProject(await placedExample("payments"), "/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: "Simulate" }));
    const scenarios = await screen.findByRole("region", { name: "Scenarios" });
    await user.click(within(scenarios).getByRole("button", { name: "More for Pays in time" }));
    await user.click(screen.getByRole("menuitem", { name: "Export as page…" }));
    await waitFor(() => expect(files.map(file => file.name)).toEqual(["pays-in-time.html"]));
  });
});
