// Large documents for the performance budgets (spec §9): 300 boxes on one level, and about 2,000 elements across
// levels — every box placed, so what is measured is the editor, not a first arrangement.
import { applyBatch, createDocument, sign, stringify } from "statewright";
import { reachedOf, start, step } from "statewright/simulate";

const COLUMNS = 20;
const at = index => ({ x: (index % COLUMNS) * 200, y: Math.floor(index / COLUMNS) * 110 });

/** `count` boxes of a kind in rows on one level, each connected to the next, placed. */
function boxes(canvas, kind, count, prefix) {
  const ids = Array.from({ length: count }, (_, index) => `nod_${prefix}${index}`);
  return [
    ...ids.map((id, index) => ({ type: "node.add", args: { canvas, id, node: { kind, name: `${prefix} ${index}` } } })),
    ...ids.slice(1).map((id, index) => ({
      type: "edge.add",
      args: { canvas, edge: { from: ids[index], to: id, ...(kind === "service" && { kind: "command" }) } }
    })),
    ...ids.map((id, index) => ({ type: "layout.node.set", args: { canvas, id, ...at(index) } }))
  ];
}

/** The document as a file Statewright signed, so it opens without a review. */
const file = async doc => stringify(await sign(doc, { channel: "api", name: "statewright-budgets" }));

/** One level of `count` services, all on screen at once when the level is fitted. */
export async function manyBoxes(count = 300) {
  const doc = createDocument({ name: "Many boxes" });
  return file(applyBatch(doc, boxes(doc.root, "service", count, "box")).doc);
}

/** `levels` services, each holding a machine of `states` states in a chain: about 2,000 elements. */
export async function manyElements(levels = 10, states = 100) {
  const doc = createDocument({ name: "Many elements" });
  const commands = boxes(doc.root, "service", levels, "service");
  for (let level = 0; level < levels; level += 1) {
    const canvas = `cnv_machine${level}`;
    commands.push(
      {
        type: "canvas.create",
        args: { kind: "machine", name: `Machine ${level}`, id: canvas, owner: `nod_service${level}` }
      },
      ...boxes(canvas, "state", states, `m${level}s`)
    );
  }
  return file(applyBatch(doc, commands).doc);
}

/**
 * As `manyElements`, each machine running on go.next from an initial node, with a scenario of `steps` steps recorded
 * on it (simulator spec §11: "Problems with every scenario of a 2,000-element document within the existing 300 ms").
 */
export async function manyScenarios(levels = 10, states = 100, steps = 30) {
  const doc = createDocument({ name: "Many scenarios" });
  const commands = [
    { type: "catalog.add", args: { collection: "events", id: "evt_next", item: { name: "go.next" } } },
    ...boxes(doc.root, "service", levels, "service")
  ];
  for (let level = 0; level < levels; level += 1) {
    const canvas = `cnv_machine${level}`;
    commands.push(
      {
        type: "canvas.create",
        args: { kind: "machine", name: `Machine ${level}`, id: canvas, owner: `nod_service${level}` }
      },
      ...boxes(canvas, "state", states, `m${level}s`).map(command =>
        command.type === "edge.add" ?
          { ...command, args: { ...command.args, edge: { ...command.args.edge, on: ["evt_next"] } } }
        : command
      ),
      { type: "node.add", args: { canvas, id: `nod_m${level}start`, node: { kind: "initial" } } },
      { type: "layout.node.set", args: { canvas, id: `nod_m${level}start`, x: -120, y: 20 } },
      { type: "edge.add", args: { canvas, edge: { from: `nod_m${level}start`, to: `nod_m${level}s0` } } }
    );
  }
  const built = applyBatch(doc, commands).doc;
  const scenarios = [];
  for (let level = 0; level < levels; level += 1) {
    const at = "2026-01-05T09:00:00Z";
    let { session } = start(built, { canvas: `cnv_machine${level}`, at });
    const recorded = [];
    for (let index = 0; index < steps; index += 1) {
      session = step(built, session, { do: { event: "evt_next" } }).session;
      recorded.push({ do: { event: "evt_next" }, reached: reachedOf(session) });
    }
    scenarios.push({
      type: "scenario.add",
      args: {
        scenario: { name: `Machine ${level} goes on`, canvas: `cnv_machine${level}`, start: { at }, steps: recorded }
      }
    });
  }
  return file(applyBatch(built, scenarios).doc);
}

/** A machine of `count` states in a chain, each going on to the next on go.next, every box placed. */
export async function manyStates(count = 300) {
  const doc = createDocument({ name: "Many states" });
  doc.canvases[doc.root] = { kind: "machine", name: "Chain", nodes: { nod_start: { kind: "initial" } }, edges: {} };
  const canvas = doc.root;
  const ids = Array.from({ length: count }, (_, index) => `nod_s${index}`);
  const commands = [
    { type: "catalog.add", args: { collection: "events", id: "evt_next", item: { name: "go.next" } } },
    ...ids.map((id, index) => ({ type: "node.add", args: { canvas, id, node: { kind: "state", name: `s${index}` } } })),
    { type: "edge.add", args: { canvas, edge: { from: "nod_start", to: ids[0] } } },
    ...ids.slice(1).map((id, index) => ({
      type: "edge.add",
      args: { canvas, edge: { from: ids[index], to: id, on: ["evt_next"] } }
    })),
    { type: "layout.node.set", args: { canvas, id: "nod_start", x: -80, y: 30 } },
    ...ids.map((id, index) => ({ type: "layout.node.set", args: { canvas, id, ...at(index) } }))
  ];
  return file(applyBatch(doc, commands).doc);
}
