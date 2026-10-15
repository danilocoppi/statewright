// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act } from "@testing-library/react";
import { OPERATIONS } from "statewright/agent";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { noticeStore } from "@/agent/notice";
import { createEditorHost } from "@/agent/host";
import { statewrightOf } from "@/agent/install";
import { openFor, simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { readExample } from "../fixtures.js";

const LATE = {
  label: "A state for late payers",
  commands: [{ type: "node.add", args: { canvas: "cnv_expiryClock", node: { kind: "state", name: "late" } } }]
};

let statewright;
beforeEach(() => {
  statewright = statewrightOf(createEditorHost());
  act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_expiryClock" }));
});
afterEach(() =>
  act(() => {
    simulationStore.getState().close();
    editorStore.getState().close();
    noticeStore.setState({ marked: null });
    useToastStore.setState({ items: [] });
  })
);

describe("window.statewright (AI interface spec §7.1)", () => {
  it("is in every tab of the Editor: the catalogue, a method per operation, and call", async () => {
    await import("@/agent/install");
    expect(globalThis.statewright.operations).toHaveLength(OPERATIONS.length);
    expect(globalThis.statewright.operations[0]).toMatchObject({
      name: "document.summary",
      summary: expect.any(String),
      errors: [],
      input: { type: "object" }
    });
    expect(statewright.operations.find(operation => operation.name === "view.open")).toMatchObject({ needs: "editor" });
    expect(typeof statewright.batch.apply).toBe("function");
    expect((await statewright.document.summary()).result.project.id).toBe("prj_payments");
    expect(await statewright.call("level.get", { canvas: "cnv_expiryClock" })).toMatchObject({
      ok: true,
      result: { name: "Expiry clock" }
    });
  });

  it("applies an agent's batch as its own change, named after the agent", async () => {
    expect(statewright.hello({ agent: "claude-in-chrome" })).toEqual({ agent: "claude-in-chrome", operations: 39 });
    const applied = await statewright.batch.apply(LATE);
    expect(applied).toEqual({
      ok: true,
      result: { created: ["nod_late"], problems: { added: expect.any(Array), removed: [] } }
    });
    expect(applied.result.problems.added.map(problem => problem.code).sort()).toEqual([
      "machine.stuck",
      "machine.unreachable"
    ]);
    expect(editorStore.getState().history.past.at(-1)).toMatchObject({
      label: "A state for late payers",
      origin: "ai",
      agent: "claude-in-chrome"
    });
    expect(noticeStore.getState().marked.canvases.cnv_expiryClock).toEqual(["nod_late"]);
    expect(useToastStore.getState().items[0]).toMatchObject({ tone: "ai", lead: "AI · claude-in-chrome" });
  });

  it("refuses a batch that fails, changing and announcing nothing", async () => {
    const result = await statewright.batch.apply({
      label: "Two changes",
      commands: [
        { type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } },
        { type: "node.remove", args: { id: "nod_nope" } }
      ]
    });
    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND", details: { index: 1 } } });
    expect(editorStore.getState().history.past).toEqual([]);
    expect(useToastStore.getState().items).toEqual([]);
  });

  it("undoes and redoes the agent's own changes only", async () => {
    statewright.hello({ agent: "claude-in-chrome" });
    await statewright.batch.apply(LATE);
    expect(await statewright.history.undo()).toEqual({ ok: true, result: { label: "A state for late payers" } });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_late).toBeUndefined();
    expect(await statewright.history.redo()).toEqual({ ok: true, result: { label: "A state for late payers" } });
    act(() => {
      editorStore.getState().dispatch([{ type: "node.update", args: { id: "nod_paused", set: { name: "held" } } }], {
        label: "Rename"
      });
    });
    expect(await statewright.history.undo()).toMatchObject({ ok: false, error: { code: "NOT_AI_CHANGE" } });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_paused.name).toBe("held");
    const other = statewrightOf(createEditorHost());
    other.hello({ agent: "another-agent" });
    act(() => editorStore.getState().undo());
    expect(await other.history.undo()).toMatchObject({ ok: false, error: { code: "NOT_AI_CHANGE" } });
  });

  it("answers READ_ONLY in a read-only tab, and SIMULATING while simulating", async () => {
    act(() => editorStore.getState().setReadOnly(true));
    expect(await statewright.batch.apply(LATE)).toMatchObject({ ok: false, error: { code: "READ_ONLY" } });
    act(() => editorStore.getState().setReadOnly(false));
    act(() => openFor("cnv_lifecycle"));
    expect(await statewright.batch.apply(LATE)).toMatchObject({ ok: false, error: { code: "SIMULATING" } });
    expect(await statewright.layout.arrange({ canvas: "cnv_runtime" })).toMatchObject({
      ok: false,
      error: { code: "SIMULATING" }
    });
  });

  it("arranges a level's boxes as the agent's change", async () => {
    const { result } = await statewright.layout.arrange({ canvas: "cnv_runtime" });
    expect(result.placed).toHaveLength(8);
    expect(editorStore.getState().history.past.at(-1)).toMatchObject({ label: "Arrange Runtime", origin: "ai" });
  });

  it("answers NOT_ALLOWED with no project open, and checks the arguments first", async () => {
    expect(await statewright.batch.apply({ commands: [] })).toMatchObject({
      ok: false,
      error: { code: "BAD_ARGUMENTS" }
    });
    act(() => editorStore.getState().close());
    expect(await statewright.document.summary()).toMatchObject({
      ok: false,
      error: { code: "NOT_ALLOWED", message: expect.stringContaining("projects.open") }
    });
  });
});
