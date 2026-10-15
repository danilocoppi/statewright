import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../i18n.js";

import { beaconStore, BEACON_MS, beacon, lightBeacon } from "@/canvas/beacon";
import { followRef, followSelection, followStore, resolveTarget, returnFromRef, watchFollows } from "@/canvas/follow";
import { catalogStore } from "@/catalog/state";
import { inspectorStore } from "@/inspector/state";
import { editorStore } from "@/store/editor";
import { useToastStore } from "@/stores/toast";

import { linkedPayments } from "../fixtures.js";

let stop;
beforeEach(async () => {
  editorStore.getState().open(await linkedPayments(), { canvasId: "cnv_expiryClock" });
  stop = watchFollows();
});
afterEach(() => {
  stop();
  editorStore.getState().close();
  catalogStore.getState().close();
  inspectorStore.getState().reset();
  beaconStore.setState({ asked: null, lit: null });
  useToastStore.setState({ items: [] });
  vi.useRealTimers();
});

const state = () => editorStore.getState();

describe("where a link leads", () => {
  it("resolves a node or an edge to its level, a level to itself, a reusable part to its body", () => {
    const { doc } = state();
    expect(resolveTarget(doc, "nod_complianceHold")).toEqual({
      kind: "element",
      canvas: "cnv_lifecycle",
      id: "nod_complianceHold"
    });
    expect(resolveTarget(doc, "edg_complianceStart")).toEqual({
      kind: "element",
      canvas: "cnv_lifecycle",
      id: "edg_complianceStart"
    });
    expect(resolveTarget(doc, "cnv_runtime")).toEqual({ kind: "canvas", canvas: "cnv_runtime" });
    expect(resolveTarget(doc, "rgn_compliance")).toEqual({ kind: "canvas", canvas: "cnv_lifecycle" });
    expect(resolveTarget(doc, "def_crossBorderSend")).toEqual({
      kind: "definition",
      definition: "def_crossBorderSend",
      canvas: "cnv_crossBorderSend"
    });
  });

  it("resolves a catalog item to its collection, the project to its details, and anything else to missing", () => {
    const { doc } = state();
    expect(resolveTarget(doc, "evt_holdOpened")).toEqual({
      kind: "catalog",
      collection: "events",
      item: "evt_holdOpened"
    });
    expect(resolveTarget(doc, "prj_payments")).toEqual({ kind: "details", id: "prj_payments" });
    expect(resolveTarget(doc, "nod_removedLongAgo")).toEqual({ kind: "missing", id: "nod_removedLongAgo" });
  });
});

describe("following a link", () => {
  it("to a box on another level: shows that level, selects the box, brings it into view and lights it", () => {
    expect(followRef("nod_toHold")).toBe(true);
    expect(state().canvasId).toBe("cnv_lifecycle");
    expect(state().view.selections.cnv_lifecycle).toEqual(["nod_complianceHold"]);
    expect(state().view.reveal).toEqual({ canvasId: "cnv_lifecycle", id: "nod_complianceHold" });
    expect(beaconStore.getState().asked).toEqual({ canvasId: "cnv_lifecycle", ids: ["nod_complianceHold"] });
    // The link stays selected where it is, for the way back.
    expect(state().view.selections.cnv_expiryClock).toEqual(["nod_toHold"]);
    expect(followStore.getState().trail).toEqual([{ from: "cnv_expiryClock", ref: "nod_toHold", to: "cnv_lifecycle" }]);
  });

  it("to a box on the same level: selects it, brings it into view and lights it, with no way back to keep", () => {
    followRef("nod_toPaused");
    expect(state().canvasId).toBe("cnv_expiryClock");
    expect(state().view.selections.cnv_expiryClock).toEqual(["nod_paused"]);
    expect(state().view.reveal).toEqual({ canvasId: "cnv_expiryClock", id: "nod_paused" });
    expect(beaconStore.getState().asked).toEqual({ canvasId: "cnv_expiryClock", ids: ["nod_paused"] });
    expect(followStore.getState().trail).toEqual([]);
  });

  it("to a level, or to a reusable part's body: opens it", () => {
    followRef("nod_toRuntime");
    expect(state().canvasId).toBe("cnv_runtime");
    expect(beaconStore.getState().asked).toBeNull();
    returnFromRef();
    followRef("nod_toPart");
    expect(state().canvasId).toBe("cnv_crossBorderSend");
  });

  it("to a catalog item: opens the catalog on it; to the project: shows its details", () => {
    followRef("nod_toEvent");
    expect(catalogStore.getState()).toMatchObject({ open: true, collection: "events", item: "evt_holdOpened" });
    expect(state().canvasId).toBe("cnv_expiryClock");
    followRef("nod_toProject");
    expect(inspectorStore.getState().focus).toBe("prj_payments");
  });

  it("whose target no longer exists: says so, and does nothing else", () => {
    state().select(["nod_paused"]);
    expect(followRef("nod_toGone")).toBe(true);
    expect(useToastStore.getState().items.map(item => item.message)).toEqual([
      "What this link led to is no longer in the project."
    ]);
    expect(state().canvasId).toBe("cnv_expiryClock");
    expect(state().view.selections.cnv_expiryClock).toEqual(["nod_paused"]);
    expect(beaconStore.getState().asked).toBeNull();
  });

  it("is only for links: any other box is left to its own keys", () => {
    expect(followRef("nod_paused")).toBe(false);
    expect(followRef("nod_nope")).toBe(false);
    expect(state().canvasId).toBe("cnv_expiryClock");
  });

  it("follows the one link selected, and nothing when the selection is not one link", () => {
    state().select(["nod_toHold", "nod_paused"]);
    expect(followSelection()).toBe(false);
    state().select(["nod_toHold"]);
    expect(followSelection()).toBe(true);
    expect(state().canvasId).toBe("cnv_lifecycle");
  });
});

