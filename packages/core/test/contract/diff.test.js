// What changed between two contracts (source-of-truth spec §5, What changed): by ID, renames included.
import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/index.js";
import { diffContracts, toChangesMarkdown, toContract } from "../../src/contract/index.js";
import { parse } from "../../src/serialize/parse.js";
import { readExample } from "../helpers.js";

const bookings = () => parse(readExample("bookings.statewright.json")).doc;
const contractOf = async doc => (await toContract(doc)).contract;

describe("diffContracts (source-of-truth spec §5)", () => {
  it("finds nothing between a design's contract and itself", async () => {
    const contract = await contractOf(bookings());
    expect(diffContracts(contract, contract)).toEqual({ same: true, changes: [] });
    expect(toChangesMarkdown(diffContracts(contract, contract))).toBe("No changes: the contract is the design's.\n");
  });

  it("names what was added, removed and changed, a renamed state among them, by ID", async () => {
    const before = await contractOf(bookings());
    const after = await contractOf(
      applyBatch(bookings(), [
        { type: "node.update", args: { id: "nod_requested", set: { name: "pending" } } },
        {
          type: "node.add",
          args: {
            canvas: "cnv_booking",
            id: "nod_cancelled",
            node: { kind: "state", name: "cancelled", terminal: true }
          }
        },
        { type: "edge.remove", args: { id: "edg_confirmedNoShow" } },
        { type: "edge.update", args: { id: "edg_confirmedSeated", set: { intent: "failure" } } }
      ]).doc
    );
    const { same, changes } = diffContracts(before, after);
    expect(same).toBe(false);
    expect(changes).toContainEqual({
      change: "added",
      kind: "state",
      level: "cnv_booking",
      id: "nod_cancelled",
      name: "cancelled"
    });
    expect(changes).toContainEqual({
      change: "changed",
      kind: "state",
      level: "cnv_booking",
      id: "nod_requested",
      name: "pending",
      fields: ["name"],
      before: { name: "requested" },
      after: { name: "pending" }
    });
    expect(changes).toContainEqual({
      change: "removed",
      kind: "transition",
      level: "cnv_booking",
      id: "edg_confirmedNoShow"
    });
    expect(changes).toContainEqual({
      change: "changed",
      kind: "transition",
      level: "cnv_booking",
      id: "edg_confirmedSeated",
      fields: ["intent"],
      before: { intent: "happy" },
      after: { intent: "failure" }
    });
    // Its scenarios now expect `pending`, and the no-show one goes elsewhere.
    expect(changes).toContainEqual(
      expect.objectContaining({ change: "changed", kind: "vector", id: "scn_aBookingIsDeclined" })
    );
    expect(changes).toContainEqual({
      change: "added",
      kind: "stale",
      id: "scn_aGuestDoesNotCome",
      name: "A guest does not come"
    });
    const markdown = toChangesMarkdown({ same, changes });
    expect(markdown).toMatch(/^# What changed in the design\n\n/);
    expect(markdown).toContain("- **Added** state `cancelled` (`nod_cancelled`) in `cnv_booking`\n");
    expect(markdown).toContain("- **Renamed** state `requested` → `pending` (`nod_requested`) in `cnv_booking`\n");
    expect(markdown).toContain("- **Removed** transition `edg_confirmedNoShow` in `cnv_booking`\n");
    expect(markdown).toContain("- **Changed** transition `edg_confirmedSeated` in `cnv_booking`: `intent`\n");
    expect(markdown).toContain("- **Added** stale scenario `A guest does not come` (`scn_aGuestDoesNotCome`)\n");
  });

  it("says an element was named or unnamed, not renamed from or to nothing", async () => {
    const before = await contractOf(bookings());
    const named = await contractOf(
      applyBatch(bookings(), [{ type: "edge.update", args: { id: "edg_confirmedNoShow", set: { name: "go" } } }]).doc
    );
    const markdown = toChangesMarkdown(diffContracts(before, named));
    expect(markdown).toContain("- **Named** transition `go` (`edg_confirmedNoShow`) in `cnv_booking`\n");
    expect(markdown).not.toContain("undefined");
    const unnamed = toChangesMarkdown(diffContracts(named, before));
    expect(unnamed).toContain("- **Unnamed** transition `go` (`edg_confirmedNoShow`) in `cnv_booking`\n");
    expect(unnamed).not.toContain("undefined");
  });

  it("reports a level added or removed as one change, not each of its elements", async () => {
    const before = await contractOf(bookings());
    const after = await contractOf(
      applyBatch(bookings(), [
        { type: "canvas.create", args: { kind: "machine", name: "Table", id: "cnv_table", owner: "nod_sms" } }
      ]).doc
    );
    expect(diffContracts(before, after).changes).toEqual([
      { change: "added", kind: "machine", id: "cnv_table", name: "Table" }
    ]);
    expect(diffContracts(after, before).changes).toEqual([
      { change: "removed", kind: "machine", id: "cnv_table", name: "Table" }
    ]);
  });

  it("says the design changed elsewhere when only what code does not read changed", async () => {
    const before = await contractOf(bookings());
    const after = await contractOf(
      applyBatch(bookings(), [{ type: "node.update", args: { id: "nod_guest", set: { name: "Diner" } } }]).doc
    );
    const diff = diffContracts(before, after);
    expect(diff).toEqual({ same: false, changes: [{ change: "changed", kind: "source", fields: ["content"] }] });
    expect(toChangesMarkdown(diff)).toContain("- **Changed** the design outside its machines, flows and scenarios\n");
  });
});
