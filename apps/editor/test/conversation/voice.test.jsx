// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { conversationStore } from "@/conversation/store";
import { Voice } from "@/conversation/Voice";

/** A speech recognition that says what the test tells it to. */
class FakeRecognition {
  static last = null;
  constructor() {
    FakeRecognition.last = this;
    this.started = false;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.started = false;
    this.onend?.();
  }
  /** Results so far: [text, final?] each. */
  hear(results) {
    const list = results.map(([text, isFinal]) => Object.assign([{ transcript: text }], { isFinal }));
    this.onresult?.({ resultIndex: 0, results: list });
  }
}

beforeEach(() => {
  localStorage.clear();
  act(() => conversationStore.getState().clear());
});

afterEach(() => {
  delete globalThis.SpeechRecognition;
  FakeRecognition.last = null;
});

describe("dictating to the agent (collaboration spec §9)", () => {
  it("is not offered where the browser cannot listen", () => {
    render(<Voice />);
    expect(screen.queryByRole("button", { name: "Dictate" })).toBeNull();
  });

  it("asks once, saying where the voice goes, then writes what is said into the field", async () => {
    const user = userEvent.setup();
    globalThis.SpeechRecognition = FakeRecognition;
    act(() => conversationStore.getState().setDraft("Hello."));
    render(<Voice />);
    await user.click(screen.getByRole("button", { name: "Dictate" }));
    expect(screen.getByText(/Google's speech service/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Allow dictation" }));
    expect(FakeRecognition.last.started).toBe(true);
    act(() => FakeRecognition.last.hear([["this needs", false]]));
    expect(conversationStore.getState().draft).toBe("Hello. this needs");
    act(() => FakeRecognition.last.hear([["this needs a timeout", true]]));
    expect(conversationStore.getState().draft).toBe("Hello. this needs a timeout");
    act(() =>
      FakeRecognition.last.hear([
        ["this needs a timeout", true],
        [" on paused", false]
      ])
    );
    expect(conversationStore.getState().draft).toBe("Hello. this needs a timeout on paused");
    await user.click(screen.getByRole("button", { name: "Stop dictating" }));
    expect(FakeRecognition.last.started).toBe(false);
    await user.click(screen.getByRole("button", { name: "Dictate" }));
    expect(screen.queryByText(/Google's speech service/)).toBeNull();
  });

  it("says when the microphone was refused, leaving the field as it was", async () => {
    const user = userEvent.setup();
    globalThis.SpeechRecognition = FakeRecognition;
    localStorage.setItem("statewright:voice", "allowed");
    act(() => conversationStore.getState().setDraft("Kept."));
    render(<Voice />);
    await user.click(screen.getByRole("button", { name: "Dictate" }));
    act(() => FakeRecognition.last.onerror?.({ error: "not-allowed" }));
    expect(screen.getByText(/microphone was refused/)).toBeTruthy();
    expect(conversationStore.getState().draft).toBe("Kept.");
  });
});
