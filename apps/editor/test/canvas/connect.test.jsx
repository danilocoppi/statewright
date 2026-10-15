// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyBatch } from "statewright";
import { afterEach, describe, expect, it } from "vitest";

import { Canvas } from "@/canvas/Canvas";
import { useConnect } from "@/canvas/useConnect";
import { editingStore } from "@/editing/state";
import { newProject } from "@/files/new-project";
import { editorStore } from "@/store/editor";

const t = key => key;
/** A React Flow instance as far as connecting uses it: positions are the screen's, unchanged. */
const flow = { screenToFlowPosition: point => point, getInternalNode: () => null };

/** A placed machine: initial → Open, with Paid and a terminal Closed. */
function machine() {
  let doc = newProject({ name: "Pay", kind: "machine", names: { state: "Open", end: "Done" } }, new Set());
  doc = applyBatch(doc, [
    { type: "node.add", args: { canvas: doc.root, id: "nod_paid", node: { kind: "state", name: "Paid" } } },
    {
      type: "node.add",
      args: { canvas: doc.root, id: "nod_closed", node: { kind: "state", name: "Closed", terminal: true } }
    },
    ...["nod_initial", "nod_firstState", "nod_paid", "nod_closed"].map((id, index) => ({
      type: "layout.node.set",
      args: { canvas: doc.root, id, x: index * 220, y: 0 }
    }))
  ]).doc;
  return doc;
}

/** A pointer event released over an element of the canvas. */
function releasedOn(id) {
  const node = document.createElement("div");
  node.className = "react-flow__node react-flow__node-node";
  node.dataset.id = id;
  const target = node.appendChild(document.createElement("span"));
  return { target, clientX: 640, clientY: 120 };
}
const releasedOnCanvas = () => ({ target: document.createElement("div"), clientX: 640, clientY: 360 });

afterEach(() => {
  act(() => editorStore.getState().close());
  editingStore.getState().reset();
});

