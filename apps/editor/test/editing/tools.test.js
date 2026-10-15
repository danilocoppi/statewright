import { applyBatch, createDocument } from "statewright";
import { describe, expect, it } from "vitest";

import { addNode } from "@/editing/changes";
import { idsFor } from "@/editing/ids";
import { NAME_REQUIRED, toolForKey, TOOLS, toolsFor } from "@/editing/tools";

/** A one-level project of a kind, for the tools to work on. */
function level(kind) {
  const doc = createDocument({ name: "Tools" });
  doc.canvases[doc.root] = { kind, name: "Tools", nodes: {}, edges: {} };
  return { doc, canvasId: doc.root };
}

describe("tools", () => {
  it("offers each kind of canvas its own tools, with Select first and Note last, as mockup 08 lists them", () => {
    const ids = kind => toolsFor(kind).map(tool => `${tool.id}:${tool.key}`);
    expect(ids("system")).toEqual([
      "select:V",
      "service:S",
      "actor:A",
      "store:D",
      "queue:Q",
      "external:X",
      "link:L",
      "note:N"
    ]);
    expect(ids("machine")).toEqual([
      "select:V",
      "state:S",
      "initial:I",
      "choice:C",
      "history:H",
      "any:Y",
      "entry:E",
      "link:L",
      "note:N"
    ]);
    expect(ids("flow")).toEqual([
      "select:V",
      "action:A",
      "if:F",
      "switch:W",
      "while:O",
      "wait:T",
      "parallel:P",
      "end:E",
      "note:N"
    ]);
  });

  it("finds a tool by its key, in either case, only on its own kind of canvas", () => {
    expect(toolForKey("machine", "s").id).toBe("state");
    expect(toolForKey("system", "S").id).toBe("service");
    expect(toolForKey("flow", "e").id).toBe("end");
    expect(toolForKey("system", "i")).toBeNull();
  });

  it("creates with every tool a node the format accepts on its canvas", () => {
    for (const [kind, tools] of Object.entries(TOOLS)) {
      const { doc, canvasId } = level(kind);
      const ids = idsFor(doc);
      const extra = { action: { action: "act_charge" }, level: { target: canvasId } };
      if (kind === "flow") doc.catalog.actions.act_charge = { name: "Charge" };
      for (const tool of tools.filter(item => item.node)) {
        const node = {
          ...tool.node,
          ...(tool.named || NAME_REQUIRED.has(tool.node.kind) ? { name: `New ${tool.id}` } : {}),
          ...(tool.needs ? extra[tool.needs] : {})
        };
        const { commands } = addNode(doc, canvasId, node, { x: 100, y: 100 }, ids);
        expect(() => applyBatch(doc, commands), `${kind}/${tool.id}`).not.toThrow();
      }
    }
  });
});
