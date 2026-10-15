// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { MarkTools } from "@/marks/MarkTools";
import { marksStore } from "@/marks/store";

afterEach(() =>
  act(() => {
    marksStore.getState().clear();
    marksStore.getState().setTool(null);
    marksStore.getState().setColour("red");
  })
);

describe("the marking tools (collaboration spec §5.1)", () => {
  it("takes a tool in hand and puts it down, one at a time", async () => {
    const user = userEvent.setup();
    render(<MarkTools />);
    const tools = screen.getByRole("toolbar", { name: "Marking tools" });
    const pencil = within(tools).getByRole("button", { name: "Pencil (Alt+click: a label)" });
    await user.click(pencil);
    expect(marksStore.getState().tool).toBe("pencil");
    expect(pencil.getAttribute("aria-pressed")).toBe("true");
    await user.click(within(tools).getByRole("button", { name: "Mark for the AI" }));
    expect(marksStore.getState().tool).toBe("mark");
    expect(pencil.getAttribute("aria-pressed")).toBe("false");
    await user.click(within(tools).getByRole("button", { name: "Mark for the AI" }));
    expect(marksStore.getState().tool).toBeNull();
  });

  it("offers the colours, with what each means, while a drawing tool is in hand", async () => {
    const user = userEvent.setup();
    render(<MarkTools />);
    expect(screen.queryByRole("radiogroup", { name: "Colour" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Rectangle" }));
    const colours = screen.getByRole("radiogroup", { name: "Colour" });
    expect(
      within(colours)
        .getAllByRole("radio")
        .map(radio => radio.getAttribute("aria-label"))
    ).toEqual(["Red: wrong", "Amber: a question", "Green: right", "Neutral"]);
    await user.click(within(colours).getByRole("radio", { name: "Green: right" }));
    expect(marksStore.getState().colour).toBe("green");
  });

  it("erases everything with Shift and a click on the eraser", async () => {
    const user = userEvent.setup();
    render(<MarkTools />);
    act(() => {
      marksStore.getState().add({ level: "cnv_a", kind: "label", colour: "red", at: [0, 0], text: "x" });
      marksStore.getState().toggleForAI("nod_a", "cnv_a");
    });
    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("button", { name: "Eraser (Shift+click: erase all)" }));
    await user.keyboard("{/Shift}");
    expect(marksStore.getState()).toMatchObject({ marks: [], forAI: [] });
  });
});
