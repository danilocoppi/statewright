// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { connection } from "@/agent/connection";
import { editOperations } from "@/agent/edit";
import { proposalsStore } from "@/proposals/store";
import { simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

const LATE = [
  { type: "node.add", args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } } }
];
const REMOVE = [{ type: "node.remove", args: { id: "nod_elapsed" } }];
const apply = args => editOperations["batch.apply"]({ agent: "claude-code" }, { label: "x", ...args });

let sent;

beforeEach(() => {
  sent = [];
  act(() => {
    editorStore.getState().open(structuredClone(readExample("payments")), { canvasId: "cnv_expiryClock" });
    connection.store.setState({ status: "connected", agent: "claude-code" });
    proposalsStore.setState({ send: async body => (sent.push(body), { id: "msg_1" }) });
  });
});

afterEach(() =>
  act(() => {
    proposalsStore.getState().clear();
    connection.store.setState({ status: "off", agent: null });
    simulationStore.getState().close();
    editorStore.getState().close();
  })
);

describe("proposals (collaboration spec §7)", () => {
  it("keeps a proposed batch apart, changing nothing", () => {
    const before = editorStore.getState().doc;
    expect(apply({ commands: LATE, propose: true, title: "A state for late payers", why: "they wait" })).toEqual({
      proposed: "prp_1"
    });
    expect(editorStore.getState().doc).toBe(before);
    expect(proposalsStore.getState().list).toMatchObject([
      { id: "prp_1", title: "A state for late payers", why: "they wait", state: "waiting", agent: "claude-code" }
    ]);
  });

  it("always proposes a batch that removes, unless the person lets the agent delete", () => {
    const answer = apply({ commands: REMOVE });
    expect(answer).toMatchObject({ proposed: "prp_1", forced: "deletes", reason: expect.stringMatching(/elapsed/) });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeTruthy();
    proposalsStore.getState().setAllowDeletes(true);
    expect(apply({ commands: REMOVE })).toHaveProperty("created");
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeUndefined();
  });

  it("applies an accepted proposal as one change of the agent's, and tells it", async () => {
    apply({ commands: LATE, propose: true, title: "A state for late payers" });
    expect(await proposalsStore.getState().accept("prp_1")).toEqual({ ok: true });
    const entry = editorStore.getState().history.past.at(-1);
    expect(entry).toMatchObject({ origin: "ai", agent: "claude-code", label: "A state for late payers" });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_late).toBeTruthy();
    expect(sent).toEqual([{ proposal: { id: "prp_1", title: "A state for late payers", accepted: true } }]);
    expect(proposalsStore.getState().list[0].state).toBe("accepted");
  });

  it("tells the agent why a proposal was rejected", async () => {
    apply({ commands: REMOVE, title: "Remove elapsed" });
    await proposalsStore.getState().reject("prp_1", "keep it");
    expect(sent).toEqual([{ proposal: { id: "prp_1", title: "Remove elapsed", accepted: false, reason: "keep it" } }]);
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeTruthy();
  });

  it("applies nothing when the proposal no longer applies, and says so", async () => {
    apply({
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }],
      propose: true,
      title: "Rename"
    });
    editorStore.getState().dispatch([{ type: "node.remove", args: { id: "nod_paused" } }], { label: "Remove paused" });
    const before = editorStore.getState().doc;
    expect(await proposalsStore.getState().accept("prp_1")).toMatchObject({ ok: false, stale: true });
    expect(editorStore.getState().doc).toBe(before);
    expect(proposalsStore.getState().list[0].state).toBe("stale");
    expect(sent).toMatchObject([{ proposal: { id: "prp_1", accepted: false, stale: expect.any(String) } }]);
  });

  it("waits while a simulation holds the document", async () => {
    apply({ commands: LATE, propose: true, title: "Late" });
    simulationStore.setState({ mode: "start" });
    expect(await proposalsStore.getState().accept("prp_1")).toMatchObject({ ok: false, reason: expect.any(String) });
    simulationStore.setState({ mode: null });
    expect(proposalsStore.getState().list[0].state).toBe("waiting");
  });
});
