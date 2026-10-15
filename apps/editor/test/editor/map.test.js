import { describe, expect, it } from "vitest";

import { filterMap, projectMap } from "@/features/editor/map";
import { levelPathOf } from "@/lib/derived";

import { readExample } from "../fixtures.js";

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);

/** Payments with an unused definition and a level nothing reaches, holding one more inside it. */
function withLoose() {
  const doc = structuredClone(readExample("payments"));
  doc.canvases.cnv_spare = { kind: "flow", name: "Spare", nodes: {}, edges: {} };
  doc.definitions.def_spare = { kind: "flow", name: "Spare", canvas: "cnv_spare" };
  doc.canvases.cnv_lost = {
    kind: "system",
    name: "Lost",
    nodes: { nod_box: { kind: "service", name: "Box", inner: { canvas: "cnv_lostInside" } } },
    edges: {}
  };
  doc.canvases.cnv_lostInside = { kind: "flow", name: "Inside", nodes: {}, edges: {} };
  return doc;
}

describe("the project map", () => {
  it("lists the levels from the top, then definitions, then the levels nothing reaches", () => {
    const sections = projectMap(t, withLoose());
    expect(sections.map(section => section.key)).toEqual(["levels", "definitions", "unattached"]);
    const [root] = sections[0].levels;
    expect(root).toMatchObject({ canvas: "cnv_runtime", name: "Runtime", kind: "system", count: 8 });
    const engine = root.elements.find(element => element.id === "nod_lifecycleEngine");
    expect(engine).toMatchObject({ name: "Lifecycle engine", kind: "service" });
    expect(engine.level).toMatchObject({ canvas: "cnv_lifecycle", kind: "machine" });
    expect(sections[2].levels.map(level => level.canvas)).toEqual(["cnv_lost"]);
    expect(sections[2].levels[0].elements[0].level.canvas).toBe("cnv_lostInside");
  });

  it("leaves out initial nodes, which have no name of their own", () => {
    const [levels] = projectMap(t, withLoose());
    const lifecycle = levels.levels[0].elements.find(element => element.id === "nod_lifecycleEngine").level;
    expect(lifecycle.elements.map(element => element.id)).toEqual([
      "nod_complianceHold",
      "nod_expiryClock",
      "nod_sendCrossBorder"
    ]);
    expect(lifecycle.count).toBe(3);
  });

  it("says where each definition is used, and when it is not", () => {
    const definitions = projectMap(t, withLoose()).find(section => section.key === "definitions").levels;
    const clock = definitions.find(level => level.definition === "def_expiryClock");
    expect(clock.uses).toEqual([
      { id: "nod_expiryClock", name: "expiry_clock", canvas: "cnv_lifecycle", level: "Lifecycle engine" }
    ]);
    expect(definitions.find(level => level.definition === "def_spare").uses).toEqual([]);
  });

  it("gives every level a key of its own, even a definition body shown in two places", () => {
    const keys = [];
    const walk = level => {
      keys.push(level.key);
      for (const element of level.elements) if (element.level) walk(element.level);
    };
    for (const section of projectMap(t, withLoose())) section.levels.forEach(walk);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps, for what is typed, the elements and levels that match and the way down to them", () => {
    const found = filterMap(projectMap(t, withLoose()), "paused");
    expect(found.map(section => section.key)).toEqual(["levels", "definitions"]);
    const [root] = found[0].levels;
    expect(root.elements.map(element => element.id)).toEqual(["nod_lifecycleEngine"]);
    const lifecycle = root.elements[0].level;
    expect(lifecycle.elements.map(element => element.id)).toEqual(["nod_expiryClock"]);
    expect(lifecycle.elements[0].level.elements.map(element => element.id)).toEqual(["nod_paused"]);
    expect(root.open).toBe(true);
    // A level found by its own name keeps all its elements, closed.
    const [lost] = filterMap(projectMap(t, withLoose()), "lost")[0].levels;
    expect(lost).toMatchObject({ canvas: "cnv_lost", open: false });
    expect(lost.elements).toHaveLength(1);
    expect(filterMap(projectMap(t, withLoose()), "nothing like this")).toEqual([]);
  });
});

describe("the path to a level nothing reaches", () => {
  it("is the level alone", () => {
    expect(levelPathOf(withLoose(), "cnv_lostInside")).toEqual([
      { canvas: "cnv_lost", via: null, definition: null },
      { canvas: "cnv_lostInside", via: "nod_box", definition: null }
    ]);
  });
});
