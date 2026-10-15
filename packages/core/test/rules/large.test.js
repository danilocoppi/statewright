import { describe, expect, it } from "vitest";
import { applyBatch } from "../../src/commands/engine.js";
import { createDocument } from "../../src/create.js";
import { check } from "../../src/rules/index.js";

/** A machine of `count` states in a ring, with `any` nodes in it (performance spec §2). */
function bigMachine(count) {
  const doc = createDocument({ name: "Big machine" });
  doc.catalog.events = { evt_next: { name: "go.next" }, evt_stop: { name: "stop" } };
  const nodes = {
    nod_init: { kind: "initial" },
    nod_anyA: { kind: "any" },
    nod_anyB: { kind: "any", except: ["nod_s1"] }
  };
  const edges = {
    edg_init: { from: "nod_init", to: "nod_s0" },
    edg_anyA: { from: "nod_anyA", to: "nod_s0", on: ["evt_stop"] },
    edg_anyB: { from: "nod_anyB", to: "nod_s2", on: ["evt_stop"] }
  };
  for (let index = 0; index < count; index += 1) {
    nodes[`nod_s${index}`] = { kind: "state", name: `s${index}` };
    edges[`edg_n${index}`] = { from: `nod_s${index}`, to: `nod_s${(index + 1) % count}`, on: ["evt_next"] };
  }
  doc.canvases = { [doc.root]: { kind: "machine", name: "Ring", nodes, edges } };
  return applyBatch(doc, []).doc;
}

describe("Problems of a large machine (performance spec §2)", () => {
  it("are found in time linear in its size", () => {
    check(bigMachine(300));
    const doc = bigMachine(3000);
    const start = performance.now();
    const problems = check(doc);
    expect(performance.now() - start).toBeLessThan(400);
    // Every state is reachable and has a way out; the two `any` nodes make every state's stop ambiguous but s1's.
    expect(problems.filter(problem => problem.code === "machine.ambiguous").length).toBe(2999);
  });
});
