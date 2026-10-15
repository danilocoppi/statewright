// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch, buildIndex, collectRefs, usagesOf } from "statewright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { itemsOf } from "@/catalog/items";
import { Inspector } from "@/inspector/Inspector";
import { findItems } from "@/inspector/references";
import { inspectorStore } from "@/inspector/state";
import { entriesOf } from "@/palette/search";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { readExample } from "../fixtures.js";

// Spec §9: documents of up to 2,000 elements, an edit on the canvas within 50 ms. What the sheet's list, ⌘K and the
// pickers show is worked out with one walk of the document, not one per item they list.
vi.mock("statewright", async original => {
  const real = await original();
  return {
    ...real,
    applyBatch: vi.fn(real.applyBatch),
    buildIndex: vi.fn(real.buildIndex),
    collectRefs: vi.fn(real.collectRefs),
    usagesOf: vi.fn(real.usagesOf)
  };
});

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  act(() => editorStore.getState().close());
  inspectorStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("walking a document once", () => {
  it("counts the uses of every catalog item in one walk, kept for the document", () => {
    const doc = readExample("payments");
    const counts = itemsOf(t, doc, "events").map(item => item.line);
    expect(counts).toContain('inspector:refs.uses {"count":2}');
    itemsOf(t, doc, "events", "leg");
    entriesOf(t, doc);
    findItems(doc, ["events", "statuses"], "co");
    expect(usagesOf).not.toHaveBeenCalled();
    expect(collectRefs).toHaveBeenCalledTimes(1);
  });

  it("tries the kinds a box could take only when the Kind field is opened, not on every edit", async () => {
    const user = userEvent.setup();
    act(() => useView.setState({ inspectorDetails: true }));
    act(() => editorStore.getState().open(readExample("get-paid-as-built"), { canvasId: "cnv_open" }));
    render(<Inspector />);
    act(() => editorStore.getState().select(["nod_openStart"]));
    vi.clearAllMocks();
    await user.type(screen.getByRole("textbox", { name: "Summary" }), "abc");
    // One change per key, nothing tried besides.
    expect(applyBatch).toHaveBeenCalledTimes(3);
    vi.clearAllMocks();
    await user.click(screen.getByRole("combobox", { name: "Kind" }));
    expect(applyBatch.mock.calls.length).toBeGreaterThan(0);
  });

  it("indexes the document once for a note's inspector, however many boxes its level has", () => {
    const doc = applyBatch(readExample("payments"), [
      { type: "note.add", args: { id: "nte_check", note: { canvas: "cnv_crossBorderSend", text: "Check the legs" } } }
    ]).doc;
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_crossBorderSend" }));
    vi.clearAllMocks();
    render(<Inspector />);
    act(() => editorStore.getState().select(["nte_check"]));
    expect(screen.getByRole("combobox", { name: "Attached to" })).toBeTruthy();
    expect(buildIndex.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
