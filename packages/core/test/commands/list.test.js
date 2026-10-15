import { describe, expect, it } from "vitest";
import { listCommands } from "../../src/commands/index.js";

describe("listCommands", () => {
  it("covers every command of spec §21, and the scenario commands of the simulator spec (§4.4)", () => {
    expect(listCommands().map(command => command.type)).toEqual([
      "project.update",
      "catalog.add",
      "catalog.update",
      "catalog.remove",
      "canvas.mix",
      "canvas.create",
      "canvas.update",
      "canvas.remove",
      "region.add",
      "region.update",
      "region.remove",
      "node.add",
      "node.update",
      "node.remove",
      "edge.add",
      "edge.update",
      "edge.remove",
      "definition.create",
      "definition.extract",
      "definition.instantiate",
      "definition.detach",
      "definition.update",
      "definition.remove",
      "finding.upsert",
      "finding.remove",
      "findings.replace",
      "note.add",
      "note.update",
      "note.remove",
      "comment.add",
      "comment.reply",
      "comment.resolve",
      "comment.reopen",
      "comment.remove",
      "lock.add",
      "lock.remove",
      "focus.set",
      "lane.add",
      "lane.update",
      "lane.remove",
      "scenario.add",
      "scenario.update",
      "scenario.remove",
      "layout.node.set",
      "layout.edge.set",
      "layout.note.set",
      "layout.canvas.clear",
      "legend.labels.set"
    ]);
  });

  it("gives every command a description and an object args schema", () => {
    for (const command of listCommands()) {
      expect(command.description.length, command.type).toBeGreaterThan(10);
      expect(command.args.type, command.type).toBe("object");
    }
    expect(listCommands().find(command => command.type === "node.add").args.required).toEqual(["canvas", "node"]);
  });
});
