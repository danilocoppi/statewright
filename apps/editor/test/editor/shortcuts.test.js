// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { isMac, shortcutFor } from "@/features/editor/shortcuts";

const press = (key, modifiers = {}, target = document.body) => ({ key, target, ...modifiers });
const mac = { mac: true };
const pc = { mac: false };

describe("shortcutFor", () => {
  it("saves with ⌘S or Ctrl+S, and saves a copy with the Shift key", () => {
    expect(shortcutFor(press("s", { metaKey: true }), mac)).toBe("save");
    expect(shortcutFor(press("s", { ctrlKey: true }), pc)).toBe("save");
    expect(shortcutFor(press("S", { ctrlKey: true, shiftKey: true }), pc)).toBe("saveCopy");
    expect(shortcutFor(press("s", { ctrlKey: true }), mac)).toBeNull();
  });

  it("undoes and redoes, with Ctrl+Y as well on Windows and Linux", () => {
    expect(shortcutFor(press("z", { metaKey: true }), mac)).toBe("undo");
    expect(shortcutFor(press("Z", { metaKey: true, shiftKey: true }), mac)).toBe("redo");
    expect(shortcutFor(press("y", { ctrlKey: true }), pc)).toBe("redo");
  });

  it("moves between the editor's areas with F6 and Shift+F6, from a field too, but not out of a modal dialog", () => {
    expect(shortcutFor(press("F6"), pc)).toBe("nextArea");
    expect(shortcutFor(press("F6", { shiftKey: true }), pc)).toBe("previousArea");
    expect(shortcutFor(press("F6", {}, document.createElement("input")), pc)).toBe("nextArea");
    expect(shortcutFor(press("F6", { ctrlKey: true }), pc)).toBeNull();
    const dialog = document.body.appendChild(document.createElement("dialog"));
    expect(shortcutFor(press("F6", {}, dialog.appendChild(document.createElement("button"))), pc)).toBeNull();
    dialog.remove();
  });

  it("exports the level as SVG with Shift+E", () => {
    expect(shortcutFor(press("E", { shiftKey: true }), pc)).toBe("exportSVG");
    // Without Shift, E is a tool's key (Entry, End).
    expect(shortcutFor(press("e"), pc)).toBe("tool");
  });

  it("leaves undo and plain keys to text fields, but still saves from them", () => {
    const input = document.createElement("input");
    expect(shortcutFor(press("z", { ctrlKey: true }, input), pc)).toBeNull();
    expect(shortcutFor(press("E", { shiftKey: true }, input), pc)).toBeNull();
    expect(shortcutFor(press("s", { ctrlKey: true }, input), pc)).toBe("save");
  });

  it("goes up with Esc, except from a text field", () => {
    expect(shortcutFor(press("Escape"), pc)).toBe("up");
    expect(shortcutFor(press("Escape", { shiftKey: true }), pc)).toBeNull();
    expect(shortcutFor(press("Escape", {}, document.createElement("input")), pc)).toBeNull();
  });

  /** A button in a modal dialog, an item of an open menu, and a line of the Problems panel (not modal). */
  function overlays() {
    const dialog = document.createElement("dialog");
    const button = dialog.appendChild(document.createElement("button"));
    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    const item = menu.appendChild(document.createElement("button"));
    const panel = document.createElement("section");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    const line = panel.appendChild(document.createElement("button"));
    return { button, item, line };
  }

  it("leaves Esc to an open dialog, panel or menu, and every other key but save to a dialog or menu", () => {
    const { button, item, line } = overlays();
    for (const target of [button, item, line]) expect(shortcutFor(press("Escape", {}, target), pc)).toBeNull();
    for (const target of [button, item]) {
      expect(shortcutFor(press("E", { shiftKey: true }, target), pc)).toBeNull();
      expect(shortcutFor(press("F", { shiftKey: true }, target), pc)).toBeNull();
      expect(shortcutFor(press("A", { shiftKey: true }, target), pc)).toBeNull();
      expect(shortcutFor(press("z", { ctrlKey: true }, target), pc)).toBeNull();
    }
  });

  it("still saves from a dialog, a menu or the Problems panel, and keeps the editor's keys in the panel", () => {
    const { button, item, line } = overlays();
    for (const target of [button, item, line])
      expect(shortcutFor(press("s", { ctrlKey: true }, target), pc)).toBe("save");
    expect(shortcutFor(press("z", { ctrlKey: true }, line), pc)).toBe("undo");
    expect(shortcutFor(press("E", { shiftKey: true }, line), pc)).toBe("exportSVG");
  });
});

