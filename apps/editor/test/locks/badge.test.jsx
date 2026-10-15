// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, render } from "@testing-library/react";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

afterEach(() => act(() => editorStore.getState().close()));

describe("a lock shows on the canvas (collaboration spec §8.2)", () => {
  it("puts a lock on the element locked, and none elsewhere", async () => {
    const doc = applyBatch(await placedExample("payments"), [{ type: "lock.add", args: { target: "nod_paused" } }]).doc;
    act(() => editorStore.getState().open(doc, { canvasId: "cnv_expiryClock" }));
    render(<Canvas />);
    expect([...document.querySelectorAll('[data-testid="lock-badge"]')].map(badge => badge.dataset.target)).toEqual([
      "nod_paused"
    ]);
  });
});