describe("the way back from a link", () => {
  it("goes back to the level the link is on, with the link selected", () => {
    followRef("nod_toHold");
    state().select([]);
    expect(returnFromRef()).toBe(true);
    expect(state().canvasId).toBe("cnv_expiryClock");
    expect(state().view.selections.cnv_expiryClock).toEqual(["nod_toHold"]);
    expect(followStore.getState().trail).toEqual([]);
    expect(returnFromRef()).toBe(false);
  });

  it("goes back link by link along a chain of links", () => {
    followRef("nod_toRuntime");
    followRef("nod_toClock");
    expect(state().canvasId).toBe("cnv_expiryClock");
    expect(returnFromRef()).toBe(true);
    expect(state().canvasId).toBe("cnv_runtime");
    expect(state().view.selections.cnv_runtime).toEqual(["nod_toClock"]);
    expect(returnFromRef()).toBe(true);
    expect(state().canvasId).toBe("cnv_expiryClock");
    expect(state().view.selections.cnv_expiryClock).toEqual(["nod_toRuntime"]);
  });

  it("is forgotten once the person leaves the level the link led to any other way", () => {
    followRef("nod_toHold");
    state().setCanvas("cnv_runtime");
    expect(followStore.getState().trail).toEqual([]);
    state().setCanvas("cnv_lifecycle");
    expect(returnFromRef()).toBe(false);
  });
});

describe("the beacon", () => {
  it("waits for its level to be shown, then lights what it shows for two seconds", () => {
    vi.useFakeTimers();
    beacon("cnv_lifecycle", ["nod_complianceHold"]);
    lightBeacon("cnv_expiryClock");
    expect(beaconStore.getState().lit).toBeNull();
    lightBeacon("cnv_lifecycle");
    expect(beaconStore.getState()).toMatchObject({
      asked: null,
      lit: { canvasId: "cnv_lifecycle", ids: ["nod_complianceHold"] }
    });
    vi.advanceTimersByTime(BEACON_MS - 1);
    expect(beaconStore.getState().lit).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(beaconStore.getState().lit).toBeNull();
  });

  it("lit again before it went out, it lasts two seconds from then", () => {
    vi.useFakeTimers();
    beacon("cnv_lifecycle", ["nod_complianceHold"]);
    lightBeacon("cnv_lifecycle");
    vi.advanceTimersByTime(1500);
    beacon("cnv_lifecycle", ["nod_expiryClock"]);
    lightBeacon("cnv_lifecycle");
    vi.advanceTimersByTime(1500);
    expect(beaconStore.getState().lit).toMatchObject({ ids: ["nod_expiryClock"] });
    vi.advanceTimersByTime(500);
    expect(beaconStore.getState().lit).toBeNull();
  });
});
