import { afterEach, describe, expect, it } from "vitest";

import { copySelection, paste } from "@/editing/actions";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

const t = key => key;
const placed = id => editorStore.getState().doc.layout.canvases.cnv_runtime.nodes[id];
const pasted = () => editorStore.getState().view.selections.cnv_runtime[0];

afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
  editingStore.getState().setCentre(null);
});

describe("where a paste lands", () => {
  it("in the middle of the view when the pointer is not over the canvas, not beside what was copied", async () => {
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime" });
    editorStore.getState().select(["nod_commandApi"]);
    const clip = copySelection();
    editingStore.getState().setCentre(() => ({ x: 3000, y: 2000 }));
    paste(t, clip);
    expect(placed(pasted())).toMatchObject({ x: 3000, y: 2000 });
  });

  it("where it is asked to, such as the point the canvas menu was opened at, wherever the pointer is now", async () => {
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime" });
    editorStore.getState().select(["nod_commandApi"]);
    const clip = copySelection();
    editingStore.getState().point({ x: 10, y: 10 });
    paste(t, clip, { x: 500, y: 600 });
    expect(placed(pasted())).toMatchObject({ x: 500, y: 600 });
  });
});
