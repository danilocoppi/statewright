import { describe, expect, it } from "vitest";
import { buildIndex } from "../../src/query/build-index.js";
import { collectRefs } from "../../src/query/refs.js";
import { canonicalize } from "../../src/serialize/canonical.js";
import { stringify } from "../../src/serialize/stringify.js";
import { paymentsDoc } from "../helpers.js";

describe("a document frozen only at its top (performance spec §3 P3)", () => {
  it("is written, hashed and indexed as it is now, not as it was", () => {
    const doc = Object.freeze(paymentsDoc());
    const text = stringify(doc);
    const canonical = canonicalize(doc);
    const index = buildIndex(doc);
    const refs = collectRefs(doc).length;
    doc.project.name = "Renamed";
    doc.canvases.cnv_expiryClock.nodes.nod_late = { kind: "state", name: "late" };
    doc.canvases.cnv_expiryClock.edges.edg_late = { from: "nod_running", to: "nod_late" };
    expect(stringify(doc)).not.toBe(text);
    expect(stringify(doc)).toContain('"name": "Renamed"');
    expect(canonicalize(doc)).not.toBe(canonical);
    expect(buildIndex(doc)).not.toBe(index);
    expect(buildIndex(doc).has("nod_late")).toBe(true);
    expect(collectRefs(doc).length).toBeGreaterThan(refs);
  });
});
