// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

function inspect(doc, canvasId, id, { details = false } = {}) {
  act(() => useView.setState({ inspectorDetails: details }));
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Inspector />);
  act(() => inspectorStore.getState().show(id));
}

const doc = () => editorStore.getState().doc;
const field = name => screen.getByText(name, { selector: "span, label" }).parentElement;

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("the level's details", () => {
  it("edits the heading printed over the diagram, its stage and how complete its transitions are", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "cnv_open");
    await user.type(screen.getByRole("textbox", { name: "Kicker" }), "Payments");
    await user.clear(screen.getByRole("textbox", { name: "Title" }));
    await user.type(screen.getByRole("textbox", { name: "Title" }), "How a payment opens");
    await user.click(within(screen.getByRole("radiogroup", { name: "Stage" })).getByRole("radio", { name: "Target" }));
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Transitions shown" })).getByRole("radio", { name: "All of them" })
    );
    expect(doc().canvases.cnv_open).toMatchObject({
      kicker: "Payments",
      title: "How a payment opens",
      stage: "target",
      transitions: "complete"
    });
  });

  it("makes the first region of a level, which takes every box, and the next ones", async () => {
    const user = userEvent.setup();
    inspect(readExample("get-paid-as-built"), "cnv_open", "cnv_open");
    expect(within(field("Regions")).getByText("One region: the whole level.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Add a region" }));
    const [[main, region]] = Object.entries(doc().canvases.cnv_open.regions);
    expect(region.name).toBe("Main");
    expect(Object.values(doc().canvases.cnv_open.nodes).every(node => node.region === main)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Add a region" }));
    expect(Object.values(doc().canvases.cnv_open.regions).map(item => item.name)).toEqual(["Main", "Region 2"]);
  });

  it("renames and describes a region in place, and takes one out, its boxes going to another", async () => {
    const user = userEvent.setup();
    const payments = readExample("payments");
    inspect(payments, "cnv_lifecycle", "cnv_lifecycle");
    const [[first], [second, other]] = Object.entries(payments.canvases.cnv_lifecycle.regions);
    const names = within(field("Regions")).getAllByRole("textbox", { name: "Name" });
    await user.type(names[0], " clock");
    expect(doc().canvases.cnv_lifecycle.regions[first].name).toBe(
      `${payments.canvases.cnv_lifecycle.regions[first].name} clock`
    );
    await user.type(within(field("Regions")).getAllByRole("textbox", { name: "Description" })[0], "Counts down");
    expect(doc().canvases.cnv_lifecycle.regions[first].description).toBe("Counts down");
    const moved = Object.keys(payments.canvases.cnv_lifecycle.nodes).filter(
      id => payments.canvases.cnv_lifecycle.nodes[id].region === second
    );
    await user.click(screen.getByRole("button", { name: `Take out ${other.name}` }));
    expect(doc().canvases.cnv_lifecycle.regions).not.toHaveProperty(second);
    expect(moved.every(id => doc().canvases.cnv_lifecycle.nodes[id].region === first)).toBe(true);
  });

  it("gives a machine the type of its context, in Details", async () => {
    const user = userEvent.setup();
    const payments = readExample("payments");
    inspect(payments, "cnv_lifecycle", "cnv_lifecycle", { details: true });
    const [type, item] = Object.entries(payments.catalog.types)[0];
    await user.click(screen.getByRole("button", { name: /^Context type/ }));
    await user.keyboard(item.name);
    await user.click(screen.getByRole("option", { name: new RegExp(item.name) }));
    expect(doc().canvases.cnv_lifecycle.context).toBe(type);
  });
});

describe("the project's details", () => {
  it("names and describes the project, and words its legend in its own terms", async () => {
    const user = userEvent.setup();
    const source = readExample("get-paid-as-built");
    inspect(source, "cnv_open", source.project.id, { details: true });
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe(source.project.name);
    const legend = field("Legend wording");
    const state = within(legend).getByRole("textbox", { name: "State" });
    await user.type(state, "Step of the payment");
    expect(doc().layout.legend.labels["state.plain"]).toBe("Step of the payment");
    await user.clear(state);
    expect(doc().layout.legend?.labels?.["state.plain"]).toBeUndefined();
    expect(editorStore.getState().history.past.map(entry => entry.label)).toEqual(["Edit Legend wording"]);
    // Each style's words are a change of their own.
    const rows = within(legend).getAllByRole("textbox");
    await user.type(rows[0], "Start");
    await user.type(rows[1], "Then");
    expect(editorStore.getState().history.past).toHaveLength(3);
  });
});
