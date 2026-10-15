// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connection } from "@/agent/connection";
import { ConversationBar } from "@/conversation/ConversationBar";
import { conversationStore } from "@/conversation/store";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

let sent;
let onNavigate;

beforeEach(() => {
  sent = [];
  vi.spyOn(connection, "send").mockImplementation(async body => {
    sent.push(body);
    return { id: `msg_${sent.length}` };
  });
  act(() => {
    editorStore.getState().open(readExample("payments"), { canvasId: "cnv_lifecycle" });
    connection.store.setState({ status: "connected", agent: "claude-code" });
  });
  onNavigate = vi.fn();
  render(<ConversationBar onNavigate={onNavigate} />);
});

afterEach(() => {
  vi.restoreAllMocks();
  act(() => {
    connection.store.setState({ status: "off", agent: null });
    conversationStore.getState().clear();
    editorStore.getState().close();
  });
});

const bar = () => screen.getByRole("region", { name: "Conversation with claude-code" });
const field = () => within(bar()).getByRole("textbox", { name: "Write to claude-code" });

describe("the conversation bar (collaboration spec §4)", () => {
  it("sends what is written with Enter, with the level, and shows it sent", async () => {
    const user = userEvent.setup();
    await user.type(field(), "these need a timeout{Enter}");
    expect(sent).toEqual([
      {
        text: "these need a timeout",
        context: {
          project: { id: "prj_payments", name: "Payments" },
          level: { id: "cnv_lifecycle", name: "Lifecycle engine" }
        }
      }
    ]);
    expect(field().value).toBe("");
    await vi.waitFor(() =>
      expect(conversationStore.getState().lines).toMatchObject([
        { kind: "person", text: "these need a timeout", id: "msg_1", state: "sent" }
      ])
    );
  });

  it("breaks the line with Shift+Enter, and sends nothing while an input method composes", async () => {
    const user = userEvent.setup();
    await user.type(field(), "one{Shift>}{Enter}{/Shift}two");
    expect(field().value).toBe("one\ntwo");
    fireEvent.keyDown(field(), { key: "Enter", isComposing: true });
    expect(sent).toEqual([]);
  });

  it("sends the selection with it unless the person takes it off", async () => {
    const user = userEvent.setup();
    act(() => editorStore.getState().select(["nod_expiryClock"], "cnv_lifecycle"));
    expect(within(bar()).getByText("1 selected")).toBeTruthy();
    await user.type(field(), "this{Enter}");
    expect(sent[0].context.selection).toEqual([
      { id: "nod_expiryClock", name: "expiry_clock", kind: "state", level: "cnv_lifecycle" }
    ]);
    await user.click(within(bar()).getByRole("button", { name: "Leave out 1 selected" }));
    await user.type(field(), "not this{Enter}");
    expect(sent[1].context).not.toHaveProperty("selection");
  });

  it("shows the agent's answer, whose elements lead to them", async () => {
    const user = userEvent.setup();
    act(() => {
      conversationStore.getState().add({
        kind: "agent",
        id: "rpl_1",
        text: "Look here",
        point: ["nod_expiryClock", "nod_paused"]
      });
    });
    expect(within(bar()).getByText("Look here")).toBeTruthy();
    await user.click(within(bar()).getByRole("button", { name: "expiry_clock" }));
    expect(editorStore.getState().view.selections.cnv_lifecycle).toEqual(["nod_expiryClock"]);
    expect(onNavigate).not.toHaveBeenCalled();
    await user.click(within(bar()).getByRole("button", { name: "paused" }));
    expect(onNavigate).toHaveBeenCalledWith("cnv_expiryClock");
    expect(editorStore.getState().view.selections.cnv_expiryClock).toEqual(["nod_paused"]);
  });

  it("offers Stop while the agent works, and opens the history", async () => {
    const user = userEvent.setup();
    act(() => conversationStore.getState().called(Date.now()));
    await user.click(within(bar()).getByRole("button", { name: "Stop" }));
    expect(sent).toEqual([{ stop: true }]);
    const history = within(bar()).getByRole("button", { name: "Conversation history" });
    expect(history.getAttribute("aria-expanded")).toBe("false");
    await user.click(history);
    expect(history.getAttribute("aria-expanded")).toBe("true");
    expect(within(bar()).getByText("You asked claude-code to stop")).toBeTruthy();
  });
});
