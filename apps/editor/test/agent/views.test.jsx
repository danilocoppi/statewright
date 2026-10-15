// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createEditorHost } from "@/agent/host";
import { noticeStore } from "@/agent/notice";
import { Canvas } from "@/canvas/Canvas";
import { editingStore } from "@/editing/state";
import { Card } from "@/simulate/parts";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

let call;
beforeEach(async () => {
  const doc = await placedExample("payments");
  act(() => editorStore.getState().open(doc, { canvasId: "cnv_lifecycle" }));
  const host = createEditorHost();
  call = (name, args) => act(() => host.call(name, args));
});
afterEach(() =>
  act(() => {
    editorStore.getState().close();
    noticeStore.setState({ marked: null, pointed: null });
    document.body.replaceChildren();
  })
);

/** A dialog of the person's, open. */
function openDialog() {
  const dialog = document.createElement("dialog");
  dialog.setAttribute("open", "");
  document.body.append(dialog);
}

describe("navigating and showing (AI interface spec §4.2)", () => {
  it("opens a level, selects elements on theirs, brings one into view and frames the level", async () => {
    expect(await call("view.open", { canvas: "cnv_expiryClock" })).toEqual({
      ok: true,
      result: { canvas: "cnv_expiryClock" }
    });
    expect(editorStore.getState().canvasId).toBe("cnv_expiryClock");
    expect((await call("view.select", { ids: ["nod_running", "nod_paused"] })).result).toEqual({
      canvas: "cnv_expiryClock"
    });
    expect(editorStore.getState().view.selections.cnv_expiryClock).toEqual(["nod_running", "nod_paused"]);
    expect((await call("view.reveal", { id: "nod_payingOut" })).result).toEqual({ canvas: "cnv_crossBorderSend" });
    expect(editorStore.getState().view.reveal).toEqual({ canvasId: "cnv_crossBorderSend", id: "nod_payingOut" });
    const before = editingStore.getState().view?.id ?? 0;
    expect((await call("view.fit")).result).toEqual({ canvas: "cnv_crossBorderSend" });
    expect(editingStore.getState().view).toEqual({ action: "fit", id: before + 1 });
  });

  it("says which elements it cannot find, and refuses elements of several levels at once", async () => {
    expect(await call("view.select", { ids: ["nod_nope"] })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", details: { id: "nod_nope" } }
    });
    expect(await call("view.select", { ids: ["nod_running", "nod_payingOut"] })).toMatchObject({
      ok: false,
      error: { code: "INVALID_ARGS", details: { levels: ["cnv_expiryClock", "cnv_crossBorderSend"] } }
    });
    expect(await call("view.open", { canvas: "cnv_nope" })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("waits while a dialog of the person's is open: BUSY, and the view stays", async () => {
    openDialog();
    for (const [name, args] of [
      ["view.open", { canvas: "cnv_expiryClock" }],
      ["view.select", { ids: ["nod_running"] }],
      ["view.reveal", { id: "nod_running" }],
      ["view.fit", {}],
      ["view.point", { ids: ["nod_running"], note: "Here" }]
    ]) {
      expect(await call(name, args), name).toMatchObject({ ok: false, error: { code: "BUSY" } });
    }
    expect(editorStore.getState().canvasId).toBe("cnv_lifecycle");
    expect((await call("document.summary")).ok).toBe(true);
  });

  it("never takes the focus from a field the person is typing in: BUSY, and the view stays", async () => {
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    expect(await call("view.open", { canvas: "cnv_expiryClock" })).toMatchObject({
      ok: false,
      error: { code: "BUSY" }
    });
    expect(await call("view.select", { ids: ["nod_running"] })).toMatchObject({ ok: false, error: { code: "BUSY" } });
    expect(await call("view.point", { ids: ["nod_running"], note: "Here" })).toMatchObject({
      ok: false,
      error: { code: "BUSY" }
    });
    expect(editorStore.getState().canvasId).toBe("cnv_lifecycle");
    expect(noticeStore.getState().pointed).toBe(null);
    expect(document.activeElement).toBe(field);
    expect((await call("document.summary")).ok).toBe(true);
    field.blur();
    expect((await call("view.open", { canvas: "cnv_expiryClock" })).ok).toBe(true);
  });

  it("asks a run's question without taking the focus from a field the person is typing in", () => {
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    render(
      <Card label="A question" heading="Which one?">
        <button type="button">Go on</button>
      </Card>
    );
    expect(document.activeElement).toBe(field);
  });
});

describe("pointing elements out (AI interface spec §4.2: view.point)", () => {
  it("makes them glow with the agent's note above, until the person clicks elsewhere", async () => {
    const { container } = render(<Canvas />);
    await call("view.point", { ids: ["nod_running", "edg_runningPaused"], note: "The clock runs here" });
    expect(editorStore.getState().canvasId).toBe("cnv_expiryClock");
    expect(container.querySelector('.react-flow__node.sw-pointed[data-id="nod_running"]')).toBeTruthy();
    expect(container.querySelector('.react-flow__edge.sw-pointed[data-id="edg_runningPaused"]')).toBeTruthy();
    expect(screen.getByRole("note").textContent).toBe("AIThe clock runs here");
    fireEvent.pointerDown(container.querySelector('.react-flow__node[data-id="nod_running"]'));
    expect(screen.queryByRole("note")).toBeTruthy();
    fireEvent.pointerDown(container.querySelector(".react-flow__pane"));
    expect(screen.queryByRole("note")).toBeNull();
    expect(container.querySelectorAll(".sw-pointed")).toHaveLength(0);
  });

  it("replaces one point by the next, and points without a note", async () => {
    const { container } = render(<Canvas />);
    await call("view.point", { ids: ["nod_running"], note: "First" });
    await call("view.point", { ids: ["nod_paused"] });
    expect([...container.querySelectorAll(".sw-pointed")].map(element => element.dataset.id)).toEqual(["nod_paused"]);
    expect(screen.queryByRole("note")).toBeNull();
  });
});
