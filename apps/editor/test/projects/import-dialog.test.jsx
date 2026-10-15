// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImportDialog } from "@/features/projects/ImportDialog";

import { readExample } from "../fixtures.js";

const review = extra => ({
  status: "review",
  fileName: "get-paid.sttw",
  doc: readExample("get-paid-as-built"),
  migrations: [],
  sections: { content: "changed", layout: "ok", annotations: "ok" },
  local: null,
  diff: null,
  ...extra
});

describe("ImportDialog", () => {
  it("lists the errors of an invalid file by path and only offers to close", async () => {
    const onClose = vi.fn();
    const errors = Array.from({ length: 14 }, (_, index) => ({
      path: `/canvases/${index}`,
      message: `Problem ${index}`
    }));
    render(
      <ImportDialog plan={{ status: "invalid", fileName: "x.json", errors }} onAccept={() => {}} onClose={onClose} />
    );
    const dialog = screen.getByRole("dialog", { name: "This file can't be opened" });
    expect(dialog.textContent).toContain("x.json isn't a Statewright document, or it has errors:");
    expect(dialog.textContent).toContain("/canvases/0");
    expect(dialog.textContent).toContain("Problem 11");
    // Core's own words stay English in every interface language, and say so (WCAG 3.1.2).
    expect(dialog.querySelector('[lang="en"]').textContent).toBe("Problem 0");
    expect(dialog.textContent).not.toContain("Problem 12");
    expect(dialog.textContent).toContain("and 2 more");
    // A long list scrolls in its box; the keyboard can scroll it too.
    expect(within(dialog).getByRole("list").tabIndex).toBe(0);
    expect(screen.queryByRole("button", { name: "Import and sign" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("explains a file changed outside Statewright, part by part", () => {
    render(<ImportDialog plan={review()} onAccept={() => {}} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "This file was changed outside Statewright" });
    expect(dialog.textContent).toContain("get-paid.sttw was edited after Statewright last saved it.");
    expect(dialog.textContent).toMatch(/ContentChanged/);
    expect(dialog.textContent).toMatch(/LayoutUnchanged/);
  });

  it("says when a file is not signed", () => {
    const plan = review({ sections: { content: "missing", layout: "missing", annotations: "missing" } });
    render(<ImportDialog plan={plan} onAccept={() => {}} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "This file isn't signed" }).textContent).toMatch(/ContentNot signed/);
  });

  it("lists the differences from the local copy, with readable names and places", () => {
    const local = readExample("get-paid-as-built");
    local.signature = { ...local.signature, signedAt: "2026-10-10T12:00:00Z" };
    const plan = review({
      sections: { content: "ok", layout: "ok", annotations: "ok" },
      local,
      diff: {
        changes: [
          { change: "added", type: "node", id: "nod_refunded", name: "refunded", canvasName: "Transaction" },
          { change: "changed", type: "edge", id: "edg_x", name: "processing → failed", canvasName: "Transaction" },
          { change: "removed", type: "catalog", id: "tmr_deadline", name: "deadline", collection: "timers" }
        ],
        layout: 3
      }
    });
    render(<ImportDialog plan={plan} onAccept={() => {}} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "You already have this project" });
    expect(dialog.textContent).toContain("This browser has a different version of Get paid (as built).");
    expect(dialog.textContent).toMatch(/Compared with your copy from Oct 10, 2026/);
    expect(dialog.textContent).toContain("added Box refunded in Transaction");
    expect(dialog.textContent).toContain("changed Arrow processing → failed in Transaction");
    expect(dialog.textContent).toContain("removed Timer deadline");
    expect(dialog.textContent).toContain("Positions changed: 3");
    expect(within(dialog).getByRole("list").tabIndex).toBe(0);
  });

  it("imports and signs, imports as a copy, or cancels", async () => {
    const onAccept = vi.fn();
    const onClose = vi.fn();
    render(<ImportDialog plan={review()} onAccept={onAccept} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Import and sign" }));
    await userEvent.click(screen.getByRole("button", { name: "Import as a copy" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onAccept.mock.calls).toEqual([["replace"], ["copy"]]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing without a plan", () => {
    render(<ImportDialog plan={null} onAccept={() => {}} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
