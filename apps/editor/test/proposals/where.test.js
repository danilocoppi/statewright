// Where a change of a proposal is seen (collaboration spec §7): the level to go to and what rings there — the element
// itself, the path a scenario runs, the elements that use a catalog item — or the catalog, for an item nobody uses.
import { describe, expect, it } from "vitest";

import { whereIs } from "@/proposals/where";

import { readExample } from "../fixtures.js";

const doc = readExample("payments");

describe("where a change is seen", () => {
  it("shows a box or an arrow on its level, itself", () => {
    expect(whereIs(doc, "nod_elapsed")).toEqual({ level: "cnv_expiryClock", ids: ["nod_elapsed"] });
  });

  it("shows a level as itself", () => {
    expect(whereIs(doc, "cnv_expiryClock")).toEqual({ level: "cnv_expiryClock", ids: [] });
  });

  it("shows a scenario on the level where its run goes most, with the states and transitions it takes there", () => {
    const where = whereIs(doc, "scn_paysInTime");
    expect(where.level).toBe("cnv_crossBorderSend");
    expect(where.ids).toEqual(
      expect.arrayContaining(["edg_awaitingFundsConverting", "edg_convertingPayingOut", "edg_payingOutCompleted"])
    );
    const level = doc.canvases.cnv_crossBorderSend;
    const { from, to } = level.edges.edg_convertingPayingOut;
    expect(where.ids).toEqual(expect.arrayContaining([from, to]));
    expect(where.ids.every(id => level.nodes[id] || level.edges[id])).toBe(true);
  });

  it("shows a catalog item through the elements that use it, and opens one nobody uses in the catalog", () => {
    expect(whereIs(doc, "evt_legCompleted")).toEqual({
      level: "cnv_crossBorderSend",
      ids: ["edg_convertingPayingOut"]
    });
    const unused = structuredClone(doc);
    unused.catalog.events.evt_nobody = { name: "nobody" };
    expect(whereIs(unused, "evt_nobody")).toEqual({
      level: null,
      ids: [],
      catalog: { collection: "events", item: "evt_nobody" }
    });
  });
});
