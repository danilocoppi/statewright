import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { focusSelection, laneSelection } from "@/editing/actions";
import { boxesOf } from "@/editing/changes";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { placedExample } from "../fixtures.js";

const t = (key, values) => (values?.number ? `${key} ${values.number}` : key);
const state = () => editorStore.getState();

beforeEach(async () => editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime" }));
afterEach(() => {
  editorStore.getState().close();
  editingStore.getState().reset();
});

describe("annotating the selection", () => {
  it("highlights the selected boxes and arrows with Look here, and takes them out when all already are", () => {
    state().select(["nod_scheduler", "nod_clients"]);
    focusSelection(t);
    expect(state().doc.annotations.focus).toEqual(["nod_scheduler", "nod_clients"]);
    expect(state().history.past.at(-1).label).toBe("editing.focus");
    state().select(["nod_scheduler"]);
    focusSelection(t);
    expect(state().doc.annotations.focus).toEqual(["nod_clients"]);
    expect(state().history.past.at(-1).label).toBe("editing.unfocus");
  });

  it("makes a lane of the selected boxes, in reading order, as one change", () => {
    const boxes = boxesOf(state().doc, "cnv_runtime");
    const chosen = ["nod_scheduler", "nod_clients", "nod_commandApi"];
    state().select(chosen);
    const id = laneSelection(t);
    const lane = state().doc.annotations.lanes[id];
    expect(lane.label).toBe("inspector:lanes.name 1");
    expect(lane.nodes).toEqual(
      [...chosen].sort((a, b) => boxes.get(a).x - boxes.get(b).x || boxes.get(a).y - boxes.get(b).y)
    );
    expect(state().history.past.map(entry => entry.label)).toEqual(["editing.lane"]);
  });

  it("changes nothing in a read-only tab", async () => {
    editorStore.getState().open(await placedExample("payments"), { canvasId: "cnv_runtime", readOnly: true });
    state().select(["nod_scheduler"]);
    focusSelection(t);
    expect(laneSelection(t)).toBeNull();
    expect(state().doc.annotations?.focus ?? []).toEqual([]);
  });
});
