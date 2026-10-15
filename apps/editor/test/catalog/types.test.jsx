// @vitest-environment jsdom
import "../dom.js";
import "../i18n.js";

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CatalogSheet } from "@/catalog/CatalogSheet";
import { catalogStore } from "@/catalog/state";
import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

function open(item) {
  act(() => editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" }));
  render(<CatalogSheet onNavigate={() => {}} />);
  act(() => catalogStore.getState().show({ collection: "types", item }));
}

const type = () => editorStore.getState().doc.catalog.types.typ_expiryContext;
const fields = () => screen.getByText("Fields", { selector: "span" }).parentElement;

afterEach(() => {
  act(() => catalogStore.getState().close());
  act(() => editorStore.getState().close());
});

describe("an object type's fields", () => {
  it("renames a field, gives it another type found by name, and makes it required, a list, described", async () => {
    const user = userEvent.setup();
    open("typ_expiryContext");
    const [first] = type().fields;
    const name = within(fields()).getAllByRole("textbox", { name: "Field name" })[0];
    await user.clear(name);
    await user.type(name, "deadline{Enter}");
    expect(type().fields[0].name).toBe("deadline");
    await user.click(within(fields()).getByRole("button", { name: `Type of deadline: ${first.type}` }));
    await user.keyboard("Fail");
    await user.click(screen.getByRole("option", { name: /Failure/ }));
    expect(type().fields[0].type).toBe(
      Object.keys(editorStore.getState().doc.catalog.types).find(id => id !== "typ_expiryContext")
    );
    await user.click(within(fields()).getAllByRole("checkbox", { name: "List" })[0]);
    expect(type().fields[0].list).toBe(true);
    await user.click(within(fields()).getAllByRole("checkbox", { name: "Required" })[0]);
    expect(type().fields[0]).not.toHaveProperty("required");
    await user.type(within(fields()).getByRole("textbox", { name: "What deadline is" }), "When it ends");
    expect(type().fields[0].description).toBe("When it ends");
  });

  it("adds a field, moves it up and takes one out", async () => {
    const user = userEvent.setup();
    open("typ_expiryContext");
    const count = type().fields.length;
    await user.click(screen.getByRole("button", { name: "Add a field" }));
    expect(type().fields).toHaveLength(count + 1);
    expect(type().fields.at(-1)).toEqual({ name: `field${count + 1}`, type: "string" });
    await user.click(within(fields()).getAllByRole("button", { name: "Move up" }).at(-1));
    expect(type().fields.at(-2).name).toBe(`field${count + 1}`);
    await user.click(within(fields()).getByRole("button", { name: `Take out field${count + 1}` }));
    expect(type().fields).toHaveLength(count);
  });
});

describe("enums, aliases and JSON Schema", () => {
  it("turns a type into a list of values, which are added and described", async () => {
    const user = userEvent.setup();
    open("typ_expiryContext");
    await user.selectOptions(screen.getByRole("combobox", { name: "Kind" }), "enum");
    expect(type()).not.toHaveProperty("fields");
    await user.click(screen.getByRole("button", { name: "Add a value" }));
    await user.click(screen.getByRole("button", { name: "Add a value" }));
    expect(type().values).toEqual([{ value: "VALUE_1" }, { value: "VALUE_2" }]);
    const value = screen.getAllByRole("textbox", { name: "Value" })[0];
    await user.clear(value);
    await user.type(value, "USD{Enter}");
    await user.type(screen.getByRole("textbox", { name: "What USD means" }), "US dollar");
    expect(type().values[0]).toEqual({ value: "USD", description: "US dollar" });
  });

  it("makes a type another name for a built-in type", async () => {
    const user = userEvent.setup();
    open("typ_expiryContext");
    await user.selectOptions(screen.getByRole("combobox", { name: "Kind" }), "alias");
    await user.click(screen.getByRole("button", { name: "Same as" }));
    await user.keyboard("uuid");
    await user.click(screen.getByRole("option", { name: /uuid/ }));
    expect(type()).toMatchObject({ kind: "alias", of: "uuid" });
  });

  it("moves between a type's tabs with the arrows, Home and End, each tab naming its own panel", async () => {
    const user = userEvent.setup();
    open("typ_expiryContext");
    const fieldsTab = screen.getByRole("tab", { name: "Fields" });
    const schemaTab = screen.getByRole("tab", { name: "JSON Schema" });
    const panel = screen.getByRole("tabpanel");
    expect(fieldsTab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(fieldsTab.id);
    expect([fieldsTab.tabIndex, schemaTab.tabIndex]).toEqual([0, -1]);
    fieldsTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(schemaTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(schemaTab);
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(schemaTab.id);
    expect(screen.getByRole("tabpanel").id).toBe(schemaTab.getAttribute("aria-controls"));
    expect(schemaTab.getAttribute("aria-controls")).not.toBe(fieldsTab.getAttribute("aria-controls"));
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(fieldsTab);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(schemaTab);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(fieldsTab);
    expect(fieldsTab.getAttribute("aria-selected")).toBe("true");
  });

  it("reads the exported schema as a region, and says it was copied for a moment", () => {
    open("typ_expiryContext");
    fireEvent.click(screen.getByRole("tab", { name: "JSON Schema" }));
    expect(screen.getByRole("region", { name: "Exported from the fields" })).toBeTruthy();
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByRole("button", { name: "Copy the schema" }));
      expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
      act(() => vi.advanceTimersByTime(1600));
      expect(screen.getByRole("button", { name: "Copy the schema" })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the JSON Schema exported from the fields, and takes the person's own instead", async () => {
    const user = userEvent.setup();
    open("typ_expiryContext");
    await user.click(screen.getByRole("tab", { name: "JSON Schema" }));
    const exported = screen.getByLabelText("Exported from the fields");
    expect(JSON.parse(exported.textContent)).toMatchObject({ title: "ExpiryContext", type: "object" });
    await user.click(screen.getByRole("button", { name: "Use my own schema" }));
    const own = screen.getByRole("textbox", { name: "JSON Schema" });
    fireEvent.change(own, { target: { value: '{ "type": "object", "minProperties": 1 }' } });
    fireEvent.blur(own);
    expect(type().jsonSchema).toEqual({ type: "object", minProperties: 1 });
    await user.click(screen.getByRole("button", { name: "Use the fields instead" }));
    expect(type()).not.toHaveProperty("jsonSchema");
  });
});
