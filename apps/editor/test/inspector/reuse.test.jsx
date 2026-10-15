// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

function inspect(doc, canvasId, id) {
  act(() => useView.setState({ inspectorDetails: true }));
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Inspector />);
  act(() => inspectorStore.getState().show(id));
}

const doc = () => editorStore.getState().doc;
const interior = () => screen.getByText("Interior", { selector: "span" }).parentElement;

afterEach(() => {
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("a box's interior", () => {
  it("gives a state a machine inside, makes it reusable, detaches it into a copy, and stops using a part", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    expect(within(interior()).getByText("Nothing inside yet.")).toBeTruthy();
    await user.click(within(interior()).getByRole("button", { name: "Add a state machine inside" }));
    const inside = doc().canvases.cnv_open.nodes.nod_created.inner.canvas;
    expect(doc().canvases[inside]).toMatchObject({ kind: "machine", name: "created" });

    await user.click(within(interior()).getByRole("button", { name: "Make reusable" }));
    const [part, definition] = Object.entries(doc().definitions)[0];
    expect(definition).toMatchObject({ kind: "machine", name: "created" });
    expect(doc().canvases.cnv_open.nodes.nod_created.inner).toEqual({ definition: part });
    expect(within(interior()).getByText("Reusable part, used once")).toBeTruthy();

    await user.click(within(interior()).getByRole("button", { name: "Detach this use" }));
    expect(doc().canvases.cnv_open.nodes.nod_created.inner).toHaveProperty("canvas");
    await user.click(within(interior()).getByRole("button", { name: "Remove" }));
    await user.click(within(interior()).getByRole("button", { name: "Remove it" }));
    expect(doc().canvases.cnv_open.nodes.nod_created).not.toHaveProperty("inner");
  });

  it("uses a reusable part of a kind the box can hold, found by name", async () => {
    const user = userEvent.setup();
    inspect(readExample("payments"), "cnv_runtime", "nod_scheduler");
    await user.click(within(interior()).getByRole("button", { name: "Use a reusable part" }));
    await user.keyboard("Expiry");
    await user.click(screen.getByRole("option", { name: /Expiry clock/ }));
    expect(doc().canvases.cnv_runtime.nodes.nod_scheduler.inner).toEqual({ definition: "def_expiryClock" });
    expect(within(interior()).getByText("Reusable part, used 2 times")).toBeTruthy();
  });

  it("says when what is edited is in a reusable part's body, and so in every use", () => {
    const payments = readExample("payments");
    const [state] = Object.keys(payments.canvases.cnv_complianceHold.nodes);
    inspect(payments, "cnv_complianceHold", state);
    expect(
      screen.getByText("In the reusable part Compliance hold, used once: what changes here changes in every use.")
    ).toBeTruthy();
  });
});

describe("reusable parts in the catalog sheet", () => {
  function sheet() {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    const onNavigate = vi.fn();
    render(<CatalogSheet onNavigate={onNavigate} />);
    act(() => catalogStore.getState().show({ collection: "definitions" }));
    return onNavigate;
  }

  it("lists the parts with their kind and uses, opens a part's body, and makes a new one of a kind", async () => {
    const user = userEvent.setup();
    const onNavigate = sheet();
    const list = screen.getByRole("region", { name: "Reusable parts" });
    expect(within(list).getByRole("button", { name: /Compliance hold/ }).textContent).toContain(
      "State machine · used once"
    );
    await user.click(within(list).getByRole("button", { name: /Expiry clock/ }));
    await user.click(screen.getByRole("button", { name: "Open its body" }));
    expect(onNavigate).toHaveBeenCalledWith("cnv_expiryClock");

    act(() => catalogStore.getState().show({ collection: "definitions" }));
    await user.click(screen.getByRole("button", { name: "New reusable part" }));
    await user.click(screen.getByRole("button", { name: "Flow" }));
    const made = Object.values(doc().definitions).find(part => part.name === "New reusable part");
    expect(made).toMatchObject({ kind: "flow" });
    expect(doc().canvases[made.canvas]).toMatchObject({ kind: "flow" });
  });

  it("removes a used part only after saying how many boxes use it", async () => {
    const user = userEvent.setup();
    sheet();
    await user.click(
      within(screen.getByRole("region", { name: "Reusable parts" })).getByRole("button", { name: /Compliance hold/ })
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("alert").textContent).toContain("Used in 1 place");
    // Its own body goes with it, as expected; no box of the project goes: the one using it keeps its place.
    expect(screen.getByRole("alert").textContent).not.toContain("It also removes");
    await user.click(screen.getByRole("button", { name: "Remove it and its uses" }));
    expect(doc().definitions).not.toHaveProperty("def_complianceHold");
    expect(doc().canvases.cnv_lifecycle.nodes.nod_complianceHold).not.toHaveProperty("inner");
  });
});
