// @vitest-environment jsdom
// What the Editor's host does beyond the contract suite: the run is the simulation panel's, the person's work is kept,
// the stage opens, and projects are those of this browser.
import "../dom.js";
import "../i18n.js";

import { act } from "@testing-library/react";
import { sign, stringify } from "statewright";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createEditorHost } from "@/agent/host";
import { noticeStore } from "@/agent/notice";
import { memoryRepository } from "@/persistence/repository";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { exampleText, readExample } from "../fixtures.js";

const AT = "2026-01-05T09:00:00Z";
let host;
let call;

beforeEach(() => {
  act(() => editorStore.getState().open(readExample("payments")));
  host = createEditorHost({ fonts: [] });
  call = (name, args) => act(() => host.call(name, args));
});
afterEach(() =>
  act(() => {
    simulationStore.getState().close();
    editorStore.getState().close();
    noticeStore.setState({ marked: null });
    useToastStore.setState({ items: [] });
    document.body.replaceChildren();
  })
);

describe("the Editor's host: runs and scenarios (AI interface spec §4.2)", () => {
  it("runs in the simulation panel, which opens", async () => {
    await call("run.start", { canvas: "cnv_lifecycle", at: AT });
    expect(simulationStore.getState()).toMatchObject({ mode: "run", canvas: "cnv_lifecycle" });
    await call("run.step", { do: { event: "evt_verifyStarted" } });
    expect(simulationStore.getState().points).toHaveLength(2);
  });

  it("keeps the person's steps no scenario holds: another start waits until they are saved or let go", async () => {
    act(() => {
      simulationStore.getState().open("cnv_lifecycle");
      simulationStore.getState().begin({ at: AT });
      simulationStore.getState().take({ event: "evt_verifyStarted" });
    });
    expect(await call("run.start", { canvas: "cnv_lifecycle", at: AT })).toMatchObject({
      ok: false,
      error: { code: "NOT_ALLOWED", details: { unsaved: 1 } }
    });
    expect(simulationStore.getState().points).toHaveLength(2);
  });

  it("starts and presents no run while the person is typing in a field", async () => {
    const field = document.createElement("input");
    document.body.append(field);
    field.focus();
    expect(await call("run.start", { canvas: "cnv_lifecycle", at: AT })).toMatchObject({
      ok: false,
      error: { code: "BUSY" }
    });
    expect(simulationStore.getState().mode).toBe(null);
    expect(document.activeElement).toBe(field);
  });

  it("saves the run as the agent's change", async () => {
    host.hello("claude-in-chrome");
    await call("run.start", { canvas: "cnv_lifecycle", at: AT });
    await call("run.step", { do: { event: "evt_verifyStarted" } });
    expect((await call("scenario.save", { name: "Verification starts" })).result).toEqual({
      id: "scn_verificationStarts"
    });
    expect(editorStore.getState().history.past.at(-1)).toMatchObject({
      label: 'Save scenario "Verification starts"',
      origin: "ai",
      agent: "claude-in-chrome"
    });
    expect(useToastStore.getState().items[0]).toMatchObject({ tone: "ai" });
  });

  it("presents a scenario on the stage, at a step; not while a dialog of the person's is open", async () => {
    expect(await call("scenario.present", { id: "scn_verificationPausesTheClock", step: 2 })).toEqual({
      ok: true,
      result: { step: 2 }
    });
    expect(simulationStore.getState()).toMatchObject({ stage: true, shown: 2 });
    act(() => simulationStore.getState().close());
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    document.body.append(dialog);
    expect(await call("scenario.present", { id: "scn_verificationPausesTheClock" })).toMatchObject({
      ok: false,
      error: { code: "BUSY" }
    });
    expect(await call("scenario.present", { id: "scn_nope" })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" }
    });
  });
});

