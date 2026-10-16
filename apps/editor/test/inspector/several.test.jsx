// @vitest-environment jsdom
// Highlights on several elements at once (highlights spec §6): added where missing, taken off where present, one
// change each.
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Inspector } from "@/inspector/Inspector";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

const BOXES = ["nod_created", "nod_awaitingPayment", "nod_underpaid"];
const marked = () =>
  applyBatch(readExample("get-paid-as-built"), [
    {
      type: "catalog.add",
      args: { collection: "highlights", id: "hlt_critical", item: { name: "Critical", colour: "red" } }
    },
    { type: "node.update", args: { id: "nod_created", set: { highlights: ["hlt_critical"] } } }
  ]).doc;
const doc = () => editorStore.getState().doc;
const carried = () => BOXES.map(id => doc().canvases.cnv_open.nodes[id].highlights ?? []);

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("highlights on several elements", () => {
  it("adds a highlight only where it is missing, and takes it off where it is, each one Undo", async () => {
    const user = userEvent.setup();
    act(() => editorStore.getState().open(marked(), { canvasId: "cnv_open" }));
    render(<Inspector />);
    act(() => editorStore.getState().select(BOXES));
    act(() => inspectorStore.getState().reset());
    const section = screen.getByRole("group", { name: "Highlights" });
    expect(within(section).getByText("Critical").closest("li").textContent).toContain("1 of 3");
    await user.click(within(section).getByRole("button", { name: "Add highlight" }));
    await user.keyboard("Crit{Enter}");
    expect(carried()).toEqual([["hlt_critical"], ["hlt_critical"], ["hlt_critical"]]);
    act(() => editorStore.getState().undo());
    expect(carried()).toEqual([["hlt_critical"], [], []]);
    await user.click(within(section).getByRole("button", { name: "Take out Critical" }));
    expect(carried()).toEqual([[], [], []]);
    act(() => editorStore.getState().undo());
    expect(carried()).toEqual([["hlt_critical"], [], []]);
  });
});
