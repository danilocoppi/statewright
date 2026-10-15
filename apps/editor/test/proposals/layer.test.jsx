// @vitest-environment jsdom
import "../dom.js";
import "../flow.js";
import "../i18n.js";

import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connection } from "@/agent/connection";
import { editOperations } from "@/agent/edit";
import { Canvas } from "@/canvas/Canvas";
import { proposalsStore } from "@/proposals/store";
import { editorStore } from "@/store/editor";
import { handlers } from "@/workers/layout";

import { placedExample } from "../fixtures.js";

vi.mock("@/workers", async importOriginal => ({
  ...(await importOriginal()),
  layoutClient: () => ({ request: (type, payload) => handlers[type](payload) })
}));

const propose = args => editOperations["batch.apply"]({ agent: "claude-code" }, { label: "x", propose: true, ...args });
const drawn = kind => [...document.querySelectorAll(`[data-proposed="${kind}"]`)].map(part => part.dataset.id);

beforeEach(async () => {
  const doc = await placedExample("payments");
  act(() => {
    editorStore.getState().open(doc, { canvasId: "cnv_expiryClock" });
    connection.store.setState({ status: "connected", agent: "claude-code" });
    proposalsStore.setState({ send: async () => ({ id: "msg_1" }) });
  });
  render(<Canvas />);
});

afterEach(() =>
  act(() => {
    proposalsStore.getState().clear();
    connection.store.setState({ status: "off", agent: null });
    editorStore.getState().close();
  })
);

describe("a proposal drawn on the canvas (collaboration spec §7)", () => {
  it("draws what it adds where it would stand, what it removes and what it changes, only while shown", async () => {
    act(() => {
      propose({
        title: "Late payers",
        commands: [
          {
            type: "node.add",
            args: { canvas: "cnv_expiryClock", id: "nod_late", node: { kind: "state", name: "late" } }
          },
          { type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } },
          { type: "node.remove", args: { id: "nod_elapsed" } }
        ]
      });
    });
    expect(drawn("add")).toEqual([]);
    act(() => proposalsStore.getState().show("prp_1"));
    await waitFor(() => expect(drawn("add")).toEqual(["nod_late"]));
    const ghost = document.querySelector('[data-proposed="add"][data-id="nod_late"]');
    expect(Number.isFinite(Number(ghost.getAttribute("x")))).toBe(true);
    expect(drawn("remove")).toContain("nod_elapsed");
    expect(drawn("change")).toEqual(["nod_paused"]);
    act(() => proposalsStore.getState().show(null));
    expect(drawn("add")).toEqual([]);
    expect(drawn("remove")).toEqual([]);
  });

  it("draws nothing of a proposal on another level", async () => {
    act(() => {
      propose({
        title: "Elsewhere",
        commands: [{ type: "node.update", args: { id: "nod_complianceHold", set: { name: "x" } } }]
      });
      proposalsStore.getState().show("prp_1");
    });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(drawn("change")).toEqual([]);
  });
});
