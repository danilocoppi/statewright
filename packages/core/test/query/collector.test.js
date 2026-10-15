import { describe, expect, it } from "vitest";
import { collectRefs, createRefCollector } from "../../src/query/index.js";
import { flattenIssues } from "../../src/serialize/parse.js";
import { paymentsDoc } from "../helpers.js";

describe("createRefCollector", () => {
  it("collects the references of a single element at its document path", () => {
    const collect = createRefCollector();
    collect.edge("machine", "cnv_m", "edg_x", { from: "nod_a", to: "nod_b", on: ["evt_go"], after: "tmr_t" });
    expect(collect.refs.map(ref => [ref.field, ref.target, ref.path.join("/")])).toEqual([
      ["from", "nod_a", "canvases/cnv_m/edges/edg_x/from"],
      ["to", "nod_b", "canvases/cnv_m/edges/edg_x/to"],
      ["on", "evt_go", "canvases/cnv_m/edges/edg_x/on/0"],
      ["after", "tmr_t", "canvases/cnv_m/edges/edg_x/after"]
    ]);
  });

  it("only reads node regions on machine canvases", () => {
    const collect = createRefCollector();
    collect.node("system", "cnv_s", "nod_s", { kind: "service", region: "rgn_x" });
    expect(collect.refs).toEqual([]);
  });

  it("is what collectRefs uses for whole documents", () => {
    const doc = paymentsDoc();
    const collect = createRefCollector();
    collect.catalogItem("events", "evt_opsFail", doc.catalog.events.evt_opsFail);
    expect(collect.refs).toEqual(collectRefs(doc).filter(ref => ref.source === "evt_opsFail"));
  });
});

describe("flattenIssues", () => {
  it("prefixes paths", () => {
    expect(flattenIssues([{ code: "custom", path: ["name"], message: "bad" }], ["project"])).toEqual([
      { path: "/project/name", message: "bad" }
    ]);
  });
});