describe("connecting by dragging", () => {
  it("connects the box the drag started from to the box it ends on, and asks when the transition happens", () => {
    act(() => editorStore.getState().open(machine()));
    const { result } = renderHook(() => useConnect(t, flow));
    act(() => result.current.onConnectStart(null, { nodeId: "nod_firstState" }));
    expect(result.current.from).toBe("nod_firstState");
    act(() => result.current.onConnectEnd(releasedOn("nod_paid"), { fromNode: { id: "nod_firstState" } }));
    const { doc, history, view } = editorStore.getState();
    const [edgeId] = Object.keys(doc.canvases[doc.root].edges).filter(
      id => doc.canvases[doc.root].edges[id].to === "nod_paid"
    );
    expect(edgeId).toBe("edg_openPaid");
    expect(history.past.map(entry => entry.label)).toEqual(["editing.connect"]);
    expect(view.selections[doc.root]).toEqual([edgeId]);
    expect(editingStore.getState().editor).toEqual({ type: "trigger", edgeId });
    expect(result.current.from).toBeNull();
  });

  it("says why a connection is refused where it ends", () => {
    act(() => editorStore.getState().open(machine()));
    const { result } = renderHook(() => useConnect(t, flow));
    act(() => result.current.onConnectEnd(releasedOn("nod_initial"), { fromNode: { id: "nod_paid" } }));
    expect(editingStore.getState().refusal).toMatchObject({ reason: "intoStart", at: { x: 640, y: 120 } });
    expect(Object.keys(editorStore.getState().doc.canvases[editorStore.getState().doc.root].edges)).toHaveLength(1);
  });

  it("connects a box to itself when the drag ends back on it, as the inspector can", () => {
    act(() => editorStore.getState().open(machine()));
    const { result } = renderHook(() => useConnect(t, flow));
    act(() => result.current.onConnectEnd(releasedOn("nod_paid"), { fromNode: { id: "nod_paid" } }));
    const { doc } = editorStore.getState();
    const loops = Object.entries(doc.canvases[doc.root].edges).filter(
      ([, edge]) => edge.from === "nod_paid" && edge.to === "nod_paid"
    );
    expect(loops).toHaveLength(1);
    expect(editingStore.getState().editor).toEqual({ type: "trigger", edgeId: loops[0][0] });
  });

  it("makes nothing of a click on a box's handle: only a drag back onto the box connects it to itself", () => {
    act(() => editorStore.getState().open(machine()));
    const { result } = renderHook(() => useConnect(t, flow));
    act(() => result.current.onConnectStart({ clientX: 640, clientY: 120 }, { nodeId: "nod_paid" }));
    act(() => result.current.onConnectEnd(releasedOn("nod_paid"), { fromNode: { id: "nod_paid" } }));
    const { doc } = editorStore.getState();
    expect(Object.values(doc.canvases[doc.root].edges).filter(edge => edge.from === "nod_paid")).toEqual([]);
    expect(editingStore.getState().editor).toBeNull();
  });

  it("refuses a drag that ends on a note or on a part inside a frame, instead of drafting a box over it", () => {
    act(() => editorStore.getState().open(machine()));
    const { result } = renderHook(() => useConnect(t, flow));
    for (const [kind, id] of [
      ["note", "not_reminder"],
      ["node", "nod_open/nod_inside"]
    ]) {
      const element = document.createElement("div");
      element.className = `react-flow__node react-flow__node-${kind}`;
      element.dataset.id = id;
      act(() =>
        result.current.onConnectEnd({ target: element, clientX: 640, clientY: 120 }, { fromNode: { id: "nod_paid" } })
      );
      expect(editingStore.getState().refusal).toMatchObject({ reason: "elsewhere" });
      expect(editingStore.getState().editor).toBeNull();
      editingStore.getState().reset();
    }
  });

  it("drafts a new box of the level's kind where a drag ends on empty canvas, connected from where it started", () => {
    act(() => editorStore.getState().open(machine()));
    const { result } = renderHook(() => useConnect(t, flow));
    act(() => result.current.onConnectEnd(releasedOnCanvas(), { fromNode: { id: "nod_paid" } }));
    expect(editingStore.getState().editor).toEqual({
      type: "draft",
      tool: "state",
      at: { x: 640, y: 360 },
      from: "nod_paid"
    });
  });

  it("names the new box in place, adds it with its transition as one change, then asks when it happens", async () => {
    const user = userEvent.setup();
    const doc = machine();
    act(() => editorStore.getState().open(doc));
    render(<Canvas />);
    act(() => editingStore.getState().open({ type: "draft", tool: "state", at: { x: 900, y: 200 }, from: "nod_paid" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "refunded{Enter}");
    const { doc: after, history } = editorStore.getState();
    const [id] = Object.keys(after.canvases[doc.root].nodes).filter(key => !doc.canvases[doc.root].nodes[key]);
    const [edgeId, edge] = Object.entries(after.canvases[doc.root].edges).find(([, item]) => item.to === id);
    expect(edge).toEqual({ from: "nod_paid", to: id });
    expect(history.past).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "When does Paid go to refunded?" })).toBeTruthy();
    expect(editingStore.getState().editor).toEqual({ type: "trigger", edgeId });
  });

  it("offers no handle on a terminal state, and none in a read-only tab", async () => {
    const doc = machine();
    act(() => editorStore.getState().open(doc));
    const { container, unmount } = render(<Canvas />);
    await act(async () => {});
    const handle = id => container.querySelector(`.react-flow__node[data-id="${id}"] .react-flow__handle-right`);
    expect(handle("nod_paid").classList.contains("sw-start")).toBe(true);
    expect(handle("nod_closed").classList.contains("sw-start")).toBe(false);
    expect(handle("nod_initial").classList.contains("sw-start")).toBe(false);
    unmount();
    act(() => editorStore.getState().open(doc, { readOnly: true }));
    const again = render(<Canvas />);
    await act(async () => {});
    expect(again.container.querySelector(".sw-start")).toBeNull();
  });
});
