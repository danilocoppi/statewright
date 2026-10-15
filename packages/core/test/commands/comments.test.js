import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { check, collectRefs } from "../../src/index.js";
import { toSVG } from "../../src/render/index.js";
import { paymentsDoc } from "../helpers.js";
import { cmd, failure, run } from "./helpers.js";

const AT = "2026-10-15T12:00:00.000Z";
const comment = (extra = {}) =>
  cmd("comment.add", { canvas: "cnv_expiryClock", target: "nod_paused", text: "Why pause here?", time: AT, ...extra });

describe("comments (collaboration spec §8.1)", () => {
  it("opens a comment with its first words, the person's unless said otherwise", () => {
    const result = applyBatch(paymentsDoc(), [comment()]);
    const [id] = result.created;
    expect(id).toMatch(/^cmt_/);
    expect(result.doc.annotations.comments[id]).toEqual({
      canvas: "cnv_expiryClock",
      target: "nod_paused",
      status: "open",
      thread: [{ author: "person", text: "Why pause here?", at: AT }]
    });
  });

  it("answers, resolves, reopens and removes a comment", () => {
    let doc = run(paymentsDoc(), comment({ id: "cmt_why" }));
    doc = run(
      doc,
      cmd("comment.reply", {
        id: "cmt_why",
        text: "The payer verifies.",
        author: "agent",
        name: "claude-code",
        time: AT
      })
    );
    expect(doc.annotations.comments.cmt_why.thread[1]).toEqual({
      author: "agent",
      name: "claude-code",
      text: "The payer verifies.",
      at: AT
    });
    doc = run(doc, cmd("comment.resolve", { id: "cmt_why" }));
    expect(doc.annotations.comments.cmt_why.status).toBe("resolved");
    doc = run(doc, cmd("comment.reopen", { id: "cmt_why" }));
    expect(doc.annotations.comments.cmt_why.status).toBe("open");
    doc = run(doc, cmd("comment.remove", { id: "cmt_why" }));
    expect(doc.annotations).not.toHaveProperty("comments");
  });

  it("puts a comment at a point of a level, and refuses a target on another level", () => {
    const doc = run(paymentsDoc(), comment({ id: "cmt_here", target: undefined, at: { x: 10, y: 20 } }));
    expect(doc.annotations.comments.cmt_here).toMatchObject({ at: { x: 10, y: 20 } });
    expect(failure(paymentsDoc(), comment({ canvas: "cnv_lifecycle" })).code).toBe("NOT_ALLOWED");
  });

  it("is a Problem while open, not once resolved", () => {
    let doc = run(paymentsDoc(), comment({ id: "cmt_why" }));
    expect(check(doc).filter(problem => problem.code === "comment.open")).toMatchObject([
      { severity: "incomplete", target: "nod_paused", canvas: "cnv_expiryClock", data: { comment: "cmt_why" } }
    ]);
    doc = run(doc, cmd("comment.resolve", { id: "cmt_why" }));
    expect(check(doc).filter(problem => problem.code === "comment.open")).toEqual([]);
  });

  it("refers to its level and element, and goes with the element it is on", () => {
    const doc = run(paymentsDoc(), comment({ id: "cmt_why" }));
    expect(
      collectRefs(doc)
        .filter(ref => ref.source === "cmt_why")
        .map(ref => ref.target)
    ).toEqual(["cnv_expiryClock", "nod_paused"]);
    const without = run(doc, cmd("node.remove", { id: "nod_paused", cascade: true }));
    expect(without.annotations?.comments?.cmt_why).toBeUndefined();
  });

  it("never shows in the figure", async () => {
    const doc = paymentsDoc();
    const commented = run(doc, comment());
    expect(await toSVG(commented, "cnv_expiryClock")).toBe(await toSVG(doc, "cnv_expiryClock"));
  });
});

describe("locks (collaboration spec §8.2)", () => {
  it("locks an element or a level, and unlocks it", () => {
    const result = applyBatch(paymentsDoc(), [cmd("lock.add", { target: "cnv_expiryClock", note: "agreed" })]);
    const [id] = result.created;
    expect(result.doc.annotations.locks[id]).toEqual({ target: "cnv_expiryClock", note: "agreed" });
    const unlocked = run(result.doc, cmd("lock.remove", { id }));
    expect(unlocked.annotations?.locks).toBeUndefined();
    expect(failure(paymentsDoc(), cmd("lock.add", { target: "evt_payinDetected" })).code).toBe("SCHEMA");
    expect(failure(paymentsDoc(), cmd("lock.add", { target: "nod_nothing" })).code).toBe("NOT_FOUND");
  });
});
