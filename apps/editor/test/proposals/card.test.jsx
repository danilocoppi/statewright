// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connection } from "@/agent/connection";
import { editOperations } from "@/agent/edit";
import { ConversationBar } from "@/conversation/ConversationBar";
import { conversationStore } from "@/conversation/store";
import { proposalsStore } from "@/proposals/store";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

let onNavigate;

beforeEach(() => {
  act(() => {
    editorStore.getState().open(structuredClone(readExample("payments")), { canvasId: "cnv_lifecycle" });
    connection.store.setState({ status: "connected", agent: "claude-code" });
    proposalsStore.setState({ send: async () => ({ id: "msg_1" }) });
  });
  onNavigate = vi.fn();
  render(<ConversationBar onNavigate={onNavigate} />);
});

afterEach(() => {
  vi.restoreAllMocks();
  act(() => {
    proposalsStore.getState().clear();
    conversationStore.getState().clear();
    connection.store.setState({ status: "off", agent: null });
    editorStore.getState().close();
  });
});

const propose = args =>
  act(() => {
    editOperations["batch.apply"]({ agent: "claude-code" }, { label: "x", ...args });
  });
const card = () => within(document.querySelector('[data-testid="conversation-proposal"]'));

describe("a proposal in the conversation (collaboration spec §7)", () => {
  it("says what it would do, change by change, and goes to each", async () => {
    const user = userEvent.setup();
    propose({
      propose: true,
      title: "A state for late payers",
      why: "they wait too long",
      commands: [
        {
          type: "node.add",
          args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } }
        },
        { type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }
      ]
    });
    expect(card().getByText("A state for late payers")).toBeTruthy();
    expect(card().getByText("they wait too long")).toBeTruthy();
    expect(card().getByText("1 new, 1 changed, on 1 level")).toBeTruthy();
    expect(card().getByText("on hold: name paused → on hold")).toBeTruthy();
    await user.click(card().getByRole("button", { name: "Show" }));
    expect(proposalsStore.getState().shown).toBe("prp_1");
    await user.click(card().getByRole("button", { name: "Next change" }));
    expect(onNavigate).toHaveBeenCalledWith("cnv_expiryClock");
    expect(card().getByText("1 of 2")).toBeTruthy();
  });

  it("accepts, or rejects with a reason", async () => {
    const user = userEvent.setup();
    const accept = vi.spyOn(proposalsStore.getState(), "accept");
    propose({
      propose: true,
      title: "First",
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "a" } } }]
    });
    await user.click(card().getByRole("button", { name: "Accept" }));
    expect(accept).toHaveBeenCalledWith("prp_1");
    const reject = vi.spyOn(proposalsStore.getState(), "reject");
    propose({ title: "Remove elapsed", commands: [{ type: "node.remove", args: { id: "nod_elapsed" } }] });
    await user.click(card().getByRole("button", { name: "Reject" }));
    await user.type(card().getByRole("textbox", { name: "Why not? (optional)" }), "keep it");
    await user.click(card().getByRole("button", { name: "Reject it" }));
    expect(reject).toHaveBeenCalledWith("prp_2", "keep it");
  });

  it("says why a removal was proposed, and lets the person allow deletions for the session", async () => {
    const user = userEvent.setup();
    propose({ title: "Remove elapsed", commands: [{ type: "node.remove", args: { id: "nod_elapsed" } }] });
    expect(card().getByText(/Proposed because it removes elapsed/)).toBeTruthy();
    await user.click(card().getByRole("checkbox", { name: "Let claude-code delete without asking" }));
    expect(proposalsStore.getState().allowDeletes).toBe(true);
  });

  it("says when a proposal no longer applies, and dismisses it", async () => {
    const user = userEvent.setup();
    propose({
      propose: true,
      title: "Rename",
      commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "x" } } }]
    });
    act(() => {
      proposalsStore.setState(state => ({
        list: state.list.map(item => ({ ...item, state: "stale", stale: "nod_paused is gone" }))
      }));
    });
    expect(card().getByText("No longer applies: nod_paused is gone")).toBeTruthy();
    await user.click(card().getByRole("button", { name: "Dismiss" }));
    expect(document.querySelector('[data-testid="conversation-proposal"]')).toBeNull();
  });

  it("counts against the document as it is now, and steps into a new level from the box that holds it", async () => {
    const user = userEvent.setup();
    propose({ title: "Remove elapsed", commands: [{ type: "node.remove", args: { id: "nod_elapsed" } }] });
    const before = card().getByText(/removed/).textContent;
    act(() => {
      editorStore
        .getState()
        .dispatch(
          [{ type: "edge.add", args: { canvas: "cnv_expiryClock", edge: { from: "nod_paused", to: "nod_elapsed" } } }],
          { label: "One more" }
        );
    });
    expect(card().getByText(/removed/).textContent).not.toBe(before);
    act(() => proposalsStore.getState().clear());
    propose({
      propose: true,
      title: "Detail elapsed",
      commands: [
        {
          type: "canvas.create",
          args: { id: "cnv_elapsedDetail", kind: "machine", name: "Elapsed in detail", owner: "nod_elapsed" }
        },
        {
          type: "node.add",
          args: { canvas: "cnv_elapsedDetail", id: "nod_notify", node: { kind: "state", name: "notify" } }
        }
      ]
    });
    await user.click(card().getByRole("button", { name: "Next change" }));
    expect(onNavigate).toHaveBeenLastCalledWith("cnv_expiryClock");
    expect(card().getByText(/on a new level/)).toBeTruthy();
  });

  it("lets the person take back the leave to delete without asking, in the bar", async () => {
    const user = userEvent.setup();
    act(() => proposalsStore.getState().setAllowDeletes(true));
    await user.click(document.querySelector('[data-testid="conversation-deletes"]'));
    expect(proposalsStore.getState().allowDeletes).toBe(false);
  });
});
