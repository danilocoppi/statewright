import { afterEach, describe, expect, it } from "vitest";

import { editorStore } from "@/store/editor";

import { readExample } from "../fixtures.js";

afterEach(() => editorStore.getState().close());

describe("the document open (performance spec §3 P2)", () => {
  it("cannot change, all the way down, so what is worked out from it is kept", () => {
    editorStore.getState().open(structuredClone(readExample("payments")));
    const { doc } = editorStore.getState();
    expect(Object.isFrozen(doc)).toBe(true);
    expect(Object.isFrozen(doc.canvases.cnv_expiryClock.nodes.nod_running)).toBe(true);
    expect(Object.isFrozen(doc.catalog.events)).toBe(true);
  });
});
