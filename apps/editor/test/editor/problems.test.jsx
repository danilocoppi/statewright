// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { check } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { RepositoryContext } from "@/app/repository";
import { catalogStore } from "@/catalog/state";
import EditorPage from "@/features/editor/EditorPage";
import { memoryRepository } from "@/persistence/repository";
import { problemRows, sentence } from "@/problems/rows";
import { problemsStore } from "@/problems/store";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { placedExample } from "../fixtures.js";

async function openPayments(path = "/p/prj_payments") {
  const repository = { ...memoryRepository(), persistent: true };
  const doc = await placedExample("payments");
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
  const problems = check(doc);
  await screen.findByRole("button", { name: `${problems.length} problems` }, { timeout: 4000 });
  return { doc, problems };
}

const box = id => document.querySelector(`.react-flow__node[data-id="${id}"]`);

afterEach(() => act(() => useView.setState(VIEW_DEFAULTS)));

describe("Problems in the editor", () => {
  it("closes the panel with Esc while its button has the focus, and stays on the level", async () => {
    const user = userEvent.setup();
    const { problems } = await openPayments("/p/prj_payments/cnv_lifecycle");
    const button = screen.getByRole("button", { name: `${problems.length} problems` });
    await user.click(button);
    expect(screen.getByRole("dialog", { name: "Problems" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Problems" })).toBeNull();
    expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_lifecycle");
    expect(document.activeElement).toBe(button);
  });

  it("counts the project's Problems and lists them by severity, with a filter for each", async () => {
    const user = userEvent.setup();
    const { doc, problems } = await openPayments("/p/prj_payments/cnv_lifecycle");
    const button = screen.getByRole("button", { name: `${problems.length} problems` });
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const panel = screen.getByRole("dialog", { name: "Problems" });
    const rows = problemRows(doc, problems);
    expect(within(panel).getAllByRole("listitem")).toHaveLength(rows.length);
    const filter = within(panel).getByRole("radiogroup", { name: "Show" });
    expect(
      within(filter)
        .getAllByRole("radio")
        .map(radio => radio.textContent)
    ).toEqual([
      `All ${problems.length}`,
      `Errors ${problems.filter(problem => problem.severity === "error").length}`,
      `Warnings ${problems.filter(problem => problem.severity === "warning").length}`,
      `Incomplete ${problems.filter(problem => problem.severity === "incomplete").length}`
    ]);
    const events = rows.find(row => row.kind === "group" && row.collection === "events");
    expect(within(panel).getByText(`${events.names.length} events do not specify payload`)).toBeTruthy();
    await user.click(within(filter).getByRole("radio", { name: /^Errors/ }));
    expect(within(panel).getByText("None of this kind.")).toBeTruthy();
    fireEvent.keyDown(within(panel).getByRole("radio", { name: /^Errors/ }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Problems" })).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_lifecycle");
  });

  it("shows the level of a Problem picked in the panel, with its element selected", async () => {
    const user = userEvent.setup();
    await openPayments();
    await user.click(screen.getByRole("button", { name: /problems$/ }));
    await user.click(screen.getByRole("button", { name: /^State "compliance_hold" has no way out/ }));
    await waitFor(() => expect(screen.getByTestId("canvas").dataset.canvas).toBe("cnv_lifecycle"));
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual(["nod_complianceHold"]);
    await waitFor(() => expect(editorStore.getState().view.reveal).toBeNull());
  });

  it("links each Problem to what its rule means in the guide, in a new tab", async () => {
    const user = userEvent.setup();
    const { doc, problems } = await openPayments("/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: `${problems.length} problems` }));
    const panel = screen.getByRole("dialog", { name: "Problems" });
    const links = within(panel).getAllByRole("link", { name: /^What .* means \(opens in a new tab\)$/ });
    expect(links).toHaveLength(problemRows(doc, problems).length);
    const [stuck] = within(panel).getAllByRole("link", { name: "What machine.stuck means (opens in a new tab)" });
    expect(stuck.getAttribute("href")).toBe("/readme#rule-machine.stuck");
    expect(stuck.getAttribute("target")).toBe("_blank");
    expect(stuck.closest("li").textContent).toContain("has no way out");
    // Core's own words stay English in every interface language, and say so (WCAG 3.1.2).
    expect(stuck.closest("li").querySelector('[lang="en"]').textContent).toContain("has no way out");
    // A group of Problems is worded by the editor, in the interface's language.
    for (const message of panel.querySelectorAll('[lang="en"]')) expect(message.textContent).not.toMatch(/^\d+ /);
  });

  it("highlights the element on the canvas while the pointer rests on its line", async () => {
    const user = userEvent.setup();
    await openPayments("/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: /problems$/ }));
    const line = screen.getByRole("button", { name: /^State "compliance_hold"/ });
    fireEvent.pointerEnter(line);
    expect(problemsStore.getState().highlight).toBe("nod_complianceHold");
    await waitFor(() => expect(box("nod_complianceHold").querySelector(".sw-highlight")).toBeTruthy());
    fireEvent.pointerLeave(line);
    expect(problemsStore.getState().highlight).toBeNull();
  });

  it("opens the panel on an element's Problems from its marker's details, whatever it was showing", async () => {
    const user = userEvent.setup();
    await openPayments("/p/prj_payments/cnv_lifecycle");
    await waitFor(() => expect(box("nod_complianceHold").querySelector(".problem-marker")).toBeTruthy());
    await user.hover(box("nod_complianceHold").querySelector(".problem-marker"));
    const details = await screen.findByRole("dialog", { name: "Problems on compliance_hold" });
    await user.click(within(details).getByRole("button", { name: "Show in Problems" }));
    const panel = screen.getByRole("dialog", { name: "Problems" });
    const [row] = within(panel)
      .getAllByTestId("problems-row")
      .filter(item => item.getAttribute("aria-current") === "true");
    expect(row.textContent).toContain('State "compliance_hold" has no way out');
    expect(problemsStore.getState().highlight).toBe("nod_complianceHold");

    // Open on another kind, it shows them all again.
    await user.click(within(panel).getByRole("radio", { name: /^Errors/ }));
    await user.hover(box("nod_expiryClock").querySelector(".problem-marker"));
    const clock = await screen.findByRole("dialog", { name: "Problems on expiry_clock" });
    await user.click(within(clock).getByRole("button", { name: "Show in Problems" }));
    expect(within(panel).getByRole("radio", { name: /^All/ }).getAttribute("aria-checked")).toBe("true");
    const current = within(panel)
      .getAllByTestId("problems-row")
      .filter(item => item.getAttribute("aria-current") === "true");
    expect(current.map(item => item.textContent)).toEqual([expect.stringContaining('"expiry_clock" has no way out')]);

    // Closed, the panel forgets the element.
    fireEvent.keyDown(within(panel).getByRole("radio", { name: /^All/ }), { key: "Escape" });
    expect(problemsStore.getState().focus).toBeNull();
  });

  it("marks the boxes that have Problems, and hides incomplete markers when asked", async () => {
    await openPayments("/p/prj_payments/cnv_lifecycle");
    await waitFor(() => expect(box("nod_complianceHold").querySelector("[data-severity]")).toBeTruthy());
    expect(box("nod_complianceHold").querySelector("[data-severity]").dataset.severity).toBe("incomplete");
    expect(box("nod_phaseInitial").querySelector("[data-severity]")).toBeNull();
    act(() => useView.getState().toggle("incomplete"));
    expect(box("nod_complianceHold").querySelector("[data-severity]")).toBeNull();
  });

  it("opens a group of catalog items to list each, and opens the catalog on the one picked", async () => {
    const user = userEvent.setup();
    const { doc, problems } = await openPayments("/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: `${problems.length} problems` }));
    const panel = screen.getByRole("dialog", { name: "Problems" });
    const events = problemRows(doc, problems).find(row => row.kind === "group" && row.collection === "events");
    const group = within(panel).getByRole("button", { name: new RegExp(`^${events.items.length} events do not`) });
    expect(group.getAttribute("aria-expanded")).toBe("false");
    await user.click(group);
    expect(group.getAttribute("aria-expanded")).toBe("true");
    const list = within(panel).getByRole("list", { name: `${events.items.length} events do not specify payload` });
    expect(within(list).getAllByRole("button")).toHaveLength(events.items.length);
    const [first] = events.items;
    await user.click(within(list).getByRole("button", { name: new RegExp(`^${first.name}`) }));
    expect(catalogStore.getState()).toMatchObject({ open: true, collection: "events", item: first.target });
    // The panel stays where it was, ready for the next one.
    expect(screen.getByRole("dialog", { name: "Problems" })).toBeTruthy();
    await user.click(group);
    expect(within(panel).queryByRole("list", { name: /events do not specify payload/ })).toBeNull();
    act(() => catalogStore.getState().close());
  });

  it("opens the catalog on a catalog item's own Problem", async () => {
    const user = userEvent.setup();
    const { problems } = await openPayments("/p/prj_payments/cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: `${problems.length} problems` }));
    const message = problems.find(problem => problem.target === "ept_createPayment").message;
    await user.click(screen.getByRole("button", { name: name => name.startsWith(sentence(message)) }));
    expect(catalogStore.getState()).toMatchObject({ open: true, collection: "endpoints", item: "ept_createPayment" });
    act(() => catalogStore.getState().close());
  });
});
