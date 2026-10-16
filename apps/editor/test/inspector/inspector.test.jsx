// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { inspectorWidthStore } from "@/stores/inspector";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

/** Get paid, on its level "open", with the inspector. */
function show({ readOnly = false } = {}) {
  act(() => editorStore.getState().open(readExample("get-paid-as-built"), { canvasId: "cnv_open", readOnly }));
  return render(<Inspector />);
}

const select = ids => act(() => editorStore.getState().select(ids));
const node = id => editorStore.getState().doc.canvases.cnv_open.nodes[id];
const labels = () => editorStore.getState().history.past.map(entry => entry.label);
const inspector = () => screen.getByRole("dialog", { name: "Inspector" });

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
  inspectorWidthStore.setState({ width: 340 });
});

describe("the inspector", () => {
  it("appears with the selection, headed by the element's name and what it is, where", () => {
    show();
    expect(screen.queryByRole("dialog", { name: "Inspector" })).toBeNull();
    select(["nod_awaitingPayment"]);
    expect(within(inspector()).getByRole("textbox", { name: "Name" }).value).toBe("awaiting_payment");
    expect(within(inspector()).getByText("State in Open")).toBeTruthy();
    select(["edg_createdAwaitingPayment"]);
    expect(within(inspector()).getByRole("textbox", { name: "Name" }).placeholder).toBe("created → awaiting_payment");
    expect(within(inspector()).getByText("Transition in Open")).toBeTruthy();
  });

  it("applies what is typed as one undoable change per field, until the field loses the focus", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_awaitingPayment"]);
    const description = screen.getByRole("textbox", { name: "Description" });
    await user.type(description, "The payer has the instructions.");
    expect(node("nod_awaitingPayment").description).toBe("The payer has the instructions.");
    expect(labels()).toEqual(["Edit Description"]);
    fireEvent.blur(description);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "_now");
    expect(node("nod_awaitingPayment").name).toBe("awaiting_payment_now");
    expect(labels()).toEqual(["Edit Description", "Edit Name"]);
    act(() => editorStore.getState().undo());
    expect(node("nod_awaitingPayment").name).toBe("awaiting_payment");
  });

  it("chooses in plain words, and leaves the key out with the choice that says nothing", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_awaitingPayment"]);
    const happens = screen.getByRole("radiogroup", { name: "What happens here" });
    expect(within(happens).getByRole("radio", { name: "Waits on someone" }).getAttribute("aria-checked")).toBe("true");
    await user.click(within(happens).getByRole("radio", { name: "On hold" }));
    expect(node("nod_awaitingPayment").category).toBe("hold");
    await user.click(within(happens).getByRole("radio", { name: "Nothing special" }));
    expect(node("nod_awaitingPayment")).not.toHaveProperty("category");
    await user.click(screen.getByRole("switch", { name: "Nothing leaves it" }));
    expect(node("nod_awaitingPayment").terminal).toBe(true);
  });

  it("keeps a name it cannot empty, and says why Core refuses a value without changing anything", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_awaitingPayment"]);
    const name = screen.getByRole("textbox", { name: "Name" });
    await user.clear(name);
    expect(screen.getByRole("alert").textContent).toContain("This cannot be empty.");
    expect(node("nod_awaitingPayment").name).toBe("awaiting_payment");
    fireEvent.blur(name);
    expect(name.value).toBe("awaiting_payment");

    act(() => inspectorStore.getState().show("cnv_open"));
    await user.click(screen.getByRole("button", { name: "Show details" }));
    const before = editorStore.getState().doc;
    await user.type(screen.getByRole("textbox", { name: "Code" }), "a b");
    expect(screen.getByRole("alert").textContent).toContain("That would leave the document invalid.");
    // Core's own words stay English in every interface language, and say so (WCAG 3.1.2).
    expect(screen.getByRole("alert").querySelector('[lang="en"]').textContent).not.toBe("");
    expect(editorStore.getState().doc.canvases.cnv_open.code).toBe("a");
    expect(before.canvases.cnv_open).not.toHaveProperty("code");
  });

  it("shows the name of what it shows now, never a name being typed for what it showed before", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_awaitingPayment"]);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "_soon");
    select(["nod_created"]);
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe(node("nod_created").name);
  });

  it("shows Details with the ID and the element's JSON, and remembers which layer was open", async () => {
    const user = userEvent.setup();
    const view = show();
    select(["nod_awaitingPayment"]);
    await user.click(screen.getByRole("button", { name: "Show details" }));
    expect(within(inspector()).getByText("nod_awaitingPayment")).toBeTruthy();
    const json = within(inspector()).getByRole("region", { name: "Element JSON (read-only)" });
    expect(json.textContent).toContain('"category": "waiting"');
    // Long JSON scrolls in its box; the keyboard can scroll it too.
    expect(json.querySelector("pre").tabIndex).toBe(0);
    expect(screen.getByRole("radiogroup", { name: "Provenance" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Kind" }).value).toBe("state");
    view.unmount();
    render(<Inspector />);
    expect(useView.getState().inspectorDetails).toBe(true);
    expect(screen.getByRole("button", { name: "Hide details" })).toBeTruthy();
  });

  it("keeps the basics on show with Details: the description, the highlights and the rest, then the details", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_awaitingPayment"]);
    await user.click(screen.getByRole("button", { name: "Show details" }));
    const panel = inspector();
    expect(within(panel).getByRole("textbox", { name: "Description" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Add highlight" })).toBeTruthy();
    expect(within(panel).getByRole("radiogroup", { name: "Provenance" })).toBeTruthy();
    // The basics first, the details after them.
    const order = [...panel.querySelectorAll('[data-testid="inspector-field"]')].map(row => row.textContent);
    const description = order.findIndex(text => text.startsWith("Description"));
    const provenance = order.findIndex(text => text.startsWith("Provenance"));
    expect(description).toBeGreaterThanOrEqual(0);
    expect(description).toBeLessThan(provenance);
  });

  it("changes a box's kind, leaving out what the new kind does not take", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_awaitingPayment"]);
    await user.click(screen.getByRole("button", { name: "Show details" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Kind" }), "choice");
    expect(node("nod_awaitingPayment")).toEqual({
      kind: "choice",
      name: "awaiting_payment",
      summary: "instructions issued"
    });
    expect(labels()).toEqual(["Edit Kind"]);
  });

  it("greys out the kinds Core would refuse for this box, before one is chosen", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_openStart"]);
    await user.click(screen.getByRole("button", { name: "Show details" }));
    const kind = screen.getByRole("combobox", { name: "Kind" });
    const option = name => within(kind).getByRole("option", { name });
    // Opened (a click, or the focus from the keyboard), the field tries each kind.
    await user.click(kind);
    // An initial node has no name: as a state it would need one, and the option says what to set first.
    expect(option("State — set Name first").disabled).toBe(true);
    expect(option("Choice").disabled).toBe(false);
    expect(option("Initial node").disabled).toBe(false);
  });

  it("shows the level's or the project's details when asked, until the selection changes", () => {
    show();
    act(() => inspectorStore.getState().show("cnv_open"));
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe("Open");
    expect(within(inspector()).getByText("State machine")).toBeTruthy();
    act(() => inspectorStore.getState().show(editorStore.getState().doc.project.id));
    expect(within(inspector()).getByText("Project")).toBeTruthy();
    select(["nod_created"]);
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe("created");
  });

  it("closes with Esc or its button, until the selection changes", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_created"]);
    await user.click(screen.getByRole("button", { name: "Close the inspector" }));
    expect(screen.queryByRole("dialog", { name: "Inspector" })).toBeNull();
    select(["nod_expired"]);
    fireEvent.keyDown(screen.getByRole("radio", { name: "Waits on someone" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Inspector" })).toBeNull();
  });

  it("lists several selected elements, each a way to select it alone", async () => {
    const user = userEvent.setup();
    show();
    select(["nod_created", "nod_awaitingPayment"]);
    expect(within(inspector()).getByText("2 elements selected")).toBeTruthy();
    await user.click(within(inspector()).getByRole("button", { name: "created" }));
    expect(editorStore.getState().view.selections.cnv_open).toEqual(["nod_created"]);
    // An arrow without a name is called by its ends.
    select(["nod_created", "edg_createdAwaitingPayment"]);
    expect(within(inspector()).getByRole("button", { name: "created → awaiting_payment" })).toBeTruthy();
  });

  it("changes nothing in a read-only tab", () => {
    show({ readOnly: true });
    select(["nod_awaitingPayment"]);
    expect(screen.getByRole("textbox", { name: "Name" }).disabled).toBe(true);
    expect(screen.getByRole("textbox", { name: "Description" }).disabled).toBe(true);
    expect(screen.getByRole("radio", { name: "On hold" }).disabled).toBe(true);
  });
});

describe("resizing the inspector", () => {
  const edge = () => within(inspector()).getByRole("separator", { name: "Resize the inspector" });
  const width = () => inspector().style.width;

  it("has an edge a screen reader knows as a vertical separator, with the width and its limits", () => {
    window.innerWidth = 1440;
    show();
    select(["nod_awaitingPayment"]);
    expect(edge().getAttribute("aria-orientation")).toBe("vertical");
    expect(edge().getAttribute("aria-valuenow")).toBe("340");
    expect(edge().getAttribute("aria-valuemin")).toBe("340");
    expect(edge().getAttribute("aria-valuemax")).toBe("720");
    expect(edge().tabIndex).toBe(0);
    expect(width()).toBe("340px");
  });

  it("widens with ←, narrows with →, and goes to its limits with Home and End", () => {
    window.innerWidth = 1440;
    show();
    select(["nod_awaitingPayment"]);
    fireEvent.keyDown(edge(), { key: "ArrowLeft" });
    fireEvent.keyDown(edge(), { key: "ArrowLeft" });
    expect(width()).toBe("372px");
    expect(edge().getAttribute("aria-valuenow")).toBe("372");
    fireEvent.keyDown(edge(), { key: "ArrowRight" });
    expect(width()).toBe("356px");
    fireEvent.keyDown(edge(), { key: "End" });
    expect(width()).toBe("720px");
    fireEvent.keyDown(edge(), { key: "Home" });
    expect(width()).toBe("340px");
    fireEvent.keyDown(edge(), { key: "ArrowRight" });
    expect(width()).toBe("340px");
  });

  it("goes back to 340 px with a double click on its edge", () => {
    window.innerWidth = 1440;
    show();
    select(["nod_awaitingPayment"]);
    fireEvent.keyDown(edge(), { key: "End" });
    fireEvent.doubleClick(edge());
    expect(width()).toBe("340px");
    expect(inspectorWidthStore.getState().width).toBe(340);
  });

  it("is no wider than 60 % of a narrow window", () => {
    window.innerWidth = 1000;
    show();
    select(["nod_awaitingPayment"]);
    fireEvent.keyDown(edge(), { key: "End" });
    expect(width()).toBe("600px");
    expect(edge().getAttribute("aria-valuemax")).toBe("600");
  });
});
