// @vitest-environment jsdom
import "../dom.js";

import { afterEach, describe, expect, it, vi } from "vitest";

import { connection } from "@/agent/connection";
import { editingStore } from "@/editing/state";
import { editorCommands } from "@/features/editor/commands";
import { editorStore } from "@/store/editor";
import { useView, VIEW_DEFAULTS } from "@/stores/view";

import { placedExample, readExample } from "../fixtures.js";

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);
const commands = options => editorCommands({ t, mac: false, repository: {}, onLevels: vi.fn(), ...options });

afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
  useView.setState(VIEW_DEFAULTS);
});

describe("the commands ⌘K lists", () => {
  it("lists every shortcut with its keys, and the tools of the level", () => {
    editorStore.getState().open(readExample("payments"), { canvasId: "cnv_lifecycle" });
    const keys = Object.fromEntries(commands().map(command => [command.id, command.keys]));
    expect(keys).toMatchObject({
      layout: ["⇧A", "⇧L"],
      exportSvg: "⇧E",
      save: "Ctrl+S",
      saveCopy: "Ctrl+Shift+S",
      undo: "Ctrl+Z",
      redo: "Ctrl+Shift+Z",
      fit: ["⇧F", "⇧1"],
      inspector: "⇧I",
      catalog: "G",
      insert: "/",
      selectAll: "Ctrl+A",
      up: "Esc",
      "tool-state": "S",
      "tool-initial": "I"
    });
    expect(keys).not.toHaveProperty("duplicate");
    editorStore.getState().select(["nod_complianceHold"]);
    expect(commands().map(command => command.id)).toEqual(expect.arrayContaining(["duplicate", "delete", "region"]));
  });

  it("lists what is done to the selection by key — rename, its trigger, the menu, copy, cut and paste — and runs it", async () => {
    // Copying measures the boxes: the level is placed, as the canvas places it.
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_crossBorderSend" });
    editorStore.getState().select(["nod_converting"]);
    const keys = list => Object.fromEntries(list.map(command => [command.id, command.keys]));
    expect(keys(commands())).toMatchObject({ rename: "F2", menu: "Shift+F10", copy: "Ctrl+C", cut: "Ctrl+X" });
    expect(keys(commands())).not.toHaveProperty("trigger");
    commands()
      .find(command => command.id === "rename")
      .run();
    expect(editingStore.getState().editor).toEqual({ type: "name", id: "nod_converting" });
    commands()
      .find(command => command.id === "copy")
      .run();
    expect(keys(commands())).toMatchObject({ paste: "Ctrl+V" });

    editorStore.getState().select(["edg_awaitingFundsConverting"]);
    expect(keys(commands())).toMatchObject({ trigger: "↵" });
    commands()
      .find(command => command.id === "trigger")
      .run();
    expect(editingStore.getState().editor).toEqual({ type: "trigger", edgeId: "edg_awaitingFundsConverting" });
    commands()
      .find(command => command.id === "menu")
      .run();
    expect(editingStore.getState().editor).toMatchObject({ type: "menu", anchor: "selection" });
  });

  it("records a cut in the history as a cut, not as a deletion", async () => {
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_crossBorderSend" });
    editorStore.getState().select(["nod_converting"]);
    commands()
      .find(command => command.id === "cut")
      .run();
    expect(editorStore.getState().doc.canvases.cnv_crossBorderSend.nodes.nod_converting).toBeUndefined();
    expect(editorStore.getState().history.past.at(-1).label).toBe("editing.cut");
  });

  it("leaves out what changes the document in a read-only tab, and words layers by what they will do", () => {
    editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime", readOnly: true });
    const ids = commands().map(command => command.id);
    expect(ids).not.toContain("layout");
    expect(ids).not.toContain("tool-service");
    expect(ids).toContain("exportSvg");
    editorStore.getState().select(["nod_scheduler"]);
    const selected = commands().map(command => command.id);
    expect(selected).toContain("copy");
    expect(selected).not.toContain("rename");
    expect(selected).not.toContain("cut");
    const notes = commands().find(command => command.id === "layer-notes");
    expect(notes.name).toContain("inspector:palette.commands.hide");
    notes.run();
    expect(useView.getState().notes).toBe(false);
    expect(commands().find(command => command.id === "layer-notes").name).toContain("inspector:palette.commands.show");
  });

  it("offers writing to the paired agent, with M, only while one is paired (collaboration spec §4)", () => {
    editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" });
    expect(commands().find(command => command.id === "message")).toBeUndefined();
    connection.store.setState({ status: "connected", agent: "claude-code" });
    try {
      const message = commands().find(command => command.id === "message");
      expect(message).toMatchObject({ keys: "M", name: 'agent:conversation.command {"agent":"claude-code"}' });
    } finally {
      connection.store.setState({ status: "off", agent: null });
    }
  });

  it("runs what it says: a tool in hand, the catalog, the levels, the guide", async () => {
    editorStore.getState().open(readExample("payments"), { canvasId: "cnv_runtime" });
    const onLevels = vi.fn();
    const list = commands({ onLevels });
    list.find(command => command.id === "tool-queue").run();
    expect(editingStore.getState().tool).toBe("queue");
    expect(list.find(command => command.id === "levels").keys).toBe("L");
    list.find(command => command.id === "levels").run();
    expect(onLevels).toHaveBeenCalled();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    list.find(command => command.id === "guide").run();
    expect(open).toHaveBeenCalledWith("/readme", "_blank", "noopener");
    open.mockRestore();
  });
});
