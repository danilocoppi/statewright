// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { sign } from "statewright";
import { beforeEach, describe, expect, it } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { Toaster } from "@/components/ui/Toaster";
import ProjectsPage from "@/features/projects/ProjectsPage";
import { memoryRepository } from "@/persistence/repository";
import { useToastStore } from "@/stores/toast";

import { readExample } from "../fixtures.js";

/** An example as a file of format 1.0, signed by Statewright then; `edit` changes it afterwards, by hand. */
async function formatOne(name, edit = () => {}) {
  const file = await sign({ ...readExample(name), statewright: "1.0" }, { channel: "cli" });
  edit(file);
  return JSON.stringify(file, null, 2);
}

function Opened() {
  return <p>Opened {useParams().projectId}</p>;
}

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
}

const upload = (text, name) =>
  userEvent.upload(screen.getByLabelText("Open file…"), new File([text], name, { type: "application/json" }));
const notice = "Updated from format 1.0 to 1.1.";

beforeEach(() => useToastStore.setState({ items: [] }));

describe("a file from an older format", () => {
  it("says from which format it was updated, once it is opened", async () => {
    renderPage({ ...memoryRepository(), persistent: true });
    await screen.findByText(/No projects yet/);
    await upload(await formatOne("payments"), "payments.statewright.json");
    expect(await screen.findByText("Opened prj_payments")).toBeTruthy();
    expect(await screen.findByText(notice)).toBeTruthy();
  });

  it("says nothing when the review is cancelled, and says it once the file is imported", async () => {
    const user = userEvent.setup();
    renderPage({ ...memoryRepository(), persistent: true });
    await screen.findByText(/No projects yet/);
    const file = await formatOne(
      "get-paid-as-built",
      raw => (raw.canvases.cnv_open.nodes.nod_awaitingPayment.name = "waiting")
    );
    await upload(file, "get-paid.statewright.json");
    let dialog = await screen.findByRole("dialog", { name: "This file was changed outside Statewright" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText(/format/)).toBeNull();
    await upload(file, "get-paid.statewright.json");
    dialog = await screen.findByRole("dialog", { name: "This file was changed outside Statewright" });
    expect(screen.queryByText(/format/)).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: "Import and sign" }));
    expect(await screen.findByText("Opened prj_getPaid")).toBeTruthy();
    expect(await screen.findByText(notice)).toBeTruthy();
  });
});
