// The audit's budget (AI interface spec §11): "`audit.report` on a document of 2,000 elements with ten scenarios
// within 1 s." Ten machines of 100 states in a chain, each with a scenario of 30 steps; the median of three runs.
import { describe, expect, it } from "vitest";
import { toAuditReport } from "../../src/audit/index.js";
import { applyBatch } from "../../src/commands/index.js";
import { createDocument } from "../../src/create.js";
import { reachedOf, start, step } from "../../src/simulate/index.js";

const LEVELS = 10;
const STATES = 100;
const STEPS = 30;

/** About 2,000 elements: ten services, each holding a machine whose states go on, one to the next, on go.next. */
function manyScenarios() {
  const doc = createDocument({ name: "Many scenarios" });
  const commands = [{ type: "catalog.add", args: { collection: "events", id: "evt_next", item: { name: "go.next" } } }];
  for (let level = 0; level < LEVELS; level += 1) {
    const canvas = `cnv_machine${level}`;
    const states = Array.from({ length: STATES }, (_, index) => `nod_m${level}s${index}`);
    commands.push(
      {
        type: "node.add",
        args: { canvas: doc.root, id: `nod_service${level}`, node: { kind: "service", name: `Service ${level}` } }
      },
      {
        type: "canvas.create",
        args: { kind: "machine", name: `Machine ${level}`, id: canvas, owner: `nod_service${level}` }
      },
      { type: "node.add", args: { canvas, id: `nod_m${level}start`, node: { kind: "initial" } } },
      ...states.map((id, index) => ({
        type: "node.add",
        args: { canvas, id, node: { kind: "state", name: `s${index}` } }
      })),
      { type: "edge.add", args: { canvas, edge: { from: `nod_m${level}start`, to: states[0] } } },
      ...states.slice(1).map((id, index) => ({
        type: "edge.add",
        args: { canvas, edge: { from: states[index], to: id, on: ["evt_next"] } }
      }))
    );
  }
  const built = applyBatch(doc, commands).doc;
  const scenarios = [];
  for (let level = 0; level < LEVELS; level += 1) {
    const at = "2026-01-05T09:00:00Z";
    let { session } = start(built, { canvas: `cnv_machine${level}`, at });
    const steps = [];
    for (let index = 0; index < STEPS; index += 1) {
      session = step(built, session, { do: { event: "evt_next" } }).session;
      steps.push({ do: { event: "evt_next" }, reached: reachedOf(session) });
    }
    const scenario = { name: `Machine ${level} goes on`, canvas: `cnv_machine${level}`, start: { at }, steps };
    scenarios.push({ type: "scenario.add", args: { scenario } });
  }
  return applyBatch(built, scenarios).doc;
}

describe("the audit's budget (AI interface spec §11)", () => {
  it("audits 2,000 elements with ten scenarios within 1 s", () => {
    const doc = manyScenarios();
    const elements = Object.values(doc.canvases).reduce(
      (sum, canvas) => sum + Object.keys(canvas.nodes).length + Object.keys(canvas.edges).length,
      0
    );
    expect(elements).toBeGreaterThanOrEqual(2000);
    const times = [0, 1, 2].map(() => {
      const begun = performance.now();
      toAuditReport(doc);
      return performance.now() - begun;
    });
    const median = [...times].sort((a, b) => a - b)[1];
    expect(median).toBeLessThan(1000);
  });
});
