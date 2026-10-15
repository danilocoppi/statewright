// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connection } from "@/agent/connection";
import { ConversationBar } from "@/conversation/ConversationBar";
import { conversationStore } from "@/conversation/store";
import { marksStore } from "@/marks/store";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

let answered;

beforeEach(() => {
  answered = [];
  vi.spyOn(connection, "answer").mockImplementation(async (id, body) => (answered.push({ id, ...body }), 204));
  vi.spyOn(connection, "send").mockImplementation(async () => ({ id: "msg_1" }));
  act(() => {
    editorStore.getState().open(readExample("payments"), { canvasId: "cnv_lifecycle" });
    connection.store.setState({ status: "connected", agent: "claude-code" });
  });
  render(<ConversationBar onNavigate={vi.fn()} />);
});

afterEach(() => {
  vi.restoreAllMocks();
  act(() => {
    connection.store.setState({ status: "off", agent: null });
    conversationStore.getState().clear();
    marksStore.getState().reset();
    editorStore.getState().close();
  });
});

const ask = question => act(() => conversationStore.getState().add({ kind: "question", state: "open", ...question }));
const card = id => document.querySelector(`[data-question="${id}"]`);

describe("the agent's questions (collaboration spec §6.1)", () => {
  it("answers a single choice with a click, and shows what was answered", async () => {
    const user = userEvent.setup();
    ask({
      id: "qst_1",
      question: "Where does it come from?",
      options: [
        { label: "From the payer", value: "payer" },
        { label: "From the bank", value: "bank", point: ["nod_expiryClock"] }
      ]
    });
    const question = within(card("qst_1"));
    expect(question.getByText("Where does it come from?")).toBeTruthy();
    await user.hover(question.getByRole("button", { name: "From the bank" }));
    expect(conversationStore.getState().hover).toEqual(["nod_expiryClock"]);
    await user.click(question.getByRole("button", { name: "From the bank" }));
    expect(answered).toEqual([{ id: "qst_1", values: ["bank"] }]);
    await vi.waitFor(() => expect(document.querySelector('[data-question="qst_1"]')).toBeNull());
    expect(conversationStore.getState().lines[0]).toMatchObject({ state: "answered", answer: { values: ["bank"] } });
  });

  it("answers several choices at once, or in the person's own words", async () => {
    const user = userEvent.setup();
    ask({
      id: "qst_1",
      question: "Which apply?",
      multiple: true,
      options: [
        { label: "A", value: "a" },
        { label: "B", value: "b" },
        { label: "C", value: "c" }
      ]
    });
    ask({ id: "qst_2", question: "Why?" });
    const first = within(card("qst_1"));
    await user.click(first.getByRole("button", { name: "A" }));
    await user.click(first.getByRole("button", { name: "C" }));
    await user.click(first.getByRole("button", { name: "Answer" }));
    const second = within(card("qst_2"));
    await user.type(second.getByRole("textbox", { name: "Another answer" }), "because{Enter}");
    expect(answered).toEqual([
      { id: "qst_1", values: ["a", "c"] },
      { id: "qst_2", text: "because" }
    ]);
  });

  it("takes the elements marked on the canvas for the question only, leaving the person's own marks", async () => {
    const user = userEvent.setup();
    act(() => marksStore.getState().toggleForAI("nod_complianceHold", "cnv_lifecycle"));
    ask({ id: "qst_1", question: "Which states should time out?", pick: "elements" });
    const question = within(card("qst_1"));
    await user.click(question.getByRole("button", { name: "Mark on the canvas" }));
    expect(marksStore.getState()).toMatchObject({ tool: "mark", picking: { question: "qst_1", items: [] } });
    act(() => {
      marksStore.getState().toggleForAI("nod_expiryClock", "cnv_lifecycle");
      marksStore.getState().toggleForAI("nod_sendCrossBorder", "cnv_lifecycle");
    });
    await user.click(question.getByRole("button", { name: "Confirm (2)" }));
    expect(answered).toEqual([
      {
        id: "qst_1",
        elements: [
          { id: "nod_expiryClock", name: "expiry_clock", level: "cnv_lifecycle" },
          { id: "nod_sendCrossBorder", name: "send_cross_border", level: "cnv_lifecycle" }
        ]
      }
    ]);
    expect(marksStore.getState()).toMatchObject({
      tool: null,
      picking: null,
      forAI: [{ id: "nod_complianceHold", level: "cnv_lifecycle" }]
    });
  });
});
