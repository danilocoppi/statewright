// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { verify } from "statewright";
import { beforeEach, describe, expect, it } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { Toaster } from "@/components/ui/Toaster";
import ProjectsPage from "@/features/projects/ProjectsPage";
import { memoryRepository } from "@/persistence/repository";
import { useToastStore } from "@/stores/toast";

import { demoDoc, exampleText, readExample } from "../fixtures.js";

function Opened() {
  const { projectId } = useParams();
  return <p>Opened {projectId}</p>;
}

/** The Projects screen over a repository; opening a project shows "Opened <id>". */
function renderPage(repository) {
  render(
    <RepositoryContext value={repository}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/p/:projectId" element={<Opened />} />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </RepositoryContext>
  );
  return repository;
}

/** A repository that behaves as if the browser keeps projects. */
const keeping = () => ({ ...memoryRepository(), persistent: true });

/** The repository from then on refuses to store anything, as a browser whose storage is full. */
function fill(repository) {
  repository.save = async () => {
    throw new DOMException("Storage is full", "QuotaExceededError");
  };
  return repository;
}

const storageFull =
  "Couldn't store the project in this browser (its storage is full). Delete projects you no longer need, then try again.";

const fileOf = (text, name) => new File([text], name, { type: "application/json" });
const upload = (text, name) => userEvent.upload(screen.getByLabelText("Open file…"), fileOf(text, name));

beforeEach(() => useToastStore.setState({ items: [] }));

