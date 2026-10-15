// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { toSVG } from "statewright/render";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { Toaster } from "@/components/ui/Toaster";
import { editingStore } from "@/editing/state";
import EditorPage from "@/features/editor/EditorPage";
import { memoryRepository } from "@/persistence/repository";
import { marksStore } from "@/marks/store";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";
import { useView } from "@/stores/view";

import { demoDoc, linkedPayments, placedExample, readExample } from "../fixtures.js";

const keeping = () => ({ ...memoryRepository(), persistent: true });
const rename = name => [{ type: "project.update", args: { set: { name } } }];

/** The address the editor is at. */
function Address() {
  return <output data-testid="address">{useLocation().pathname}</output>;
}

function renderEditor(repository, path) {
  render(
    <RepositoryContext value={repository}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/p/:projectId/:canvasId?" element={<EditorPage />} />
          <Route path="/" element={<p>Projects</p>} />
        </Routes>
        <Address />
      </MemoryRouter>
      <Toaster />
    </RepositoryContext>
  );
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

beforeEach(() => useToastStore.setState({ items: [] }));
afterEach(() => {
  vi.restoreAllMocks();
  delete navigator.locks;
});

describe("Editor page", () => {
  it("shows the project, its levels and the current level as Core draws it", async () => {
    const repository = keeping();
    await repository.save(readExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_lifecycle");
    const canvas = await screen.findByTestId("canvas");
    expect(canvas.dataset.canvas).toBe("cnv_lifecycle");
    await waitFor(() => expect(canvas.querySelector('.react-flow__node[data-id="nod_sendCrossBorder"]')).toBeTruthy());
    const levels = screen.getByRole("navigation", { name: "Levels" });
    expect(
      within(levels)
        .getAllByRole("link")
        .map(link => link.textContent)
    ).toEqual(["", "Runtime", "Lifecycle engine"]);
    expect(within(levels).getByRole("link", { current: "page" }).textContent).toBe("Lifecycle engine");
    expect(screen.getByRole("button", { name: /^Payments/ })).toBeTruthy();
  });

  it("offers Save to file where it says this browser cannot keep projects, so no work is lost (spec §10)", async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    const repository = memoryRepository();
    await repository.save(readExample("get-paid-as-built"));
    renderEditor(repository, "/p/prj_getPaid");
    const notice = (await screen.findByText(/can't keep projects/)).closest("[role='status']");
    await user.click(within(notice).getByRole("button", { name: "Save to file" }));
    await waitFor(() => expect(files.map(file => file.name)).toEqual(["get-paid-as-built.sttw"]));
  });

  it("explains when the project is not in this browser", async () => {
    renderEditor(keeping(), "/p/prj_missing");
    expect(await screen.findByText("This project isn't in this browser")).toBeTruthy();
  });

  it("renames the project from its menu, and undoes it with the keyboard", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    renderEditor(repository, "/p/prj_demo");
    await user.click(await screen.findByRole("button", { name: /^Demo/ }));
    await user.click(screen.getByRole("menuitem", { name: "Rename…" }));
    const dialog = screen.getByRole("dialog", { name: "Rename project" });
    const field = within(dialog).getByLabelText("Name");
    await user.clear(field);
    await user.type(field, "Checkout");
    await user.click(within(dialog).getByRole("button", { name: "Rename" }));
    expect(screen.getByRole("button", { name: /^Checkout/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByRole("button", { name: /^Demo/ })).toBeTruthy();
  });

  it("exports the level as exactly the SVG Core renders", async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    const repository = keeping();
    await repository.save(readExample("get-paid-as-built"));
    renderEditor(repository, "/p/prj_getPaid/cnv_open");
    await screen.findByTestId("canvas");
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("menuitem", { name: /Image \(SVG\)/ }));
    await waitFor(() => expect(files).toHaveLength(1));
    expect(files[0].name).toBe("get-paid-as-built-open.svg");
    expect(await files[0].blob.text()).toBe(await toSVG(editorStore.getState().doc, "cnv_open"));
    expect(await screen.findByText("Exported get-paid-as-built-open.svg")).toBeTruthy();
  });

  it("opens read-only when another tab holds the project, and offers to edit here", async () => {
    navigator.locks = {
      request: async (_name, options, callback) => (options.ifAvailable ? callback(null) : undefined)
    };
    const repository = keeping();
    await repository.save(demoDoc());
    renderEditor(repository, "/p/prj_demo");
    expect(await screen.findByText("This project is open in another tab, so this one is read-only.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit here" })).toBeTruthy();
    expect(editorStore.getState().readOnly).toBe(true);
    expect(screen.queryByRole("toolbar", { name: "Tools" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Auto-layout" })).toBeNull();
  });

  it("lists and opens the project as last changed right after leaving the editor", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    renderEditor(repository, "/p/prj_demo");
    await screen.findByTestId("canvas");
    editorStore.getState().dispatch(rename("Checkout"), { label: "Rename" });
    await user.click(screen.getByRole("link", { name: "Back to projects" }));
    expect((await repository.list()).map(summary => summary.name)).toEqual(["Checkout"]);
    expect((await repository.load("prj_demo")).project.name).toBe("Checkout");
  });

  it("says so, and offers a copy, when the last changes cannot be stored on leaving", async () => {
    const user = userEvent.setup();
    const files = captureDownloads();
    const repository = keeping();
    await repository.save(demoDoc());
    renderEditor(repository, "/p/prj_demo");
    await screen.findByTestId("canvas");
    repository.save = async () => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    };
    editorStore.getState().dispatch(rename("Checkout"), { label: "Rename" });
    await user.click(screen.getByRole("link", { name: "Back to projects" }));
    expect(
      await screen.findByText("Couldn't store the latest changes to Checkout in this browser (its storage is full).")
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Download a copy" }));
    await waitFor(() => expect(files).toHaveLength(1));
    expect(files[0].name).toBe("checkout.sttw");
    expect(JSON.parse(await files[0].blob.text()).project.name).toBe("Checkout");
  });

  it("shows names holding markup as text", async () => {
    const repository = keeping();
    const doc = demoDoc();
    doc.canvases.cnv_demo.nodes.nod_api.name = '<img src="x" onerror="alert(1)">';
    await repository.save(doc);
    renderEditor(repository, "/p/prj_demo");
    const canvas = await screen.findByTestId("canvas");
    await waitFor(() => expect(canvas.querySelector('.react-flow__node[data-id="nod_api"]')).toBeTruthy());
    expect(canvas.querySelector("img")).toBeNull();
    expect(canvas.querySelector('.react-flow__node[data-id="nod_api"]').textContent).toBe(
      '<img src="x" onerror="alert(1)">'
    );
  });
  it("keeps the keys for the marks while a marking tool is in hand (collaboration spec §5.1)", async () => {
    const repository = keeping();
    await repository.save(await placedExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_lifecycle");
    await screen.findByTestId("canvas");
    act(() => editorStore.getState().select(["nod_expiryClock"]));
    act(() => {
      marksStore.getState().setTool("pencil");
      marksStore.getState().add({
        level: "cnv_lifecycle",
        kind: "stroke",
        colour: "red",
        points: [
          [0, 0],
          [9, 9]
        ]
      });
    });
    const before = editorStore.getState().doc;
    try {
      fireEvent.keyDown(window, { key: "Delete" });
      fireEvent.keyDown(window, { key: "s" });
      fireEvent.keyDown(window, { key: "L", shiftKey: true });
      expect(editorStore.getState().doc).toBe(before);
      fireEvent.keyDown(window, { key: "z", ctrlKey: true });
      expect(marksStore.getState().marks).toEqual([]);
      expect(editorStore.getState().doc).toBe(before);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(marksStore.getState().tool).toBeNull();
      expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_lifecycle");
    } finally {
      act(() => {
        marksStore.getState().setTool(null);
        marksStore.getState().clear();
      });
    }
  });

  it("opens the levels with L", async () => {
    const repository = keeping();
    await repository.save(await placedExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_lifecycle");
    await screen.findByTestId("canvas");
    expect(screen.queryByRole("dialog", { name: "Levels" })).toBeNull();
    fireEvent.keyDown(window, { key: "l" });
    expect(await screen.findByRole("dialog", { name: "Levels" })).toBeTruthy();
  });

  it("goes up a level with Esc, clearing the selection first", async () => {
    const repository = keeping();
    await repository.save(await placedExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_lifecycle");
    await screen.findByTestId("canvas");
    const current = () =>
      within(screen.getByRole("navigation", { name: "Levels" })).getByRole("link", { current: "page" });
    act(() => editorStore.getState().select(["nod_sendCrossBorder"]));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual([]);
    expect(current().textContent).toBe("Lifecycle engine");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(current().textContent).toBe("Runtime"));
    expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_runtime");
  });

  it("follows the link selected with Enter, and comes back to it with Esc once nothing is selected", async () => {
    const repository = keeping();
    await repository.save(await linkedPayments());
    renderEditor(repository, "/p/prj_payments/cnv_expiryClock");
    await screen.findByTestId("canvas");
    const address = () => screen.getByTestId("address").textContent;
    const current = () =>
      within(screen.getByRole("navigation", { name: "Levels" })).getByRole("link", { current: "page" });
    act(() => editorStore.getState().select(["nod_toHold"]));
    fireEvent.keyDown(document.body, { key: "Enter" });
    await waitFor(() => expect(address()).toBe("/p/prj_payments/cnv_lifecycle"));
    expect(current().textContent).toBe("Lifecycle engine");
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual(["nod_complianceHold"]);
    // Esc clears the selection first, as everywhere; then it goes back to the link, not up a level.
    fireEvent.keyDown(window, { key: "Escape" });
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual([]);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(address()).toBe("/p/prj_payments/cnv_expiryClock"));
    expect(editorStore.getState().view.selections.cnv_expiryClock).toEqual(["nod_toHold"]);
    // Back where it was, Esc does what it always does: clears the selection, then goes up.
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(address()).toBe("/p/prj_payments/cnv_lifecycle"));
  });

  it("goes up with Esc from where a link led once the person has moved on from there", async () => {
    const repository = keeping();
    await repository.save(await linkedPayments());
    renderEditor(repository, "/p/prj_payments/cnv_expiryClock");
    await screen.findByTestId("canvas");
    const address = () => screen.getByTestId("address").textContent;
    act(() => editorStore.getState().select(["nod_toPart"]));
    fireEvent.keyDown(document.body, { key: "Enter" });
    await waitFor(() => expect(address()).toBe("/p/prj_payments/cnv_crossBorderSend"));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Levels" })).getByRole("link", { name: "Runtime" }));
    await waitFor(() => expect(address()).toBe("/p/prj_payments"));
    act(() => editorStore.getState().setCanvas("cnv_crossBorderSend"));
    await waitFor(() => expect(address()).toBe("/p/prj_payments/cnv_crossBorderSend"));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(address()).toBe("/p/prj_payments/cnv_lifecycle"));
  });

  it("renames a link with F2, Enter and a double-click being for following it", async () => {
    const repository = keeping();
    await repository.save(await linkedPayments());
    renderEditor(repository, "/p/prj_payments/cnv_expiryClock");
    await screen.findByTestId("canvas");
    act(() => editorStore.getState().select(["nod_toHold"]));
    fireEvent.keyDown(document.body, { key: "F2" });
    expect(editingStore.getState().editor).toEqual({ type: "name", id: "nod_toHold" });
    act(() => editingStore.getState().close());
  });

  it("shows the top level, with its address, when the address names a level the project does not have", async () => {
    const repository = keeping();
    await repository.save(await placedExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_nope");
    await screen.findByTestId("canvas");
    await waitFor(() => expect(screen.getByTestId("address").textContent).toBe("/p/prj_payments"));
    expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_runtime");
  });

  it("opens the level named in the address without arranging the levels above it", async () => {
    const repository = keeping();
    await repository.save(readExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_lifecycle");
    await waitFor(() => expect(editorStore.getState().doc?.layout?.canvases?.cnv_lifecycle).toBeTruthy(), {
      timeout: 5000
    });
    expect(Object.keys(editorStore.getState().doc.layout.canvases)).toEqual(["cnv_lifecycle"]);
  });

  it("says when the project's copy in this browser cannot be read, instead of loading for ever", async () => {
    const repository = keeping();
    repository.load = async id => {
      throw new Error(`The stored copy of ${id} is damaged`);
    };
    renderEditor(repository, "/p/prj_payments");
    expect(
      await screen.findByRole("heading", { name: "This project's copy in this browser can't be read" })
    ).toBeTruthy();
    expect(screen.getByText("Open its file to replace it, or delete it from your projects.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to projects" }).getAttribute("href")).toBe("/");
  });

  it("hands the project to another tab: no change gets in, the last is stored, then what is stored is shown", async () => {
    // One exclusive lock, as the browser's Web Locks keep it for this tab; the other tab speaks over the channel.
    const held = new Set();
    const locks = {
      request: async (name, options, callback = options) => {
        if (held.has(name)) return callback(null);
        held.add(name);
        await callback({ name });
        held.delete(name);
      }
    };
    Object.defineProperty(navigator, "locks", { value: locks, configurable: true });
    const other = new BroadcastChannel("statewright:locks");
    try {
      const repository = keeping();
      await repository.save(await placedExample("get-paid-as-built"));
      let stored;
      const save = repository.save;
      repository.save = async (...args) => {
        // While the last change is being stored, a change made in this tab is refused.
        stored ??= editorStore.getState().dispatch(rename("Too late"), { label: "Rename" });
        return save(...args);
      };
      renderEditor(repository, "/p/prj_getPaid");
      await screen.findByTestId("canvas");
      act(() => editorStore.getState().dispatch(rename("Mine"), { label: "Rename" }));
      other.postMessage({ type: "take-over", projectId: "prj_getPaid" });
      await waitFor(() => expect(editorStore.getState().history.past).toHaveLength(0));
      expect(stored).toMatchObject({ ok: false, error: { code: "READ_ONLY" } });
      expect((await repository.load("prj_getPaid")).project.name).toBe("Mine");
      expect(editorStore.getState()).toMatchObject({ readOnly: true, doc: { project: { name: "Mine" } } });
    } finally {
      other.close();
      delete navigator.locks;
    }
  });

  it("keeps what a tab handing its project over could not store: no store from there, and a copy if it edits again", async () => {
    const user = userEvent.setup();
    const held = new Set();
    const locks = {
      request: async (name, options, callback = options) => {
        if (held.has(name)) return callback(null);
        held.add(name);
        await callback({ name });
        held.delete(name);
      }
    };
    Object.defineProperty(navigator, "locks", { value: locks, configurable: true });
    const other = new BroadcastChannel("statewright:locks");
    try {
      const repository = keeping();
      await repository.save(await placedExample("get-paid-as-built"));
      repository.save = async () => {
        throw new DOMException("The disk is full", "QuotaExceededError");
      };
      renderEditor(repository, "/p/prj_getPaid");
      await screen.findByTestId("canvas");
      act(() => editorStore.getState().dispatch(rename("Mine"), { label: "Rename" }));
      other.postMessage({ type: "take-over", projectId: "prj_getPaid" });
      await waitFor(() => expect(editorStore.getState().readOnly).toBe(true));
      await screen.findByRole("button", { name: "Edit here" });
      expect(editorStore.getState().doc.project.name).toBe("Mine");
      // Storing from here would write over the other tab's work: only Save to file is offered.
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
      expect(screen.getAllByRole("button", { name: "Save to file" }).length).toBeGreaterThan(0);
      // Editing here again shows what is stored, and offers this tab's change as a file.
      const files = captureDownloads();
      await user.click(screen.getByRole("button", { name: "Edit here" }));
      await waitFor(() => expect(editorStore.getState().doc.project.name).toBe("Get paid (as built)"));
      await user.click(await screen.findByRole("button", { name: "Download a copy" }));
      await waitFor(() => expect(files).toHaveLength(1));
      expect(await files[0].blob.text()).toContain('"name": "Mine"');
    } finally {
      other.close();
      delete navigator.locks;
    }
  });

  it("returns to the level of an undone change, address included", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(await placedExample("payments"));
    renderEditor(repository, "/p/prj_payments/cnv_lifecycle");
    await screen.findByTestId("canvas");
    act(() => editorStore.getState().dispatch(rename("Renamed"), { label: "Rename" }));
    const levels = screen.getByRole("navigation", { name: "Levels" });
    await user.click(within(levels).getByRole("link", { name: "Runtime" }));
    await waitFor(() => expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_runtime"));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    await waitFor(() =>
      expect(within(levels).getByRole("link", { current: "page" }).textContent).toBe("Lifecycle engine")
    );
    expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_lifecycle");
    await waitFor(() => expect(screen.getByTestId("address").textContent).toBe("/p/prj_payments/cnv_lifecycle"));
  });

  it("jumps to any level from the project's list of levels", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(await placedExample("payments"));
    renderEditor(repository, "/p/prj_payments");
    await user.click(await screen.findByRole("button", { name: /^Payments/ }));
    await user.click(screen.getByRole("menuitem", { name: "Levels…" }));
    const dialog = screen.getByRole("dialog", { name: "Levels" });
    expect(within(dialog).getByRole("button", { current: "page" }).textContent).toContain("Runtime");
    await user.click(within(dialog).getAllByRole("button", { name: /^Cross-border send/ })[0]);
    await waitFor(() => expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_crossBorderSend"));
    expect(screen.queryByRole("dialog", { name: "Levels" })).toBeNull();
  });
  it("opens the guide in a new tab from the project menu, staying on the project", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const repository = keeping();
    await repository.save(await placedExample("get-paid-as-built"));
    renderEditor(repository, "/p/prj_getPaid");
    await user.click(await screen.findByRole("button", { name: /^Get paid/ }));
    await user.click(screen.getByRole("menuitem", { name: "Open the guide" }));
    expect(open).toHaveBeenCalledWith("/readme", "_blank", "noopener");
    expect(screen.getByTestId("canvas")).toBeTruthy();
    open.mockRestore();
  });

  it("turns the legend on from the project menu's View section", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(await placedExample("get-paid-as-built"));
    renderEditor(repository, "/p/prj_getPaid");
    await user.click(await screen.findByRole("button", { name: /^Get paid/ }));
    const item = screen.getByRole("menuitemcheckbox", { name: "Legend" });
    expect(item.getAttribute("aria-checked")).toBe("false");
    await user.click(item);
    expect(screen.getByRole("region", { name: "Legend" })).toBeTruthy();
    act(() => useView.getState().toggle("legend"));
  });
});
