// Times Core's hot paths on large documents (performance spec §2): a batch of one command, removals, moves, Problems,
// a level's figure, serializing and signing. Prints one row per document; milliseconds, the median of 5 runs.
//
//   node scripts/bench-core.js [sys|mach|levels|airport ...]   (default: all)
import { readFileSync } from "node:fs";

import {
  applyBatch,
  buildIndex,
  check,
  collectRefs,
  createDocument,
  figureOf,
  parse,
  sign,
  stringify
} from "../packages/core/src/index.js";

const COLUMNS = 20;
const at = index => ({ x: (index % COLUMNS) * 200, y: Math.floor(index / COLUMNS) * 110 });
const EVENTS = { evt_next: { name: "go.next" }, evt_jump: { name: "go.jump" } };

/** One system level of `count` services, each joined to the next and to the one below. */
function systemLevel(count) {
  const doc = createDocument({ name: "Big system" });
  const canvas = doc.canvases[doc.root];
  const layout = { nodes: {} };
  for (let index = 0; index < count; index += 1) {
    canvas.nodes[`nod_b${index}`] = { kind: "service", name: `box ${index}`, summary: `does thing ${index}` };
    layout.nodes[`nod_b${index}`] = at(index);
    if (index > 0) canvas.edges[`edg_r${index}`] = { from: `nod_b${index - 1}`, to: `nod_b${index}`, kind: "command" };
    if (index >= COLUMNS) {
      canvas.edges[`edg_d${index}`] = { from: `nod_b${index - COLUMNS}`, to: `nod_b${index}`, kind: "command" };
    }
  }
  doc.layout = { canvases: { [doc.root]: layout } };
  return { doc, level: doc.root, node: `nod_b${Math.floor(count / 2)}`, prefix: "nod_b" };
}

/** A machine of `count` states, each going on to the next and jumping a row ahead. */
function machineCanvas(prefix, count, name) {
  const nodes = { [`nod_${prefix}init`]: { kind: "initial" } };
  const edges = { [`edg_${prefix}init`]: { from: `nod_${prefix}init`, to: `nod_${prefix}s0` } };
  const layout = { nodes: { [`nod_${prefix}init`]: { x: -120, y: 20 } } };
  for (let index = 0; index < count; index += 1) {
    nodes[`nod_${prefix}s${index}`] = { kind: "state", name: `s${index}` };
    layout.nodes[`nod_${prefix}s${index}`] = at(index);
    const next = `nod_${prefix}s${(index + 1) % count}`;
    const jump = `nod_${prefix}s${(index + COLUMNS) % count}`;
    edges[`edg_${prefix}n${index}`] = { from: `nod_${prefix}s${index}`, to: next, on: ["evt_next"] };
    edges[`edg_${prefix}j${index}`] = { from: `nod_${prefix}s${index}`, to: jump, on: ["evt_jump"] };
  }
  return { canvas: { kind: "machine", name, nodes, edges }, layout };
}

function machineLevel(count) {
  const doc = createDocument({ name: "Big machine" });
  doc.catalog.events = { ...EVENTS };
  const { canvas, layout } = machineCanvas("m", count, "Chain");
  doc.canvases = { [doc.root]: canvas };
  doc.layout = { canvases: { [doc.root]: layout } };
  return { doc, level: doc.root, node: `nod_ms${Math.floor(count / 2)}`, prefix: "nod_ms" };
}

function manyLevels(levels, per = 100) {
  const doc = createDocument({ name: "Many levels" });
  doc.catalog.events = { ...EVENTS };
  const root = doc.canvases[doc.root];
  doc.layout = { canvases: { [doc.root]: { nodes: {} } } };
  for (let level = 0; level < levels; level += 1) {
    const id = `cnv_lvl${level}`;
    root.nodes[`nod_svc${level}`] = { kind: "service", name: `svc ${level}`, inner: { canvas: id } };
    doc.layout.canvases[doc.root].nodes[`nod_svc${level}`] = at(level);
    const { canvas, layout } = machineCanvas(`l${level}`, per, `Machine ${level}`);
    doc.canvases[id] = canvas;
    doc.layout.canvases[id] = layout;
  }
  return { doc, level: "cnv_lvl0", node: "nod_l0s50", prefix: "nod_l0s" };
}

function airport() {
  const text = readFileSync(new URL("../examples/airport-operations.sttw", import.meta.url), "utf8");
  return { doc: parse(text).doc, level: "cnv_beltNetwork", node: "nod_mainLineA3", prefix: "nod_collectorA1x" };
}

async function time(fn, runs = 5) {
  await fn();
  const times = [];
  for (let run = 0; run < runs; run += 1) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b)[Math.floor(runs / 2)];
}

const CASES = {
  sys: [300, 1000, 3000].map(count => [`system ${count}`, () => systemLevel(count)]),
  mach: [300, 1000, 3000].map(count => [`machine ${count}`, () => machineLevel(count)]),
  levels: [10, 30, 100].map(count => [`${count} levels × 100`, () => manyLevels(count)]),
  airport: [["airport", airport]]
};

const chosen = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
const rows = [];
for (const [name, make] of chosen.flatMap(key => CASES[key])) {
  const made = make();
  const doc = applyBatch(made.doc, []).doc;
  const { level, node, prefix } = made;
  const layout = doc.layout.canvases[level].nodes;
  const ids = Object.keys(layout).filter(id => id.startsWith(prefix));
  const row = { document: name, elements: buildIndex(structuredClone(doc)).entries.size };
  row.index = await time(() => buildIndex(structuredClone(doc)), 3);
  row.refs = await time(() => collectRefs(structuredClone(doc)), 3);
  row.rename = await time(() => applyBatch(doc, [{ type: "node.update", args: { id: node, set: { name: "x" } } }]));
  row.move = await time(() =>
    applyBatch(doc, [{ type: "layout.node.set", args: { canvas: level, id: node, x: 5000, y: 5000 } }])
  );
  row.remove = await time(() => applyBatch(doc, [{ type: "node.remove", args: { id: node } }]));
  row.remove10 = await time(
    () =>
      applyBatch(
        doc,
        ids.slice(0, 10).map(id => ({ type: "node.remove", args: { id, cascade: true } }))
      ),
    3
  );
  row.move100 = await time(
    () =>
      applyBatch(
        doc,
        ids.slice(0, 100).map((id, index) => ({ type: "layout.node.set", args: { canvas: level, id, x: index, y: 9 } }))
      ),
    3
  );
  row.check = await time(() => check(doc), 3);
  row.figure = await time(() => figureOf(doc, level, {}), 3);
  row.stringify = await time(() => stringify(doc), 3);
  row.sign = await time(() => sign(doc, { channel: "cli" }), 3);
  rows.push(row);
  const cells = Object.entries(row).map(([key, value]) =>
    typeof value === "number" && key !== "elements" ?
      `${key} ${value < 10 ? value.toFixed(1) : value.toFixed(0)}`
    : `${key} ${value}`
  );
  console.log(cells.join(" · "));
}
