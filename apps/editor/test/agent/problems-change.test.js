// @vitest-environment jsdom
import "../dom.js";

import { check } from "statewright";
import { problemsChange } from "statewright/agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { editOperations } from "@/agent/edit";
import { problemsStore } from "@/problems/store";
import { editorStore } from "@/store/editor";
import { problemsClient } from "@/workers";

import { readExample } from "../fixtures.js";

const LATE = [
  { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } }
];

beforeEach(() =>
  editorStore.getState().open(structuredClone(readExample("payments")), { canvasId: "cnv_expiryClock" })
);
afterEach(() => {
  vi.restoreAllMocks();
  problemsStore.getState().clear();
  editorStore.getState().close();
});

describe("an agent's change and its Problems (performance spec §3 P3)", () => {
  it("answers what it added and removed, checked in the Problems worker, not on the page", async () => {
    const before = editorStore.getState().doc;
    problemsStore.getState().set(editorStore.getState().version, check(before), before);
    const request = vi.spyOn(problemsClient(), "request");
    const answer = await editOperations["batch.apply"]({ agent: "claude-code" }, { label: "Late", commands: LATE });
    expect(answer.problems).toEqual(problemsChange(check(before), check(editorStore.getState().doc)));
    // The Problems before were known: only the document after is checked, in the worker.
    expect(request.mock.calls.filter(([type]) => type === "check")).toHaveLength(1);
  });

  it("checks the document before too when its Problems are not known yet", async () => {
    const before = editorStore.getState().doc;
    const request = vi.spyOn(problemsClient(), "request");
    const answer = await editOperations["batch.apply"]({ agent: "claude-code" }, { label: "Late", commands: LATE });
    expect(answer.problems).toEqual(problemsChange(check(before), check(editorStore.getState().doc)));
    expect(request.mock.calls.filter(([type]) => type === "check")).toHaveLength(2);
  });

  it("does not take the Problems of another document of the same version as those before", async () => {
    const other = editorStore.getState().doc;
    problemsStore.getState().set(editorStore.getState().version, check(other), other);
    // The same project reopened from what another tab stored: a new document, at version 0 again.
    const stored = structuredClone(readExample("payments"));
    stored.canvases.cnv_expiryClock.nodes.nod_extra = { kind: "state", name: "extra" };
    editorStore.getState().open(stored, { canvasId: "cnv_expiryClock" });
    const before = editorStore.getState().doc;
    const request = vi.spyOn(problemsClient(), "request");
    const answer = await editOperations["batch.apply"]({ agent: "claude-code" }, { label: "Late", commands: LATE });
    expect(answer.problems).toEqual(problemsChange(check(before), check(editorStore.getState().doc)));
    expect(request.mock.calls.filter(([type]) => type === "check")).toHaveLength(2);
  });
});
