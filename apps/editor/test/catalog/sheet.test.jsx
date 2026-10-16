// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { newProject } from "@/files/new-project";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

/** Payments in the store, the sheet open on a collection. */
function open(collection, item) {
  act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
  const onNavigate = vi.fn();
  render(<CatalogSheet onNavigate={onNavigate} />);
  act(() => catalogStore.getState().show({ collection, item }));
  return onNavigate;
}

const doc = () => editorStore.getState().doc;
const sheet = () => screen.getByRole("dialog", { name: "Catalog" });

afterEach(() => {
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
});

describe("the catalog sheet", () => {
  it("lists the ten collections and the reusable parts with their counts, and a list's items found by name", async () => {
    const user = userEvent.setup();
    open("events");
    const nav = within(sheet()).getByRole("navigation");
    expect(
      within(nav)
        .getAllByRole("button")
        .map(button => button.textContent)
    ).toEqual([
      `Events${Object.keys(doc().catalog.events).length}`,
      "Actions2",
      "Guards1",
      "Types2",
      "Endpoints1",
      "Webhooks1",
      "Timers2",
      "Statuses7",
      "Parties3",
      "Highlights0",
      "Reusable parts3"
    ]);
    await user.type(within(sheet()).getByRole("textbox", { name: "Find…" }), "ops.");
    const list = within(sheet()).getByRole("region", { name: "Events" });
    expect(
      within(list)
        .getAllByRole("button")
        .filter(button => button.textContent.startsWith("ops.")).length
    ).toBe(Object.values(doc().catalog.events).filter(item => item.name.startsWith("ops.")).length);
  });

  it("shows an item's fields and where it is used, and goes to a use on its level", async () => {
    const user = userEvent.setup();
    const onNavigate = open("types", "typ_expiryContext");
    expect(within(sheet()).getByRole("textbox", { name: "Name" }).value).toBe("ExpiryContext");
    const used = within(sheet()).getByRole("region", { name: "Used by" });
    await user.click(within(used).getByRole("button", { name: /Expiry clock/ }));
    expect(onNavigate).toHaveBeenCalledWith("cnv_expiryClock");
    expect(catalogStore.getState().open).toBe(false);
  });

  it("lists the scenarios that use an event, on the level they run, and goes there", async () => {
    const user = userEvent.setup();
    const onNavigate = open("events", "evt_verifyStarted");
    const used = within(sheet()).getByRole("region", { name: "Used by" });
    const row = within(used).getByRole("button", { name: /Verification pauses the clock/ });
    expect(row.textContent).toBe("ScenarioVerification pauses the clock· Stepsin Lifecycle engine");
    await user.click(row);
    expect(onNavigate).toHaveBeenCalledWith("cnv_lifecycle");
  });

  it("shows a level that uses an item with the level's details open where the item is named", async () => {
    const user = userEvent.setup();
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    render(
      <>
        <CatalogSheet onNavigate={id => editorStore.getState().setCanvas(id)} />
        <Inspector />
      </>
    );
    act(() => catalogStore.getState().show({ collection: "types", item: "typ_expiryContext" }));
    await user.click(
      within(screen.getByRole("region", { name: "Used by" })).getByRole("button", { name: /Expiry clock/ })
    );
    expect(editorStore.getState().canvasId).toBe("cnv_expiryClock");
    const inspector = screen.getByRole("dialog", { name: "Inspector" });
    expect(within(inspector).getByText("State machine")).toBeTruthy();
    expect(within(inspector).getByText("Context type")).toBeTruthy();
    expect(within(inspector).getByText("ExpiryContext")).toBeTruthy();
    // The layer the person chose stays theirs: a box picked next is shown on it, as usual.
    expect(useView.getState().inspectorDetails).toBe(false);
    act(() => editorStore.getState().select(["nod_paused"]));
    expect(inspectorStore.getState().focus).toBeNull();
    expect(
      within(screen.getByRole("dialog", { name: "Inspector" })).getByRole("button", { name: "Show details" })
    ).toBeTruthy();
    useView.setState(VIEW_DEFAULTS);
  });

  it("makes a new item named first, renames it in place, and removes it at once while it is unused", async () => {
    const user = userEvent.setup();
    open("statuses");
    await user.click(within(sheet()).getByRole("button", { name: "New status" }));
    const [id, made] = Object.entries(doc().catalog.statuses).find(([, item]) => item.name === "New status");
    expect(made).toEqual({ name: "New status" });
    const name = within(sheet()).getByRole("textbox", { name: "Name" });
    expect(document.activeElement).toBe(name);
    await user.clear(name);
    await user.type(name, "On review");
    expect(doc().catalog.statuses[id].name).toBe("On review");
    await user.click(within(sheet()).getByRole("button", { name: "Remove" }));
    expect(doc().catalog.statuses[id]).toBeUndefined();
  });

  it("says how many uses an item has before removing it with them", async () => {
    const user = userEvent.setup();
    open("types", "typ_expiryContext");
    await user.click(within(sheet()).getByRole("button", { name: "Remove" }));
    expect(within(sheet()).getByRole("alert").textContent).toContain("Used in 1 place");
    expect(doc().catalog.types.typ_expiryContext).toBeTruthy();
    await user.click(within(sheet()).getByRole("button", { name: "Remove it and its uses" }));
    expect(doc().catalog.types.typ_expiryContext).toBeUndefined();
    expect(doc().canvases.cnv_expiryClock).not.toHaveProperty("context");
  });

  it("says which boxes and arrows go too when they cannot be without the item", async () => {
    const user = userEvent.setup();
    const project = newProject({ name: "Pay", kind: "flow", names: { state: "Open", end: "Done" } }, new Set());
    const [start] = Object.keys(project.canvases[project.root].nodes);
    const source = applyBatch(project, [
      { type: "catalog.add", args: { collection: "actions", id: "act_charge", item: { name: "Charge" } } },
      {
        type: "node.add",
        args: {
          canvas: project.root,
          id: "nod_charge",
          node: { kind: "action", name: "Charge the card", action: "act_charge" }
        }
      },
      {
        type: "edge.add",
        args: { canvas: project.root, id: "edg_startCharge", edge: { from: start, to: "nod_charge" } }
      }
    ]).doc;
    act(() => editorStore.getState().open(source, { canvasId: source.root }));
    render(<CatalogSheet onNavigate={vi.fn()} />);
    act(() => catalogStore.getState().show({ collection: "actions", item: "act_charge" }));
    await user.click(within(sheet()).getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("alert").textContent).toContain(
      "What needs it goes too: 1 box (Charge the card) and 1 arrow."
    );
    await user.click(screen.getByRole("button", { name: "Remove it and its uses" }));
    expect(doc().canvases[source.root].nodes).not.toHaveProperty("nod_charge");
  });

  it("closes with Esc (the browser's cancel of a modal dialog)", () => {
    open("events");
    fireEvent(sheet(), new Event("cancel", { cancelable: true }));
    expect(catalogStore.getState().open).toBe(false);
  });
});
