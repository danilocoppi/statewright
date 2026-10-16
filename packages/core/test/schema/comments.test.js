import { describe, expect, it } from "vitest";
import { FORMAT_VERSION, documentSchema, migrate, parse, stringify } from "../../src/index.js";
import { minimalDoc } from "../helpers.js";

const AT = "2026-10-15T12:00:00.000Z";

/** The minimal document with a comment on its service, one at a point, and a lock on the level. */
function reviewed() {
  const doc = minimalDoc();
  const [service] = Object.keys(doc.canvases.cnv_root.nodes);
  doc.annotations = {
    comments: {
      cmt_why: {
        canvas: "cnv_root",
        target: service,
        status: "open",
        thread: [
          { author: "person", text: "Why does this exist?", at: AT },
          { author: "agent", name: "claude-code", text: "It takes the commands.", at: AT }
        ]
      },
      cmt_here: {
        canvas: "cnv_root",
        at: { x: 10, y: 20 },
        status: "resolved",
        thread: [{ author: "person", text: "Room for a queue", at: AT }]
      }
    },
    locks: { lck_root: { target: "cnv_root", note: "agreed with ops" } }
  };
  return doc;
}

describe("format 1.3: comments and locks (collaboration spec §8)", () => {
  it("is a format documents are written in from 1.3 on", () => {
    expect(Number(FORMAT_VERSION)).toBeGreaterThanOrEqual(1.3);
  });

  it("holds comments — on an element or at a point, open or resolved, each a thread — and locks", () => {
    expect(documentSchema.safeParse(reviewed()).success).toBe(true);
  });

  it("refuses a comment without a word, with an unknown status, and a lock without a target", () => {
    const empty = reviewed();
    empty.annotations.comments.cmt_why.thread = [];
    expect(documentSchema.safeParse(empty).success).toBe(false);
    const status = reviewed();
    status.annotations.comments.cmt_why.status = "done";
    expect(documentSchema.safeParse(status).success).toBe(false);
    const lock = reviewed();
    delete lock.annotations.locks.lck_root.target;
    expect(documentSchema.safeParse(lock).success).toBe(false);
  });

  it("stamps a 1.2 document as the current format, changing nothing else", () => {
    const old = minimalDoc();
    old.statewright = "1.2";
    const { doc } = migrate(structuredClone(old));
    expect(doc.statewright).toBe(FORMAT_VERSION);
    expect({ ...doc, statewright: "1.2" }).toEqual(old);
  });

  it("round-trips a document with comments and locks", () => {
    const text = stringify(reviewed());
    const result = parse(text);
    expect(result.ok).toBe(true);
    expect(stringify(result.doc)).toBe(text);
  });
});
