import { describe, expect, it } from "vitest";

import { entriesOf, levelPath, search } from "@/palette/search";

import { readExample } from "../fixtures.js";
import i18n from "../i18n.js";

const t = i18n.t.bind(i18n);

describe("what ⌘K finds", () => {
  it("knows every box and arrow of every level with its path, the catalog's items with their uses, the levels", () => {
    const doc = readExample("payments");
    const { elements, catalog, levels } = entriesOf(t, doc);
    expect(levelPath(doc, "cnv_lifecycle")).toBe("Payments / Runtime / Lifecycle engine");
    expect(elements.find(entry => entry.id === "nod_scheduler")).toMatchObject({
      kind: "Service",
      name: "Scheduler",
      meta: "Payments / Runtime",
      canvas: "cnv_runtime"
    });
    const arrow = elements.find(entry => entry.kind === "Arrow" && entry.canvas === "cnv_runtime");
    expect(arrow.name).toContain(" → ");
    const event = catalog.find(entry => entry.collection === "events");
    expect(event).toMatchObject({ kind: "Event", mono: true });
    expect(event.meta).toMatch(/used|not used/);
    expect(levels.map(entry => entry.id)).toEqual(Object.keys(doc.canvases));
  });

  it("puts what starts with the words first, a few of each group, and the levels and commands when nothing is typed", () => {
    const doc = readExample("payments");
    const commands = [
      { id: "layout", name: "Lay out this level again", keys: "⇧L", run() {} },
      { id: "catalog", name: "Open the catalog", keys: "G", run() {} }
    ];
    const groups = { ...entriesOf(t, doc), commands };
    const found = search(groups, "sched");
    expect(found[0]).toMatchObject({ group: "elements" });
    expect(found[0].items[0].name).toBe("Scheduler");
    expect(search(groups, "catalog").at(-1)).toEqual({ group: "commands", items: [commands[1]] });
    expect(search(groups, "").map(result => result.group)).toEqual(["levels", "commands"]);
    expect(search(groups, "o").every(result => result.items.length <= 6)).toBe(true);
    expect(search(groups, "zzzz")).toEqual([]);
  });
});