describe("the Editor's host: projects of this browser (AI interface spec §4.2)", () => {
  /** A host on an in-memory repository whose pages open as the Editor's do: the document lands in the store. */
  async function withProjects(...names) {
    const repository = memoryRepository();
    for (const name of names) await repository.save(readExample(name));
    const visited = [];
    const navigate = path => {
      visited.push(path);
      repository.load(path.split("/")[2]).then(doc => act(() => editorStore.getState().open(doc)));
    };
    const projects = createEditorHost({ repository: async () => repository, navigate, fonts: [] });
    return { repository, visited, call: (name, args) => act(() => projects.call(name, args)) };
  }

  it("lists the projects and opens one by its ID, even from the Projects screen", async () => {
    const { call: inBrowser, visited } = await withProjects("payments", "get-paid-as-built");
    act(() => editorStore.getState().close());
    const { projects } = (await inBrowser("projects.list")).result;
    expect(projects.map(project => project.id).sort()).toEqual(["prj_getPaid", "prj_payments"]);
    expect(Object.keys(projects[0]).sort()).toEqual(["id", "name", "stage", "updatedAt"]);
    expect(await inBrowser("projects.open", { id: "prj_payments" })).toEqual({
      ok: true,
      result: { project: { id: "prj_payments", name: "Payments" } }
    });
    expect(visited).toEqual(["/p/prj_payments"]);
    expect(await inBrowser("projects.open", { id: "prj_nope" })).toMatchObject({ error: { code: "NOT_FOUND" } });
    expect(await inBrowser("projects.open", { path: "a.json" })).toMatchObject({ error: { code: "FILE" } });
  });

  it("leaves the project open neither under a dialog of the person's nor with their unsaved steps", async () => {
    const { call: inBrowser, repository, visited } = await withProjects("payments", "get-paid-as-built");
    const payments = await repository.load("prj_payments");
    act(() => editorStore.getState().open(payments));
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    document.body.append(dialog);
    expect(await inBrowser("projects.open", { id: "prj_getPaid" })).toMatchObject({
      ok: false,
      error: { code: "BUSY" }
    });
    expect(await inBrowser("projects.create", { name: "Refund", kind: "machine" })).toMatchObject({
      ok: false,
      error: { code: "BUSY" }
    });
    expect(await repository.has("prj_refund")).toBe(false);
    dialog.remove();
    act(() => {
      simulationStore.getState().open("cnv_lifecycle");
      simulationStore.getState().begin({ at: AT });
      simulationStore.getState().take({ event: "evt_verifyStarted" });
    });
    expect(await inBrowser("projects.open", { id: "prj_getPaid" })).toMatchObject({
      ok: false,
      error: { code: "NOT_ALLOWED", details: { unsaved: 1 } }
    });
    expect(await inBrowser("projects.import", { text: exampleText("get-paid-as-built") })).toMatchObject({
      ok: false,
      error: { code: "NOT_ALLOWED", details: { unsaved: 1 } }
    });
    expect(visited).toEqual([]);
    expect(simulationStore.getState().points).toHaveLength(2);
    expect(await inBrowser("projects.open", { id: "prj_payments" })).toMatchObject({ ok: true });
  });

  it("creates a project of a kind, with the Editor's first elements, and opens it", async () => {
    const { call: inBrowser, repository } = await withProjects();
    expect((await inBrowser("projects.create", { name: "Refund", kind: "machine" })).result).toEqual({
      project: { id: "prj_refund", name: "Refund" }
    });
    const doc = await repository.load("prj_refund");
    expect(doc.canvases.cnv_refund.nodes).toEqual({
      nod_initial: { kind: "initial" },
      nod_firstState: { kind: "state", name: "First state" }
    });
    expect(editorStore.getState().doc.project.id).toBe("prj_refund");
  });

  it("imports a document's text; a changed one is the person's to review, an invalid one says why", async () => {
    const { call: inBrowser } = await withProjects();
    expect((await inBrowser("projects.import", { text: exampleText("payments") })).result).toEqual({
      project: { id: "prj_payments", name: "Payments" }
    });
    const changed = JSON.parse(exampleText("get-paid-as-built"));
    changed.project.name = "Get paid, by hand";
    expect(await inBrowser("projects.import", { text: JSON.stringify(changed) })).toMatchObject({
      ok: false,
      error: { code: "FILE", details: { review: true } }
    });
    expect(await inBrowser("projects.import", { text: "{}" })).toMatchObject({ ok: false, error: { code: "SCHEMA" } });
    const signed = stringify(await sign(changed, { channel: "cli" }));
    expect((await inBrowser("projects.import", { text: signed })).ok).toBe(true);
  });
});