describe("Projects screen", () => {
  it("starts empty, with the ways to begin and without a storage warning", async () => {
    renderPage(keeping());
    expect(await screen.findByText(/No projects yet/)).toBeTruthy();
    for (const name of ["System", "State machine", "Flow", "Payments", "Get paid (as built)", "Payout batch"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name.replace(/[()]/g, "\\$&")}`) })).toBeTruthy();
    }
    expect(screen.queryByText(/can't keep projects/)).toBeNull();
    expect(screen.getByRole("link", { name: "Read how Statewright works" }).getAttribute("href")).toBe("/readme");
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("href")).toBe("/readme");
  });

  it("links to the source on GitHub, in a new tab, and offers support", async () => {
    renderPage(keeping());
    await screen.findByText(/No projects yet/);
    const github = screen.getByRole("link", { name: "GitHub (opens in a new tab)" });
    expect(github.getAttribute("href")).toBe("https://github.com/danilocoppi/statewright");
    expect(github.getAttribute("target")).toBe("_blank");
    expect(github.getAttribute("rel")).toBe("noreferrer");
    expect(github.querySelector("svg")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Support" }).getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("warns when this browser cannot keep projects", async () => {
    renderPage(memoryRepository());
    expect(
      await screen.findByText("This browser can't keep projects. Use Save to file to keep your work.")
    ).toBeTruthy();
  });

  it("lists projects with the most recently changed first, with their stage", async () => {
    const repository = keeping();
    await repository.save(readExample("get-paid-as-built"), { now: Date.now() - 60_000 });
    await repository.save(demoDoc(), { now: Date.now() });
    renderPage(repository);
    const list = await screen.findByRole("region", { name: "Projects" });
    const names = within(list)
      .getAllByRole("heading", { level: 3 })
      .map(heading => heading.textContent);
    expect(names).toEqual(["Demo", "Get paid (as built)"]);
    expect(within(list).getByText("As built")).toBeTruthy();
    expect(within(list).getByText("Edited 1 minute ago")).toBeTruthy();
  });

  it("creates a project of the chosen kind and opens it", async () => {
    const user = userEvent.setup();
    const repository = renderPage(keeping());
    await user.click(await screen.findByRole("button", { name: "New project" }));
    const dialog = screen.getByRole("dialog", { name: "New project" });
    await user.type(within(dialog).getByLabelText("Name"), "Checkout");
    await user.click(within(dialog).getByRole("radio", { name: "Flow" }));
    await user.click(within(dialog).getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Opened prj_checkout")).toBeTruthy();
    const doc = await repository.load("prj_checkout");
    expect(doc.canvases[doc.root].kind).toBe("flow");
  });

  it("opens an intact file at once", async () => {
    renderPage(keeping());
    await screen.findByText(/No projects yet/);
    await upload(exampleText("payments"), "payments.statewright.json");
    expect(await screen.findByText("Opened prj_payments")).toBeTruthy();
  });

  it("asks for a review of a file changed outside Statewright and imports it signed", async () => {
    const user = userEvent.setup();
    const repository = renderPage(keeping());
    await screen.findByText(/No projects yet/);
    const raw = JSON.parse(exampleText("get-paid-as-built"));
    raw.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting";
    await upload(JSON.stringify(raw), "get-paid.statewright.json");
    const dialog = await screen.findByRole("dialog", { name: "This file was changed outside Statewright" });
    await user.click(within(dialog).getByRole("button", { name: "Import and sign" }));
    expect(await screen.findByText("Opened prj_getPaid")).toBeTruthy();
    const stored = await repository.load("prj_getPaid");
    expect(stored.canvases.cnv_open.nodes.nod_awaitingPayment.name).toBe("waiting");
    expect(await verify(stored)).toEqual({ content: "ok", annotations: "ok", layout: "ok" });
  });

  it("forgets the old copy's file when another file, opened without one, replaces it", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(readExample("get-paid-as-built"));
    await repository.setHandle("prj_getPaid", { name: "old.statewright.json" });
    renderPage(repository);
    const raw = JSON.parse(exampleText("get-paid-as-built"));
    raw.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting";
    await upload(JSON.stringify(raw), "get-paid.statewright.json");
    const dialog = await screen.findByRole("dialog", { name: "This file was changed outside Statewright" });
    await user.click(within(dialog).getByRole("button", { name: "Import and sign" }));
    expect(await screen.findByText("Opened prj_getPaid")).toBeTruthy();
    // The next Save to file asks where, instead of writing over the file the old copy came from.
    expect(await repository.getHandle("prj_getPaid")).toBeNull();
  });

  it("shows why a file cannot be opened and imports nothing", async () => {
    const user = userEvent.setup();
    const repository = renderPage(keeping());
    await screen.findByText(/No projects yet/);
    await upload("not json at all", "notes.txt");
    const dialog = await screen.findByRole("dialog", { name: "This file can't be opened" });
    expect(dialog.textContent).toMatch(/Invalid JSON/);
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(await repository.list()).toEqual([]);
  });

  it("deletes a project and brings it back with Undo", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    renderPage(repository);
    await user.click(await screen.findByRole("button", { name: "More actions for Demo" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Projects" })).toBeNull());
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByRole("heading", { name: "Demo" })).toBeTruthy();
  });

  it("says when a project's copy cannot be read, from its card, and lets its file replace it", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(readExample("get-paid-as-built"));
    const load = repository.load;
    repository.load = async id => {
      throw new Error(`The stored copy of ${id} is damaged`);
    };
    renderPage(repository);
    const unreadable = "The copy of Get paid (as built) in this browser can't be read. Open its file to replace it.";
    for (const action of ["Save to file", "Duplicate"]) {
      await user.click(await screen.findByRole("button", { name: "More actions for Get paid (as built)" }));
      await user.click(screen.getByRole("menuitem", { name: action }));
      expect(await screen.findByText(unreadable)).toBeTruthy();
      useToastStore.setState({ items: [] });
    }
    await upload(exampleText("get-paid-as-built"), "get-paid.statewright.json");
    expect(await screen.findByText("Opened prj_getPaid")).toBeTruthy();
    expect(
      await screen.findByText(
        "The copy of Get paid (as built) in this browser couldn't be read; this file replaced it."
      )
    ).toBeTruthy();
    repository.load = load;
    expect((await repository.load("prj_getPaid")).project.name).toBe("Get paid (as built)");
  });

  it("renames a project from its card", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    renderPage(repository);
    await user.click(await screen.findByRole("button", { name: "More actions for Demo" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename…" }));
    const dialog = screen.getByRole("dialog", { name: "Rename project" });
    const name = within(dialog).getByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Refunds{Enter}");
    expect(await screen.findByRole("heading", { name: "Refunds" })).toBeTruthy();
    expect((await repository.load("prj_demo")).project.name).toBe("Refunds");
  });

  it("leaves a project open in another tab to be renamed there", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    // The editing tab holds the project's lock (spec §4.7).
    const locks = { request: async (name, options, callback) => callback(null) };
    Object.defineProperty(navigator, "locks", { value: locks, configurable: true });
    try {
      renderPage(repository);
      await user.click(await screen.findByRole("button", { name: "More actions for Demo" }));
      await user.click(screen.getByRole("menuitem", { name: "Rename…" }));
      const name = within(screen.getByRole("dialog", { name: "Rename project" })).getByRole("textbox", {
        name: "Name"
      });
      await user.clear(name);
      await user.type(name, "Refunds{Enter}");
      expect(await screen.findByText("Demo is open in another tab. Rename it there.")).toBeTruthy();
      expect((await repository.load("prj_demo")).project.name).toBe("Demo");
    } finally {
      delete navigator.locks;
    }
  });

  it("duplicates a project under a new name", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    renderPage(repository);
    await user.click(await screen.findByRole("button", { name: "More actions for Demo" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(await screen.findByRole("heading", { name: "Demo (copy)" })).toBeTruthy();
    expect((await repository.list()).map(summary => summary.id).sort()).toEqual(["prj_demo", "prj_demoCopy"]);
  });

  it("says so when this browser cannot store an imported file, and stays here", async () => {
    renderPage(fill(keeping()));
    await screen.findByText(/No projects yet/);
    await upload(exampleText("payments"), "payments.statewright.json");
    expect(await screen.findByText(storageFull)).toBeTruthy();
    expect(screen.queryByText(/^Opened/)).toBeNull();
  });

  it("says so when this browser cannot store a new project, and stays here", async () => {
    const user = userEvent.setup();
    renderPage(fill(keeping()));
    await user.click(await screen.findByRole("button", { name: "New project" }));
    const dialog = screen.getByRole("dialog", { name: "New project" });
    await user.type(within(dialog).getByLabelText("Name"), "Checkout");
    await user.click(within(dialog).getByRole("button", { name: "Create project" }));
    expect(await screen.findByText(storageFull)).toBeTruthy();
    expect(screen.queryByText(/^Opened/)).toBeNull();
  });

  it("says so when this browser cannot store a duplicate", async () => {
    const user = userEvent.setup();
    const repository = keeping();
    await repository.save(demoDoc());
    renderPage(fill(repository));
    await user.click(await screen.findByRole("button", { name: "More actions for Demo" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(await screen.findByText(storageFull)).toBeTruthy();
    expect(screen.queryByText(/^Duplicated/)).toBeNull();
  });
});
