// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { autonomyStore } from "@/agent/autonomy";
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
    autonomyStore.getState().set(false);
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

  it("always proposes a batch that removes, unless the person lets the agent delete", async () => {
    const answer = apply({ commands: REMOVE });
    expect(answer).toMatchObject({ proposed: "prp_1", forced: "deletes", reason: expect.stringMatching(/elapsed/) });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeTruthy();
    proposalsStore.getState().setAllowDeletes(true);
    expect(await apply({ commands: REMOVE })).toHaveProperty("created");
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

  it("shows the next proposal waiting once the one shown is accepted", async () => {
    apply({ commands: LATE, propose: true, title: "First" });
    apply({
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "x" } } }],
      propose: true,
      title: "Second"
    });
    proposalsStore.getState().show("prp_1");
    await proposalsStore.getState().accept("prp_1");
    expect(proposalsStore.getState().shown).toBe("prp_2");
    expect(proposalsStore.getState().list[1].state).toBe("waiting");
  });

  it("never applies a proposal to another project than its own", async () => {
    apply({ commands: LATE, propose: true, title: "For payments" });
    const other = structuredClone(readExample("payments"));
    other.project.id = "prj_other";
    act(() => editorStore.getState().open(other, { canvasId: "cnv_expiryClock" }));
    const before = editorStore.getState().doc;
    expect(await proposalsStore.getState().accept("prp_1")).toMatchObject({ ok: false, stale: true });
    expect(editorStore.getState().doc).toBe(before);
  });

  it("refuses to propose in a tab that only reads, and says why it cannot accept while simulating", async () => {
    apply({ commands: LATE, propose: true, title: "Late" });
    simulationStore.setState({ mode: "start" });
    expect((await proposalsStore.getState().accept("prp_1")).reason).toMatch(/Stop simulating to accept/);
    simulationStore.setState({ mode: null });
    act(() => editorStore.setState({ readOnly: true }));
    expect(() => apply({ commands: LATE, propose: true, title: "Again" })).toThrow(/read-only/);
  });

  it("keeps the details of a batch Core refuses", () => {
    let thrown;
    try {
      apply({ commands: [{ type: "catalog.remove", args: { id: "evt_payinDetected" } }] });
    } catch (error) {
      thrown = error;
    }
    expect(thrown?.code).toBe("IN_USE");
    expect(thrown?.details?.usages?.length).toBeGreaterThan(0);
  });

  it("refuses to let the agent redo a removal the person undid", () => {
    proposalsStore.getState().setAllowDeletes(true);
    apply({ commands: REMOVE });
    proposalsStore.getState().setAllowDeletes(false);
    editorStore.getState().undo();
    expect(() => editOperations["history.redo"]({ agent: "claude-code" }, {})).toThrow(/propose/);
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeTruthy();
  });

  it("proposes whatever touches a locked element or level, even with the leave to delete, and lets the person edit it", () => {
    editorStore.getState().dispatch([{ type: "lock.add", args: { target: "cnv_expiryClock" } }], { label: "Lock" });
    proposalsStore.getState().setAllowDeletes(true);
    expect(apply({ commands: REMOVE })).toMatchObject({
      proposed: "prp_1",
      forced: "locked",
      reason: expect.stringMatching(/locked/)
    });
    expect(apply({ commands: LATE })).toMatchObject({ proposed: "prp_2", forced: "locked" });
    expect(editorStore.getState().dispatch(LATE, { label: "Mine" }).ok).toBe(true);
  });

  it("works without asking when the person says so: what it proposes or removes is applied, and redone", async () => {
    autonomyStore.getState().set(true);
    const proposed = await apply({ commands: LATE, propose: true, title: "A state for late payers" });
    expect(proposed).toMatchObject({ created: expect.anything(), autonomous: true });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_late).toBeTruthy();
    expect(await apply({ commands: REMOVE })).toMatchObject({ autonomous: true });
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeUndefined();
    expect(proposalsStore.getState().list).toEqual([]);
    editorStore.getState().undo();
    expect(() => editOperations["history.redo"]({ agent: "claude-code" }, {})).not.toThrow();
    expect(editorStore.getState().doc.canvases.cnv_expiryClock.nodes.nod_elapsed).toBeUndefined();
  });

  it("still only proposes what touches a lock, even working without asking", () => {
    autonomyStore.getState().set(true);
    editorStore.getState().dispatch([{ type: "lock.add", args: { target: "nod_elapsed" } }], { label: "Lock" });
    expect(apply({ commands: REMOVE })).toMatchObject({ proposed: "prp_1", forced: "locked" });
  });

  it("signs the agent's comments as the agent's, whatever it says", () => {
    apply({
      commands: [
        {
          type: "comment.add",
          args: { id: "cmt_a", canvas: "cnv_expiryClock", target: "nod_paused", text: "Mine?", author: "person" }
        }
      ]
    });
    expect(editorStore.getState().doc.annotations.comments.cmt_a.thread[0]).toMatchObject({
      author: "agent",
      name: "claude-code"
    });
  });

  it("does not arrange a level the person locked", async () => {
    editorStore.getState().dispatch([{ type: "lock.add", args: { target: "cnv_expiryClock" } }], { label: "Lock" });
    await expect(
      editOperations["layout.arrange"]({ agent: "claude-code" }, { canvas: "cnv_expiryClock" })
    ).rejects.toThrow(/locked/);
  });
});
