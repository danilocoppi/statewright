// @vitest-environment jsdom
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

function inspect(doc, canvasId, id) {
  act(() => useView.setState({ inspectorDetails: true }));
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Inspector />);
  act(() => editorStore.getState().select([id]));
}

const doc = () => editorStore.getState().doc;
const section = name => screen.getByText(name, { selector: "span" }).parentElement;

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("findings", () => {
  it("lists the findings about a box with their badges, opens one to edit it, and removes one", async () => {
    const user = userEvent.setup();
    const source = applyBatch(readExample("payments"), [
      {
        type: "finding.upsert",
        args: {
          id: "fnd_slow",
          finding: { code: "SLOW", title: "Runs too seldom", severity: "low", targets: ["nod_scheduler"] }
        }
      }
    ]).doc;
    inspect(source, "cnv_runtime", "nod_scheduler");
    const findings = section("Findings");
    expect(within(findings).getByText("SLOW")).toBeTruthy();
    await user.click(within(findings).getByRole("button", { name: /Runs too seldom/ }));
    expect(screen.getByRole("textbox", { name: "Title" }).value).toBe("Runs too seldom");
    await user.click(screen.getByRole("button", { name: "Hide details" }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Severity" })).getByRole("radio", { name: "High" }));
    expect(doc().annotations.findings.fnd_slow.severity).toBe("high");
    await user.click(screen.getByRole("button", { name: "Back to the selection" }));
    await user.click(screen.getByRole("button", { name: "Show details" }));
    await user.click(within(section("Findings")).getByRole("button", { name: "Take out SLOW" }));
    expect(doc().annotations?.findings ?? {}).not.toHaveProperty("fnd_slow");
  });

  it("writes a new finding about a box, and shows it to be told what it is", async () => {
    const user = userEvent.setup();
    inspect(readExample("payments"), "cnv_runtime", "nod_scheduler");
    await user.click(within(section("Findings")).getByRole("button", { name: "Add a finding" }));
    const [[id, finding]] = Object.entries(doc().annotations.findings);
    expect(finding).toEqual({ code: "REVIEW", title: "To check", severity: "info", targets: ["nod_scheduler"] });
    expect(inspectorStore.getState().focus).toBe(id);
    expect(screen.getByRole("textbox", { name: "Title" }).value).toBe("To check");
    // Its title has the focus, selected: what is typed names it.
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Title" }));
    await user.keyboard("Runs too seldom");
    expect(doc().annotations.findings[id].title).toBe("Runs too seldom");
  });

  it("goes back to the selection when the finding it shows is undone", async () => {
    const user = userEvent.setup();
    inspect(readExample("payments"), "cnv_runtime", "nod_scheduler");
    await user.click(within(section("Findings")).getByRole("button", { name: "Add a finding" }));
    expect(inspectorStore.getState().focus).not.toBeNull();
    act(() => editorStore.getState().undo());
    expect(inspectorStore.getState().focus).toBeNull();
    expect(screen.getByRole("dialog", { name: "Inspector" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Name" }).value).toBe("Scheduler");
  });
});

describe("lanes", () => {
  it("makes a lane on the level, chooses its boxes, names it in place, and removes it", async () => {
    const user = userEvent.setup();
    act(() => useView.setState({ inspectorDetails: true }));
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
    render(<Inspector />);
    act(() => inspectorStore.getState().show("cnv_runtime"));
    expect(within(section("Lanes")).getByText("No lanes.")).toBeTruthy();
    await user.click(within(section("Lanes")).getByRole("button", { name: "Make a lane" }));
    const [[id, lane]] = Object.entries(doc().annotations.lanes);
    expect(lane).toEqual({ canvas: "cnv_runtime", label: "Lane 1", nodes: [] });
    expect(document.activeElement.value).toBe("Lane 1");
    expect([document.activeElement.selectionStart, document.activeElement.selectionEnd]).toEqual([0, 6]);
    // The new lane is shown; its boxes are in Basics.
    await user.click(screen.getByRole("button", { name: "Hide details" }));
    await user.click(within(section("Boxes")).getByRole("button", { name: "Add" }));
    await user.keyboard("Sched");
    await user.click(screen.getByRole("option", { name: /Scheduler/ }));
    expect(doc().annotations.lanes[id].nodes).toEqual(["nod_scheduler"]);

    act(() => inspectorStore.getState().show("cnv_runtime"));
    await user.click(screen.getByRole("button", { name: "Show details" }));
    const caption = within(section("Lanes")).getByRole("textbox", { name: "Caption" });
    await user.clear(caption);
    await user.type(caption, "Back office");
    expect(doc().annotations.lanes[id].label).toBe("Back office");
    expect(within(section("Lanes")).getByText("1 box")).toBeTruthy();
    await user.click(within(section("Lanes")).getByRole("button", { name: "Take out Back office" }));
    expect(doc().annotations?.lanes ?? {}).not.toHaveProperty(id);
  });
});