describe("editing keys", () => {
  const box = () => {
    const node = document.createElement("div");
    node.className = "react-flow__node";
    return node.appendChild(document.createElement("span"));
  };

  it("selects all and duplicates with ⌘A and ⌘D, Ctrl+A and Ctrl+D elsewhere", () => {
    expect(shortcutFor(press("a", { metaKey: true }), mac)).toBe("selectAll");
    expect(shortcutFor(press("d", { ctrlKey: true }), pc)).toBe("duplicate");
    expect(shortcutFor(press("A", { ctrlKey: true, shiftKey: true }), pc)).toBeNull();
  });

  it("deletes with Delete or Backspace, nudges or moves with the arrows, and selects a box with Space", () => {
    expect(shortcutFor(press("Delete"), pc)).toBe("delete");
    expect(shortcutFor(press("Backspace"), mac)).toBe("delete");
    expect(shortcutFor(press("ArrowLeft", { shiftKey: true }), pc)).toBe("arrow");
    expect(shortcutFor(press(" ", {}, box()), pc)).toBe("select");
    expect(shortcutFor(press(" "), pc)).toBeNull();
  });

  it("opens the canvas menu with the menu key or Shift+F10, and makes a region with R", () => {
    expect(shortcutFor(press("ContextMenu"), pc)).toBe("menu");
    expect(shortcutFor(press("F10", { shiftKey: true }), pc)).toBe("menu");
    expect(shortcutFor(press("r"), pc)).toBe("region");
    expect(shortcutFor(press("R", { shiftKey: true }), pc)).toBeNull();
    expect(shortcutFor(press("F2"), pc)).toBe("rename");
  });

  it("takes a tool with its letter, leaving letters with ⌘, Ctrl or Alt to the browser", () => {
    expect(shortcutFor(press("s"), pc)).toBe("tool");
    expect(shortcutFor(press("v"), mac)).toBe("tool");
    expect(shortcutFor(press("s", { ctrlKey: true }), mac)).toBeNull();
    expect(shortcutFor(press("s", { altKey: true }), pc)).toBeNull();
    expect(shortcutFor(press("s", {}, document.createElement("input")), pc)).toBeNull();
  });

  it("lays the level out again with Shift+L, fits it with Shift+1, and zooms with ⌘+ and ⌘−", () => {
    expect(shortcutFor(press("L", { shiftKey: true }), pc)).toBe("layout");
    expect(shortcutFor(press("!", { shiftKey: true, code: "Digit1" }), pc)).toBe("fit");
    expect(shortcutFor(press("=", { metaKey: true }), mac)).toBe("zoomIn");
    expect(shortcutFor(press("+", { ctrlKey: true, shiftKey: true }), pc)).toBe("zoomIn");
    expect(shortcutFor(press("-", { ctrlKey: true }), pc)).toBe("zoomOut");
  });

  it("fits the level with Shift+F and lays it out again with Shift+A, as Shift+1 and Shift+L do", () => {
    expect(shortcutFor(press("F", { shiftKey: true }), pc)).toBe("fit");
    expect(shortcutFor(press("A", { shiftKey: true }), mac)).toBe("layout");
    // Without Shift, F and A are tools' keys (If/else, Actor, Action).
    expect(shortcutFor(press("f"), pc)).toBe("tool");
    expect(shortcutFor(press("a"), pc)).toBe("tool");
    // With ⌘, Ctrl or Alt they are the browser's; in a field, the field's.
    expect(shortcutFor(press("F", { shiftKey: true, ctrlKey: true }), pc)).toBeNull();
    expect(shortcutFor(press("A", { shiftKey: true, metaKey: true }), mac)).toBeNull();
    expect(shortcutFor(press("F", { shiftKey: true, altKey: true }), pc)).toBeNull();
    for (const field of ["input", "textarea"]) {
      expect(shortcutFor(press("F", { shiftKey: true }, document.createElement(field)), pc)).toBeNull();
      expect(shortcutFor(press("A", { shiftKey: true }, document.createElement(field)), pc)).toBeNull();
    }
  });

  it("inserts by name with /", () => {
    expect(shortcutFor(press("/"), pc)).toBe("insert");
    expect(shortcutFor(press("/", {}, document.createElement("input")), pc)).toBeNull();
  });

  it("leaves the arrows to the tool dock, which moves along its tools", () => {
    const dock = document.createElement("div");
    dock.setAttribute("role", "toolbar");
    expect(shortcutFor(press("ArrowDown", {}, dock.appendChild(document.createElement("button"))), pc)).toBeNull();
  });

  it("opens the selected edge's trigger with Enter in the canvas, leaving Enter to the buttons of the islands", () => {
    const canvas = document.createElement("div");
    canvas.className = "react-flow";
    const pane = canvas.appendChild(document.createElement("div"));
    expect(shortcutFor(press("Enter"), pc)).toBe("trigger");
    expect(shortcutFor(press("Enter", {}, pane), pc)).toBe("trigger");
    expect(shortcutFor(press("Enter", {}, document.createElement("button")), pc)).toBeNull();
  });

  it("leaves those keys to text fields, dialogs, menus and the Problems panel", () => {
    const input = document.createElement("input");
    const panel = document.createElement("section");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    const filter = panel.appendChild(document.createElement("button"));
    for (const target of [input, filter]) {
      expect(shortcutFor(press("Backspace", {}, target), pc)).toBeNull();
      expect(shortcutFor(press("ArrowRight", {}, target), pc)).toBeNull();
    }
    expect(shortcutFor(press("a", { ctrlKey: true }, input), pc)).toBeNull();
  });

  it("shows or hides the inspector with Shift+I, from the canvas and from the inspector itself", () => {
    const inspector = document.createElement("section");
    inspector.setAttribute("role", "dialog");
    inspector.setAttribute("aria-modal", "false");
    const choice = inspector.appendChild(document.createElement("button"));
    expect(shortcutFor(press("I", { shiftKey: true }), pc)).toBe("inspector");
    expect(shortcutFor(press("I", { shiftKey: true }, choice), pc)).toBe("inspector");
    expect(shortcutFor(press("I", { shiftKey: true }, document.createElement("input")), pc)).toBeNull();
    expect(shortcutFor(press("i"), pc)).toBe("tool");
  });

  it("opens search and commands with ⌘K or Ctrl+K, from a field too, but not from a modal dialog", () => {
    const dialog = document.createElement("dialog");
    const inside = dialog.appendChild(document.createElement("input"));
    expect(shortcutFor(press("k", { metaKey: true }), mac)).toBe("palette");
    expect(shortcutFor(press("k", { ctrlKey: true }), pc)).toBe("palette");
    expect(shortcutFor(press("k", { ctrlKey: true }, document.createElement("input")), pc)).toBe("palette");
    expect(shortcutFor(press("k", { ctrlKey: true }, inside), pc)).toBeNull();
  });

  it("opens the levels with L, on every kind of level", () => {
    expect(shortcutFor(press("l"), pc)).toBe("levels");
    expect(shortcutFor(press("l"), mac)).toBe("levels");
    expect(shortcutFor(press("l", {}, document.createElement("input")), pc)).toBeNull();
  });

  it("opens the catalog with G, on every kind of level", () => {
    expect(shortcutFor(press("g"), pc)).toBe("catalog");
    expect(shortcutFor(press("G", { shiftKey: true }), pc)).toBeNull();
    expect(shortcutFor(press("g", {}, document.createElement("input")), pc)).toBeNull();
  });
});

describe("isMac", () => {
  it("recognises Apple platforms", () => {
    expect(isMac({ platform: "MacIntel" })).toBe(true);
    expect(isMac({ userAgentData: { platform: "Windows" } })).toBe(false);
    expect(isMac({ platform: "Linux x86_64" })).toBe(false);
  });
});
