// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { TOOL_TYPE } from "@/editing/place";
import { editingStore } from "@/editing/state";
import { ToolDock } from "@/editing/ToolDock";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

/** A new project of a kind, placed, as the Projects screen creates it. */
function project(kind) {
  const doc = newProject({ name: "Tools", kind, names: { state: "Open", end: "Done" } }, new Set());
  const ids = Object.keys(doc.canvases[doc.root].nodes);
  return applyBatch(
    doc,
    ids.map((id, index) => ({ type: "layout.node.set", args: { canvas: doc.root, id, x: index * 200, y: 0 } }))
  ).doc;
}

function show(doc, canvasId) {
  act(() => editorStore.getState().open(doc, { canvasId }));
  return render(
    <>
      <ToolDock />
      <Canvas />
    </>
  );
}

/** A click on the empty canvas: a press and a release without moving. */
function clickCanvas(container, x = 600, y = 400) {
  const pane = container.querySelector(".react-flow__pane");
  fireEvent.pointerDown(pane, { button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(pane, { button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y });
}

const nodes = () => Object.values(editorStore.getState().doc.canvases[editorStore.getState().canvasId].nodes);

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
});

describe("tools on a machine with regions", () => {
  it("keeps the canvas while a tool is in hand and while a new state is named", async () => {
    const user = userEvent.setup();
    const { container } = show(await placedExample("payments"), "cnv_lifecycle");
    await user.click(screen.getByRole("button", { name: "State" }));
    fireEvent.pointerMove(container.querySelector(".react-flow__pane"), { clientX: 600, clientY: 400 });
    expect(container.querySelector(".react-flow")).not.toBeNull();
    clickCanvas(container);
    expect(screen.getByRole("textbox", { name: "Name" })).toBeTruthy();
    expect(container.querySelector(".react-flow")).not.toBeNull();
  });
});

