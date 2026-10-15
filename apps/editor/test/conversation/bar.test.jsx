// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/marks/image", () => ({ imageOf: vi.fn(async () => "data:image/png;base64,AAAA") }));

import { connection } from "@/agent/connection";
import { ConversationBar } from "@/conversation/ConversationBar";
import { conversationStore } from "@/conversation/store";
import { marksStore } from "@/marks/store";
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
    marksStore.getState().clear();
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

  it("announces each new answer of the agent, the history open or not", async () => {
    const user = userEvent.setup();
    await user.click(within(bar()).getByRole("button", { name: "Conversation history" }));
    act(() => {
      conversationStore.getState().add({ kind: "agent", id: "rpl_1", text: "First answer" });
    });
    expect(within(bar()).getByRole("status").textContent).toBe("claude-code: First answer");
  });

  it("gives the text back when it could not be sent", async () => {
    const user = userEvent.setup();
    connection.send.mockImplementation(async () => ({ error: "unreachable" }));
    await user.type(field(), "lost?{Enter}");
    await vi.waitFor(() => expect(field().value).toBe("lost?"));
    expect(conversationStore.getState().lines).toMatchObject([{ kind: "person", text: "lost?", state: "failed" }]);
  });

  it("says, beside the field, why a message was not sent", async () => {
    const user = userEvent.setup();
    connection.send.mockImplementation(async () => ({ error: "unreachable" }));
    await user.type(field(), "lost?{Enter}");
    await vi.waitFor(() => expect(within(bar()).getByRole("alert").textContent).toMatch(/Not sent/));
    connection.send.mockImplementation(async () => ({ id: "msg_1" }));
    await user.type(field(), "{Enter}");
    await vi.waitFor(() => expect(within(bar()).queryByRole("alert")).toBeNull());
  });

  it("says the AI's server is too old to take messages when it does not know them", async () => {
    const user = userEvent.setup();
    connection.send.mockImplementation(async () => ({ error: "refused (404)", status: 404 }));
    await user.type(field(), "hello{Enter}");
    await vi.waitFor(() =>
      expect(within(bar()).getByRole("alert").textContent).toMatch(/older than this Editor.*statewright@latest/)
    );
  });

  it("sends a new selection even after the person left out the one before", async () => {
    const user = userEvent.setup();
    act(() => editorStore.getState().select(["nod_expiryClock"], "cnv_lifecycle"));
    await user.click(within(bar()).getByRole("button", { name: "Leave out 1 selected" }));
    act(() => editorStore.getState().select(["nod_complianceHold"], "cnv_lifecycle"));
    await user.type(field(), "this one{Enter}");
    expect(sent[0].context.selection).toMatchObject([{ id: "nod_complianceHold" }]);
  });

  it("sends the marks and their image, and clears them once the bridge took the message", async () => {
    const user = userEvent.setup();
    act(() => {
      marksStore.getState().add({ level: "cnv_lifecycle", kind: "label", colour: "amber", at: [0, 0], text: "why?" });
      marksStore.getState().toggleForAI("nod_expiryClock", "cnv_lifecycle");
    });
    expect(within(bar()).getByText("1 mark")).toBeTruthy();
    expect(within(bar()).getByText("1 marked on 1 level")).toBeTruthy();
    await user.type(field(), "look{Enter}");
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].marks).toHaveLength(2);
    expect(sent[0].image).toBe("data:image/png;base64,AAAA");
    await vi.waitFor(() => expect(marksStore.getState()).toMatchObject({ marks: [], forAI: [] }));
    await user.click(within(bar()).getByRole("button", { name: "Conversation history" }));
    await user.click(within(bar()).getByRole("button", { name: "Show marks" }));
    expect(marksStore.getState().shown.marks).toHaveLength(1);
  });

  it("keeps the marks when the message could not be sent, and those the person left out", async () => {
    const user = userEvent.setup();
    act(() =>
      marksStore.getState().add({ level: "cnv_lifecycle", kind: "label", colour: "red", at: [0, 0], text: "x" })
    );
    connection.send.mockImplementationOnce(async () => ({ error: "unreachable" }));
    await user.type(field(), "first{Enter}");
    await vi.waitFor(() => expect(field().value).toBe("first"));
    expect(marksStore.getState().marks).toHaveLength(1);
    await user.click(within(bar()).getByRole("button", { name: "Leave out 1 mark" }));
    await user.clear(field());
    await user.type(field(), "second{Enter}");
    await vi.waitFor(() => expect(sent.at(-1).text).toBe("second"));
    expect(sent.at(-1)).not.toHaveProperty("marks");
    expect(marksStore.getState().marks).toHaveLength(1);
  });

  it("offers quick requests on what is selected, whose words fill the field and whose action goes with it", async () => {
    const user = userEvent.setup();
    expect(within(bar()).queryByRole("group", { name: "Quick requests" })).toBeNull();
    act(() => editorStore.getState().select(["nod_expiryClock"], "cnv_lifecycle"));
    const quick = within(bar()).getByRole("group", { name: "Quick requests" });
    expect(
      within(quick)
        .getAllByRole("button")
        .map(button => button.textContent)
    ).toEqual([
      "Explain",
      "Review",
      "Fill in what is missing",
      "Write scenarios",
      "Detail in a level",
      "Suggest names"
    ]);
    await user.click(within(quick).getByRole("button", { name: "Review" }));
    expect(field().value).toBe("Review this: Problems, gaps and inconsistencies.");
    fireEvent.change(field(), { target: { value: "Review it against the payout rules." } });
    await user.type(field(), "{Enter}");
    expect(sent.at(-1)).toMatchObject({ text: "Review it against the payout rules.", action: "review" });
    await user.click(within(bar()).getByRole("button", { name: "Explain" }));
    await user.clear(field());
    await user.type(field(), "just a question{Enter}");
    expect(sent.at(-1)).not.toHaveProperty("action");
  });

  it("keeps a quick request's action when its message could not be sent", async () => {
    const user = userEvent.setup();
    act(() => editorStore.getState().select(["nod_expiryClock"], "cnv_lifecycle"));
    connection.send.mockImplementationOnce(async () => ({ error: "unreachable" }));
    await user.click(within(bar()).getByRole("button", { name: "Review" }));
    await user.type(field(), "{Enter}");
    await vi.waitFor(() => expect(field().value).toBe("Review this: Problems, gaps and inconsistencies."));
    await user.type(field(), "{Enter}");
    await vi.waitFor(() => expect(sent.at(-1)).toMatchObject({ action: "review" }));
  });
});
