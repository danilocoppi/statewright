import { check } from "statewright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createProblemsStore } from "@/problems/store";
import { CHECK_DELAY_MS, watchProblems } from "@/problems/watch";
import { createEditorStore } from "@/store/editor";

import { demoDoc, readExample } from "../fixtures.js";

const rename = name => [{ type: "project.update", args: { set: { name } } }];

function setup(request = vi.fn(async (_type, { doc }) => check(doc))) {
  const editor = createEditorStore();
  const problems = createProblemsStore();
  const stop = watchProblems({ editor, problems, client: { request } });
  return { editor, problems, request, stop };
}

describe("live Problems", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts from no Problems, and checks a project when it opens and 150 ms after the last of several quick changes", async () => {
    const editor = createEditorStore();
    const problems = createProblemsStore();
    problems.getState().set(7, [{ code: "old", severity: "error", target: "x", message: "m" }]);
    const request = vi.fn(async (_type, { doc }) => check(doc));
    watchProblems({ editor, problems, client: { request } });
    expect(problems.getState()).toMatchObject({ version: null, list: [] });
    editor.getState().open(readExample("get-paid-as-built"));
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    expect(request).toHaveBeenCalledTimes(1);
    expect(problems.getState()).toMatchObject({ version: 0, list: check(editor.getState().doc) });

    editor.getState().dispatch(rename("A"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS / 2);
    editor.getState().dispatch(rename("B"), { label: "Rename" });
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS - 1);
    expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(problems.getState().version).toBe(2);
  });

  it("drops a result computed on a document that has changed since", async () => {
    let answer;
    const request = vi.fn(
      (_type, { doc }) =>
        new Promise(resolve => {
          answer = () => resolve(doc.project.name === "Late" ? [] : [{ code: "old", severity: "error", target: "x" }]);
        })
    );
    const { editor, problems } = setup(request);
    editor.getState().open(demoDoc());
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    editor.getState().dispatch(rename("Late"), { label: "Rename" });
    answer();
    await vi.advanceTimersByTimeAsync(0);
    expect(problems.getState().list).toEqual([]);
    expect(problems.getState().version).toBeNull();
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    answer();
    await vi.advanceTimersByTimeAsync(0);
    expect(problems.getState()).toMatchObject({ version: 1, list: [] });
  });

  it("forgets a project's Problems when another project opens or the editor closes", async () => {
    const { editor, problems } = setup();
    editor.getState().open(readExample("payments"));
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    expect(problems.getState().list.length).toBeGreaterThan(0);
    editor.getState().open(demoDoc());
    expect(problems.getState().list).toEqual([]);
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    editor.getState().close();
    expect(problems.getState().version).toBeNull();
  });

  it("runs one check at a time, then the latest document's (performance spec §3 P3)", async () => {
    const waiting = [];
    const request = vi.fn((_type, { doc }) => new Promise(resolve => waiting.push(() => resolve(check(doc)))));
    const { editor, problems } = setup(request);
    editor.getState().open(demoDoc());
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    expect(request).toHaveBeenCalledTimes(1);
    // Five changes while the first check runs: none is sent yet.
    for (const name of ["A", "B", "C", "D", "E"]) {
      editor.getState().dispatch(rename(name), { label: "Rename" });
      await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    }
    expect(request).toHaveBeenCalledTimes(1);
    // The first answers: the latest document is checked next, once.
    waiting.shift()();
    await vi.advanceTimersByTimeAsync(0);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][1].doc.project.name).toBe("E");
    waiting.shift()();
    await vi.advanceTimersByTimeAsync(CHECK_DELAY_MS);
    expect(request).toHaveBeenCalledTimes(2);
    expect(problems.getState().version).toBe(editor.getState().version);
  });
});
