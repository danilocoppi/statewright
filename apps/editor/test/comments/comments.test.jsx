// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { commentsStore } from "@/comments/store";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

const AT = "2026-10-15T12:00:00.000Z";

async function show(commands = []) {
  let doc = await placedExample("payments");
  if (commands.length) doc = applyBatch(doc, commands).doc;
  act(() => editorStore.getState().open(doc, { canvasId: "cnv_expiryClock" }));
  render(<Canvas />);
}

const add = (id, extra = {}) => ({
  type: "comment.add",
  args: { id, canvas: "cnv_expiryClock", target: "nod_paused", text: "Why pause here?", time: AT, ...extra }
});
const pin = id => document.querySelector(`[data-testid="comment-pin"][data-comment="${id}"]`);

afterEach(() =>
  act(() => {
    commentsStore.getState().close();
    editorStore.getState().close();
  })
);

describe("comments on the canvas (collaboration spec §8.1)", () => {
  it("pins an open comment to its element, and not a resolved one", async () => {
    await show([
      add("cmt_why"),
      add("cmt_old", { text: "Done" }),
      { type: "comment.resolve", args: { id: "cmt_old" } }
    ]);
    expect(pin("cmt_why")).toBeTruthy();
    expect(pin("cmt_old")).toBeNull();
  });

  it("opens the thread, answers in it and resolves it", async () => {
    const user = userEvent.setup();
    await show([
      add("cmt_why"),
      {
        type: "comment.reply",
        args: { id: "cmt_why", text: "The payer verifies.", author: "agent", name: "claude-code", time: AT }
      }
    ]);
    await user.click(pin("cmt_why"));
    const thread = within(screen.getByTestId("comment-thread"));
    expect(thread.getByText("Why pause here?")).toBeTruthy();
    expect(thread.getByText("claude-code")).toBeTruthy();
    await user.type(thread.getByRole("textbox", { name: "Reply" }), "Then keep it.");
    await user.click(thread.getByRole("button", { name: "Reply" }));
    const comment = () => editorStore.getState().doc.annotations.comments.cmt_why;
    expect(comment().thread.at(-1)).toMatchObject({ author: "person", text: "Then keep it." });
    await user.click(thread.getByRole("button", { name: "Resolve" }));
    expect(comment().status).toBe("resolved");
  });

  it("writes a new comment on an element", async () => {
    const user = userEvent.setup();
    await show();
    act(() => commentsStore.getState().startDraft({ canvas: "cnv_expiryClock", target: "nod_running" }));
    const thread = within(screen.getByTestId("comment-thread"));
    await user.type(thread.getByRole("textbox", { name: "Comment" }), "Is this the only way in?");
    await user.click(thread.getByRole("button", { name: "Comment" }));
    const [comment] = Object.values(editorStore.getState().doc.annotations.comments);
    expect(comment).toMatchObject({
      target: "nod_running",
      status: "open",
      thread: [{ author: "person", text: "Is this the only way in?" }]
    });
  });
});