describe("the tool dock", () => {
  it("shows the tools of the level's kind, each with its key", async () => {
    const user = userEvent.setup();
    show(project("machine"));
    const dock = screen.getByRole("toolbar", { name: "Tools" });
    expect(
      within(dock)
        .getAllByRole("button")
        .map(button => button.getAttribute("aria-label"))
    ).toEqual([
      "Select",
      "State",
      "Initial",
      "Choice",
      "History",
      "From any state",
      "Entry from outside",
      "Link to another level",
      "Note",
      "Level kind: State machine"
    ]);
    await user.hover(within(dock).getByRole("button", { name: "State" }));
    expect(screen.getByRole("tooltip").textContent).toBe("StateS");
  });

  it("places a state where the canvas is clicked, named in place, as one change, and puts the tool down", async () => {
    const user = userEvent.setup();
    const { container } = show(project("machine"));
    await user.click(screen.getByRole("button", { name: "State" }));
    expect(screen.getByRole("button", { name: "State" }).getAttribute("aria-pressed")).toBe("true");
    clickCanvas(container);
    expect(screen.getByText("New state")).toBeTruthy();
    const field = screen.getByRole("textbox", { name: "Name" });
    expect(document.activeElement).toBe(field);
    await user.type(field, "refunded{Enter}");
    const added = nodes().find(node => node.name === "refunded");
    expect(added).toEqual({ kind: "state", name: "refunded" });
    expect(editorStore.getState().history.past.map(entry => entry.label)).toEqual(["Add state"]);
    expect(editingStore.getState().tool).toBe("select");
    const [selected] = editorStore.getState().view.selections[editorStore.getState().canvasId];
    expect(editorStore.getState().doc.canvases[editorStore.getState().canvasId].nodes[selected].name).toBe("refunded");
    // A keyboard user keeps their place: the focus is on the new box, not left nowhere.
    await waitFor(() => expect(document.activeElement.dataset.id).toBe(selected));
  });

  it("drops a new box with Esc, and names it for the person when Enter comes first", async () => {
    const user = userEvent.setup();
    const { container } = show(project("machine"));
    await user.click(screen.getByRole("button", { name: "State" }));
    clickCanvas(container);
    await user.keyboard("paid{Escape}");
    expect(nodes()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "State" }));
    clickCanvas(container);
    await user.keyboard("{Enter}");
    expect(nodes().map(node => node.name)).toContain("New state");
  });

  it("drops a new box left untouched when the person goes elsewhere, and keeps one whose name was typed", async () => {
    const user = userEvent.setup();
    const { container } = show(project("machine"));
    await user.click(screen.getByRole("button", { name: "State" }));
    clickCanvas(container);
    fireEvent.blur(screen.getByRole("textbox", { name: "Name" }));
    expect(nodes()).toHaveLength(2);
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "State" }));
    clickCanvas(container);
    await user.keyboard("Paid");
    fireEvent.blur(screen.getByRole("textbox", { name: "Name" }));
    expect(nodes().map(node => node.name)).toContain("Paid");
  });

  it("adds a box without a name at once, and says why a second initial node cannot go in the region", async () => {
    const user = userEvent.setup();
    const { container } = show(project("machine"));
    await user.click(screen.getByRole("button", { name: "Choice" }));
    clickCanvas(container);
    expect(nodes().filter(node => node.kind === "choice")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Initial" }));
    clickCanvas(container, 300, 300);
    expect(screen.getByRole("alert").textContent).toContain("This region already starts at an initial node.");
    expect(nodes().filter(node => node.kind === "initial")).toHaveLength(1);
  });

  it("asks what a flow step does, and creates the action in the same change", async () => {
    const user = userEvent.setup();
    const { container } = show(project("flow"));
    await user.click(screen.getByRole("button", { name: "Action" }));
    clickCanvas(container);
    const chooser = screen.getByRole("dialog", { name: "What does this step do?" });
    await user.type(within(chooser).getByRole("combobox"), "Charge the card{Enter}");
    const { doc } = editorStore.getState();
    const [actionId, action] = Object.entries(doc.catalog.actions)[0];
    expect(action).toEqual({ name: "Charge the card" });
    expect(nodes().find(node => node.kind === "action")).toEqual({ kind: "action", action: actionId });
    expect(editorStore.getState().history.past).toHaveLength(1);
  });

  it("asks which level a link leads to", async () => {
    const user = userEvent.setup();
    const { container } = show(await placedExample("payments"), "cnv_runtime");
    await user.click(screen.getByRole("button", { name: "Link to another level" }));
    clickCanvas(container);
    const chooser = screen.getByRole("dialog", { name: "Which level does it lead to?" });
    await user.type(within(chooser).getByRole("combobox"), "cross");
    await user.keyboard("{Enter}");
    expect(nodes().find(node => node.kind === "ref")).toEqual({ kind: "ref", target: "cnv_crossBorderSend" });
  });

  it("may ask above the new box and its label, never over them", async () => {
    const user = userEvent.setup();
    const { container } = show(project("flow"));
    await user.click(screen.getByRole("button", { name: "Action" }));
    clickCanvas(container);
    const chooser = screen.getByRole("dialog", { name: "What does this step do?" });
    const draft = chooser.previousElementSibling;
    expect(Number(chooser.dataset.above)).toBeLessThan(Number.parseFloat(draft.style.top) - 10);
  });

  it("writes a note where the canvas is clicked", async () => {
    const user = userEvent.setup();
    const { container } = show(project("system"));
    await user.click(screen.getByRole("button", { name: "Note" }));
    clickCanvas(container);
    await user.type(screen.getByRole("textbox", { name: "Note" }), "Ask ops about limits{Enter}");
    const notes = Object.values(editorStore.getState().doc.annotations.notes);
    expect(notes).toEqual([{ canvas: editorStore.getState().canvasId, text: "Ask ops about limits" }]);
  });

  it("places a tool dragged from the dock onto the canvas", async () => {
    const { container } = show(project("system"));
    const data = new Map();
    const dataTransfer = {
      setData: (type, value) => data.set(type, value),
      getData: type => data.get(type) ?? "",
      get types() {
        return [...data.keys()];
      }
    };
    fireEvent.dragStart(screen.getByRole("button", { name: "Queue" }), { dataTransfer });
    expect(data.get(TOOL_TYPE)).toBe("queue");
    const canvas = screen.getByTestId("canvas");
    // jsdom's drag events carry no pointer position: give the drop one, as a browser does.
    const at = type => {
      const event = createEvent[type](canvas, { dataTransfer });
      Object.defineProperties(event, { clientX: { value: 500 }, clientY: { value: 300 } });
      return event;
    };
    fireEvent(canvas, at("dragOver"));
    fireEvent(canvas, at("drop"));
    await waitFor(() => expect(screen.getByText("New queue")).toBeTruthy());
    await userEvent.setup().keyboard("Outbox{Enter}");
    expect(nodes().find(node => node.kind === "queue")).toEqual({ kind: "queue", name: "Outbox" });
    expect(container.querySelector(".sw-ghost")).toBeNull();
  });
});
