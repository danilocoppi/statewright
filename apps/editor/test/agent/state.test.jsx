// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act } from "@testing-library/react";
import { checkResult } from "statewright/agent";
import { afterEach, describe, expect, it } from "vitest";

import { createEditorHost } from "@/agent/host";
import { statewrightOf } from "@/agent/install";
import { editorStateOf } from "@/agent/state";
import { catalogStore } from "@/catalog/state";
import { inspectorStore } from "@/inspector/state";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

afterEach(() =>
  act(() => {
    simulationStore.getState().close();
    editorStore.getState().close();
    catalogStore.getState().close();
    inspectorStore.getState().reset();
    document.body.replaceChildren();
    document.documentElement.classList.remove("dark");
  })
);

/** Something open in the page, with its hook. */
function shown(tag, testId, attributes = {}) {
  const element = document.createElement(tag);
  element.dataset.testid = testId;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  return element;
}

describe("what the Editor shows, as an agent reads it (AI interface spec §7.2)", () => {
  it("says there is no project on the Projects screen", () => {
    expect(editorStateOf()).toMatchObject({
      route: "/",
      project: null,
      level: null,
      trail: [],
      selection: [],
      open: { inspector: null, problems: false, catalog: false, palette: false, dialog: null, simulation: false },
      theme: "light",
      language: "en",
      run: null
    });
  });

  it("says the project, the level shown and the levels down to it, the selection and the inspector's subject", () => {
    act(() => {
      editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" });
      editorStore.getState().select(["nod_paused"]);
    });
    expect(editorStateOf()).toMatchObject({
      project: { id: "prj_payments", name: "Payments", readOnly: false },
      level: { canvas: "cnv_expiryClock", name: "Expiry clock", kind: "machine" },
      trail: [
        { canvas: "cnv_runtime", name: "Runtime" },
        { canvas: "cnv_lifecycle", name: "Lifecycle engine" },
        { canvas: "cnv_expiryClock", name: "Expiry clock" }
      ],
      selection: ["nod_paused"],
      open: { inspector: { id: "nod_paused" } }
    });
  });

  it("says what is open: Problems, the catalog, the command palette, a dialog and its name", () => {
    act(() => editorStore.getState().open(readExample("payments")));
    shown("aside", "problems-panel");
    shown("dialog", "palette", { open: "" });
    act(() => catalogStore.getState().show());
    const title = document.createElement("h2");
    title.id = "levels-title";
    title.textContent = "Levels";
    shown("dialog", "levels-dialog", { open: "", "aria-labelledby": "levels-title" }).append(title);
    expect(editorStateOf().open).toMatchObject({
      problems: true,
      catalog: true,
      palette: true,
      dialog: { id: "levels-dialog", name: "Levels" }
    });
  });

  it("says the run: its level, the point shown, a question pending", async () => {
    act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_lifecycle" }));
    const host = createEditorHost();
    await act(() => host.call("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" }));
    for (const event of ["evt_payinDetected", "evt_payinConfirmed", "evt_legCompleted"]) {
      await act(() => host.call("run.step", { do: { event } }));
    }
    expect(editorStateOf()).toMatchObject({
      open: { simulation: true, stage: false, inspector: null },
      run: { canvas: "cnv_lifecycle", shown: 2, steps: 2, question: { kind: "transition" }, failure: null }
    });
  });

  it("is the answer of editor.state and of statewright.state(), in the contract's shape", async () => {
    act(() => editorStore.getState().open(readExample("payments")));
    document.documentElement.classList.add("dark");
    const host = createEditorHost();
    const answer = await host.call("editor.state");
    expect(answer.ok).toBe(true);
    expect(checkResult("editor.state", answer.result)).toEqual({ ok: true });
    expect(answer.result.theme).toBe("dark");
    expect(statewrightOf(host).state()).toEqual(answer.result);
  });
});
