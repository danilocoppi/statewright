// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { LockControl } from "@/locks/LockControl";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

afterEach(() => act(() => editorStore.getState().close()));

describe("don't let the AI change this (collaboration spec §8.2)", () => {
  it("locks an element and unlocks it, one change each", async () => {
    const user = userEvent.setup();
    act(() => editorStore.getState().open(structuredClone(readExample("payments")), { canvasId: "cnv_expiryClock" }));
    render(<LockControl id="nod_paused" />);
    const box = screen.getByRole("checkbox", { name: "Don't let the AI change this" });
    expect(box.checked).toBe(false);
    await user.click(box);
    const locks = () => Object.values(editorStore.getState().doc.annotations.locks ?? {});
    expect(locks()).toEqual([{ target: "nod_paused" }]);
    expect(screen.getByRole("checkbox", { name: "Don't let the AI change this" }).checked).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: "Don't let the AI change this" }));
    expect(locks()).toEqual([]);
    act(() => editorStore.getState().undo());
    expect(locks()).toEqual([{ target: "nod_paused" }]);
  });
});
