// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { beacon, beaconStore } from "@/canvas/beacon";
import { Canvas } from "@/canvas/Canvas";
import { followStore } from "@/canvas/follow";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { linkedPayments } from "../fixtures.js";

async function show(canvasId) {
  const doc = await linkedPayments();
  act(() => editorStore.getState().open(doc, { canvasId }));
  return render(<Canvas />);
}

const box = (container, id) => container.querySelector(`.react-flow__node[data-id="${id}"]`);
const mark = (container, id) => box(container, id)?.querySelector("[data-follow]");

afterEach(() =>
  act(() => {
    editorStore.getState().close();
    followStore.setState({ trail: [] });
    beaconStore.setState({ asked: null, lit: null });
  })
);

describe("a link on the canvas", () => {
  it("shows that it can be followed: a go-to mark that names where it leads, or says it leads nowhere now", async () => {
    const { container } = await show("cnv_expiryClock");
    await waitFor(() => expect(mark(container, "nod_toHold")).toBeTruthy());
    expect(mark(container, "nod_toHold").getAttribute("title")).toBe("Go to compliance_hold");
    expect(mark(container, "nod_toRuntime").getAttribute("title")).toBe("Go to Runtime");
    expect(mark(container, "nod_toEvent").getAttribute("title")).toBe("Go to hold.opened");
    expect(mark(container, "nod_toGone").getAttribute("title")).toBe(
      "What this link led to is no longer in the project."
    );
    expect(mark(container, "nod_running")).toBeFalsy();
  });

  it("is followed with a double-click — not renamed — to a box on the level above, selected", async () => {
    const { container } = await show("cnv_expiryClock");
    await waitFor(() => expect(box(container, "nod_toHold")).toBeTruthy());
    fireEvent.doubleClick(box(container, "nod_toHold"));
    expect(editingStore.getState().editor).toBeNull();
    await waitFor(() => expect(editorStore.getState().canvasId).toBe("cnv_lifecycle"));
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual(["nod_complianceHold"]);
  });

  it("is followed with Enter on it, and with a click on its mark", async () => {
    const { container } = await show("cnv_expiryClock");
    await waitFor(() => expect(box(container, "nod_toRuntime")).toBeTruthy());
    fireEvent.keyDown(box(container, "nod_toRuntime"), { key: "Enter" });
    await waitFor(() => expect(editorStore.getState().canvasId).toBe("cnv_runtime"));
    await waitFor(() => expect(mark(container, "nod_toClock")).toBeTruthy());
    fireEvent.click(mark(container, "nod_toClock"));
    await waitFor(() => expect(editorStore.getState().canvasId).toBe("cnv_expiryClock"));
    expect(editorStore.getState().view.selections.cnv_runtime).toEqual(["nod_toClock"]);
  });

  it("lights what it leads to once its level is shown, for two seconds", async () => {
    const { container } = await show("cnv_expiryClock");
    await waitFor(() => expect(box(container, "nod_toHold")).toBeTruthy());
    fireEvent.doubleClick(box(container, "nod_toHold"));
    await waitFor(() => expect(box(container, "nod_complianceHold")?.classList.contains("sw-beacon")).toBe(true));
    expect(box(container, "nod_complianceHold").querySelector(".sw-beacon-ring")).toBeTruthy();
    await waitFor(() => expect(box(container, "nod_complianceHold").classList.contains("sw-beacon")).toBe(false), {
      timeout: 3000
    });
  });

  it("lights an arrow the same way", async () => {
    const { container } = await show("cnv_lifecycle");
    await waitFor(() =>
      expect(container.querySelector('.react-flow__edge[data-id="edg_complianceStart"]')).toBeTruthy()
    );
    act(() => beacon("cnv_lifecycle", ["edg_complianceStart"]));
    await waitFor(() =>
      expect(container.querySelector('.react-flow__edge[data-id="edg_complianceStart"]').classList).toContain(
        "sw-beacon"
      )
    );
  });
});
