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

import { placedExample, readExample } from "../fixtures.js";

/** Inspect an element's Details. */
function details(doc, canvasId, id) {
  act(() => useView.setState({ inspectorDetails: true }));
  act(() => editorStore.getState().open(doc, { canvasId }));
  render(<Inspector />);
  act(() => inspectorStore.getState().show(id));
}

const doc = () => editorStore.getState().doc;
const field = name => screen.getByText(name, { selector: "span, label" }).parentElement;
const created = () => doc().canvases.cnv_open.nodes.nod_created;

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("what every element accepts", () => {
  it("records where a state was seen in code and in a document, line by line", async () => {
    const user = userEvent.setup();
    details(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    const evidence = field("Evidence");
    await user.click(within(evidence).getByRole("button", { name: "In code" }));
    await user.keyboard("src/payments/core.js{Enter}");
    expect(created().evidence).toEqual([{ kind: "code", path: "src/payments/core.js" }]);
    await user.click(within(evidence).getByRole("button", { name: "src/payments/core.js" }));
    await user.type(within(evidence).getByRole("textbox", { name: "Lines" }), "34-52{Enter}");
    expect(created().evidence).toEqual([{ kind: "code", path: "src/payments/core.js", lines: "34-52" }]);
    expect(within(evidence).getByRole("button", { name: "src/payments/core.js:34-52" })).toBeTruthy();

    await user.click(within(evidence).getByRole("button", { name: "In a document" }));
    await user.keyboard("not a link{Enter}");
    expect(screen.getByRole("alert").textContent).toContain("That would leave the document invalid.");
    // Core's own words stay English in every interface language, and say so (WCAG 3.1.2).
    expect(screen.getByRole("alert").querySelector('[lang="en"]').textContent).not.toBe("");
    expect(created().evidence).toHaveLength(1);
    await user.clear(within(evidence).getByRole("textbox", { name: "URL" }));
    await user.keyboard("https://example.com/spec{Enter}");
    expect(created().evidence[1]).toEqual({ kind: "doc", url: "https://example.com/spec" });
    await user.click(within(evidence).getByRole("button", { name: "Take out src/payments/core.js:34-52" }));
    expect(created().evidence).toEqual([{ kind: "doc", url: "https://example.com/spec" }]);
  });

  it("cuts a long path of evidence short, whole on hover, clear of its remove button", async () => {
    const user = userEvent.setup();
    details(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    const evidence = field("Evidence");
    await user.click(within(evidence).getByRole("button", { name: "In code" }));
    await user.keyboard("Modules/module-email-sync/src/innerRoutes.js{Enter}");
    const path = within(evidence).getByTitle("Modules/module-email-sync/src/innerRoutes.js");
    expect(path.textContent).toBe("Modules/module-email-sync/src/innerRoutes.js");
    expect(path.className).toContain("truncate");
    expect(path.className).not.toContain("shrink-0");
  });

  it("opens a new line of evidence empty, whatever was typed in one left before", async () => {
    const user = userEvent.setup();
    details(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    const evidence = field("Evidence");
    await user.click(within(evidence).getByRole("button", { name: "In code" }));
    await user.keyboard("src/payments/core.js{Escape}");
    await user.click(within(evidence).getByRole("button", { name: "In a document" }));
    expect(within(evidence).getByRole("textbox", { name: "URL" }).value).toBe("");
    expect(created()).not.toHaveProperty("evidence");
  });

  it("tags a state, and gives a tag a tone in the diagram's colours", async () => {
    const user = userEvent.setup();
    details(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    await user.type(screen.getByRole("textbox", { name: "Add a tag" }), "pix{Enter}");
    expect(created().tags).toEqual([{ text: "pix" }]);
    await user.click(screen.getByRole("button", { name: "pix" }));
    const tones = screen.getByRole("radiogroup", { name: "Tone of pix" });
    await user.click(within(tones).getByRole("radio", { name: "Warning" }));
    expect(created().tags).toEqual([{ text: "pix", tone: "warning" }]);
    expect(screen.getByRole("button", { name: "pix" }).parentElement.style.color).toBe("var(--sw-92400e)");
    await user.click(within(tones).getByRole("radio", { name: "Neutral" }));
    expect(created().tags).toEqual([{ text: "pix" }]);
    await user.click(screen.getByRole("button", { name: "Take out pix" }));
    expect(created()).not.toHaveProperty("tags");
  });

  it("highlights a box on the diagram with Look here, as one change of that name", async () => {
    const user = userEvent.setup();
    details(readExample("get-paid-as-built"), "cnv_open", "nod_created");
    await user.click(screen.getByRole("switch", { name: "Look here" }));
    expect(doc().annotations.focus).toEqual(["nod_created"]);
    expect(editorStore.getState().history.past.at(-1).label).toBe("Look here");
    await user.click(screen.getByRole("switch", { name: "Look here" }));
    expect(doc().annotations?.focus ?? []).not.toContain("nod_created");
  });
});

describe("layout", () => {
  it("shows a box with an interior as a box, a card or a frame, keeping where it is", async () => {
    const user = userEvent.setup();
    const source = await placedExample("get-paid-as-built");
    details(source, "cnv_transaction", "nod_open");
    const before = source.layout.canvases.cnv_transaction.nodes.nod_open;
    await user.click(within(screen.getByRole("radiogroup", { name: "Show as" })).getByRole("radio", { name: "Card" }));
    const after = doc().layout.canvases.cnv_transaction.nodes.nod_open;
    expect(after).toMatchObject({ x: before.x, y: before.y, display: "card" });
    await user.click(within(screen.getByRole("radiogroup", { name: "Show as" })).getByRole("radio", { name: "Box" }));
    expect(doc().layout.canvases.cnv_transaction.nodes.nod_open).not.toHaveProperty("display");
    act(() => inspectorStore.getState().show("nod_cancelled"));
    expect(screen.queryByRole("radiogroup", { name: "Show as" })).toBeNull();
  });

  it("gives a box a size of its own, and back to automatic", async () => {
    const user = userEvent.setup();
    const source = await placedExample("get-paid-as-built");
    details(source, "cnv_transaction", "nod_cancelled");
    await user.type(within(field("Size")).getByRole("textbox", { name: "Width" }), "220{Enter}");
    expect(doc().layout.canvases.cnv_transaction.nodes.nod_cancelled.w).toBe(220);
    await user.click(within(field("Size")).getByRole("button", { name: "Automatic" }));
    expect(doc().layout.canvases.cnv_transaction.nodes.nod_cancelled).not.toHaveProperty("w");
  });

  it("says whether an arrow's route is stored, and draws it plainly again", async () => {
    const user = userEvent.setup();
    const source = await placedExample("get-paid-as-built");
    details(source, "cnv_open", "edg_createdAwaitingPayment");
    expect(within(field("Route")).getByText(/Stored route/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reset route" }));
    expect(doc().layout.canvases.cnv_open.edges?.edg_createdAwaitingPayment).toBeUndefined();
    expect(within(field("Route")).getByText("Drawn automatically")).toBeTruthy();
  });
});
