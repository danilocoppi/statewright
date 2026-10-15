import { describe, expect, it } from "vitest";

import { placeMissing } from "@/canvas/placement";
import { createEditorStore } from "@/store/editor";
import { handlers } from "@/workers/layout";

import { readExample } from "../fixtures.js";

const client = { request: (type, payload) => handlers[type](payload) };

function open(name, options) {
  const editor = createEditorStore();
  editor.getState().open(readExample(name), options);
  return editor;
}

describe("automatic placement", () => {
  it("stores the positions of a level shown without them, outside the undo history", async () => {
    const editor = open("payments");
    expect(await placeMissing({ editor, client, canvasId: "cnv_runtime" })).toEqual({ placed: 8 });
    const { doc, history, version, status } = editor.getState();
    expect(Object.keys(doc.layout.canvases.cnv_runtime.nodes).sort()).toEqual(
      Object.keys(doc.canvases.cnv_runtime.nodes).sort()
    );
    expect(history.past).toEqual([]);
    expect(version).toBe(1);
    expect(status.dirty).toBe(true);
  });

  it("does nothing on a level whose nodes all have positions", async () => {
    const editor = open("get-paid-as-built");
    expect(await placeMissing({ editor, client, canvasId: "cnv_transaction" })).toEqual({ placed: 0 });
    expect(editor.getState().version).toBe(0);
  });

  it("only shows the placed copy in a read-only tab", async () => {
    const editor = open("payments", { readOnly: true });
    const before = editor.getState().doc;
    const result = await placeMissing({ editor, client, canvasId: "cnv_runtime" });
    expect(result.placed).toBe(8);
    expect(Object.keys(result.doc.layout.canvases.cnv_runtime.nodes)).toHaveLength(8);
    expect(editor.getState().doc).toBe(before);
  });

  it("fails when the document refuses the positions", async () => {
    const editor = open("payments");
    const refused = {
      request: async () => [{ type: "layout.node.set", args: { canvas: "cnv_runtime", id: "nod_nowhere", x: 0, y: 0 } }]
    };
    await expect(placeMissing({ editor, client: refused, canvasId: "cnv_runtime" })).rejects.toThrow("nod_nowhere");
    expect(editor.getState().version).toBe(0);
  });

  it("gives up when the document changed while it was placing", async () => {
    const editor = open("payments");
    const slow = {
      request: async (type, payload) => {
        const commands = await handlers[type](payload);
        editor.getState().dispatch([{ type: "project.update", args: { set: { name: "Changed" } } }], { label: "x" });
        return commands;
      }
    };
    expect(await placeMissing({ editor, client: slow, canvasId: "cnv_runtime" })).toEqual({ placed: 0, stale: true });
    expect(editor.getState().doc.layout?.canvases?.cnv_runtime).toBeUndefined();
  });
});
