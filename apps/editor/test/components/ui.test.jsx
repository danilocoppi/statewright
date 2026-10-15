// @vitest-environment jsdom
import "../dom.js";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/Button";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { Dialog } from "@/components/ui/Dialog";
import { Menu } from "@/components/ui/Menu";
import { Segmented } from "@/components/ui/Segmented";
import { toast, TOAST_MS, useToastStore } from "@/stores/toast";

function ExportMenu({ onSelect }) {
  return (
    <Menu
      label="Export"
      trigger={props => <Button {...props}>Export</Button>}
      sections={[
        {
          title: "This level",
          items: [
            { id: "svg", label: "Image (SVG)", onSelect: () => onSelect("svg") },
            { id: "png", label: "Image (PNG)", disabled: true, onSelect: () => onSelect("png") },
            { id: "copy", label: "Copy image", onSelect: () => onSelect("copy") }
          ]
        },
        { title: "Whole project", items: [{ id: "md", label: "Documentation", onSelect: () => onSelect("md") }] }
      ]}
    />
  );
}

describe("Menu", () => {
  it("opens on click, moves with the arrows over disabled items, and runs the item on Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ExportMenu onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menu", { name: "Export" })).toBeTruthy();
    expect(document.activeElement.textContent).toContain("Image (SVG)");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement.textContent).toContain("Copy image");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(document.activeElement.textContent).toContain("Image (SVG)");
    await user.keyboard("{End}{Enter}");
    expect(onSelect).toHaveBeenCalledWith("md");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape and gives the focus back to its button", async () => {
    const user = userEvent.setup();
    render(<ExportMenu onSelect={() => {}} />);
    const button = screen.getByRole("button", { name: "Export" });
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("scrolls when it is taller than the window below its button, so every item can be reached", async () => {
    const user = userEvent.setup();
    const height = Object.getOwnPropertyDescriptor(window, "innerHeight");
    Object.defineProperty(window, "innerHeight", { value: 300, configurable: true });
    try {
      render(<ExportMenu onSelect={() => {}} />);
      const button = screen.getByRole("button", { name: "Export" });
      vi.spyOn(button.parentElement, "getBoundingClientRect").mockReturnValue({ top: 16, bottom: 56 });
      await user.click(button);
      const menu = screen.getByRole("menu", { name: "Export" });
      // The window below the button (300 − 56), less the 8 px between them and a 16 px margin.
      expect(menu.style.maxHeight).toBe("220px");
      expect(menu.className).toContain("overflow-y-auto");
      // The item with the focus is the one in the Tab order: a menu that scrolls holds something the keyboard reaches.
      expect(document.activeElement.tabIndex).toBe(0);
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement.tabIndex).toBe(0);
      expect(screen.getAllByRole("menuitem").filter(item => item.tabIndex === 0)).toHaveLength(1);
    } finally {
      Object.defineProperty(window, "innerHeight", height);
    }
  });

  it("opens beside its button, rising from its bottom, and scrolls when taller than the window above", async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="Kind"
        side="right"
        trigger={props => <Button {...props}>Kind</Button>}
        sections={[{ items: [{ id: "flow", label: "Flow", onSelect: () => {} }] }]}
      />
    );
    const button = screen.getByRole("button", { name: "Kind" });
    vi.spyOn(button.parentElement, "getBoundingClientRect").mockReturnValue({ top: 380, bottom: 412 });
    await user.click(button);
    const menu = screen.getByRole("menu", { name: "Kind" });
    expect(menu.className).toContain("left-[calc(100%+10px)]");
    expect(menu.className).toContain("bottom-0");
    expect(menu.className).not.toContain("top-[calc(100%+8px)]");
    // The window above the button's bottom, less a 16 px margin.
    expect(menu.style.maxHeight).toBe("396px");
  });

  it("closes on a click outside and ignores clicks on disabled items", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div>
        <ExportMenu onSelect={onSelect} />
        <p>Outside</p>
      </div>
    );
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("menuitem", { name: "Image (PNG)" }));
    expect(onSelect).not.toHaveBeenCalled();
    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Menu with choices", () => {
  it("marks the chosen item as a checked radio item", async () => {
    const user = userEvent.setup();
    render(
      <Menu
        label="Theme"
        trigger={props => <Button {...props}>Theme</Button>}
        sections={[
          {
            items: [
              { id: "light", label: "Light", checked: true, onSelect: () => {} },
              { id: "dark", label: "Dark", checked: false, onSelect: () => {} }
            ]
          }
        ]}
      />
    );
    await user.click(screen.getByRole("button", { name: "Theme" }));
    expect(screen.getByRole("menuitemradio", { name: "Light" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("menuitemradio", { name: "Dark" }).getAttribute("aria-checked")).toBe("false");
  });

  it("marks a setting that turns on and off as a checkbox item", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        label="View"
        trigger={props => <Button {...props}>View</Button>}
        sections={[{ items: [{ id: "legend", label: "Legend", toggle: true, checked: false, onSelect }] }]}
      />
    );
    await user.click(screen.getByRole("button", { name: "View" }));
    const item = screen.getByRole("menuitemcheckbox", { name: "Legend" });
    expect(item.getAttribute("aria-checked")).toBe("false");
    await user.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe("ContextMenu", () => {
  it("opens at a point on its first item, runs a choice, and closes on Esc or a click outside, giving the focus back", async () => {
    const user = userEvent.setup();
    const ran = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      const sections = [
        {
          items: [
            { id: "off", label: "Off", disabled: true, onSelect: ran },
            { id: "copy", label: "Copy", onSelect: () => ran("copy") },
            { id: "paste", label: "Paste", onSelect: () => ran("paste") }
          ]
        }
      ];
      return (
        <div className="relative">
          <Button onClick={() => setOpen(true)}>Here</Button>
          {open && (
            <ContextMenu label="Canvas" sections={sections} at={{ x: 40, y: 60 }} onClose={() => setOpen(false)} />
          )}
        </div>
      );
    }
    render(<Harness />);
    const here = screen.getByRole("button", { name: "Here" });
    await user.click(here);
    const menu = screen.getByRole("menu", { name: "Canvas" });
    expect(menu.parentElement.style.left).toBe("40px");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Copy" }));
    await user.keyboard("{ArrowDown}{Enter}");
    expect(ran).toHaveBeenCalledWith("paste");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(here);
    await user.click(here);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(here);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("Dialog", () => {
  function Example({ onClose }) {
    return (
      <Dialog
        open
        onClose={onClose}
        title="Import this file?"
        description="It was changed."
        actions={<Button>OK</Button>}
      >
        <p>Body</p>
      </Dialog>
    );
  }

  it("shows its title, description, body and actions, and is named by its title", () => {
    render(<Example onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Import this file?" });
    expect(dialog.textContent).toContain("It was changed.");
    expect(dialog.textContent).toContain("Body");
    expect(screen.getByRole("button", { name: "OK" })).toBeTruthy();
  });

  it("asks to close on Escape (the dialog's cancel event) instead of closing by itself", () => {
    const onClose = vi.fn();
    render(<Example onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute("open")).toBe(true);
  });
});

describe("Segmented", () => {
  function Example() {
    const [value, setValue] = useState("machine");
    return (
      <Segmented
        label="Kind"
        value={value}
        onChange={setValue}
        options={[
          { value: "system", label: "System" },
          { value: "machine", label: "State machine" },
          { value: "flow", label: "Flow" }
        ]}
      />
    );
  }

  it("is a radio group that moves with the arrow keys and wraps around", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.getByRole("radio", { name: "State machine" }).getAttribute("aria-checked")).toBe("true");
    screen.getByRole("radio", { name: "State machine" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Flow" }).getAttribute("aria-checked")).toBe("true");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "System" }));
  });
});

describe("toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ items: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("adds a toast that disappears after a while and keeps at most three", () => {
    toast.info("one");
    toast.success("two");
    toast.error("three");
    toast.info("four");
    expect(useToastStore.getState().items.map(item => item.message)).toEqual(["two", "three", "four"]);
    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(useToastStore.getState().items).toEqual([]);
  });

  it("keeps an action, such as undoing a deletion", () => {
    const onClick = vi.fn();
    const id = toast.success("Deleted", { action: { label: "Undo", onClick } });
    const item = useToastStore.getState().items.find(entry => entry.id === id);
    expect(item.actions.map(action => action.label)).toEqual(["Undo"]);
    item.actions[0].onClick();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
