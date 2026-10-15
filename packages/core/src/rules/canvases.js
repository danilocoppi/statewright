import { sorted } from "./facts.js";

/** Canvases may hold this many nodes before detail should move into a level (spec §22). */
const DENSE = 12;

/** Canvases entered from a canvas's nodes (own interiors and definition bodies). */
function childrenOf(facts, canvas) {
  return Object.values(canvas.nodes)
    .map(node => facts.interiorOf(node.inner))
    .filter(id => facts.doc.canvases[id]);
}

/** Every canvas reachable from `start` by entering nodes (not including `start` unless it is on a cycle). */
function reachable(facts, start) {
  const seen = new Set();
  const pending = childrenOf(facts, facts.doc.canvases[start]);
  while (pending.length) {
    const id = pending.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    pending.push(...childrenOf(facts, facts.doc.canvases[id]));
  }
  return seen;
}

/** Canvas rules (spec §22). */
export default [
  {
    code: "canvas.orphan",
    severity: "warning",
    description: "A non-root canvas is not referenced by any inner or definition.",
    check(facts, report) {
      for (const [id] of sorted(facts.doc.canvases)) {
        if (facts.owners.has(id)) continue;
        report({
          target: id,
          canvas: id,
          message: `${facts.describe(id)} is not the root, the interior of an element or a definition body`
        });
      }
    }
  },
  {
    code: "canvas.multiOwner",
    severity: "error",
    description: "A canvas is the interior of more than one owner (reuse goes through definitions).",
    check(facts, report) {
      for (const [id, owners] of facts.owners) {
        if (owners.length < 2) continue;
        report({
          target: id,
          canvas: id,
          message: `${facts.describe(id)} has ${owners.length} owners (${owners.map(owner => owner.id).join(", ")}); make it a definition to reuse it`,
          data: { owners }
        });
      }
    }
  },
  {
    code: "canvas.dense",
    severity: "warning",
    description: `A canvas has more than ${DENSE} nodes (suggests moving detail into a level).`,
    check(facts, report) {
      for (const [id, canvas] of sorted(facts.doc.canvases)) {
        const count = Object.keys(canvas.nodes).length;
        if (count <= DENSE) continue;
        report({
          target: id,
          canvas: id,
          message: `${facts.describe(id)} has ${count} nodes; consider moving detail into nested levels`,
          data: { nodes: count }
        });
      }
    }
  },
  {
    code: "definition.unused",
    severity: "warning",
    description: "A definition has no instance and no reference points at it.",
    check(facts, report) {
      const used = new Set(
        facts.refs.filter(ref => ref.section === "content" && ref.source !== ref.target).map(ref => ref.target)
      );
      for (const [id] of sorted(facts.doc.definitions)) {
        if (!used.has(id)) report({ target: id, message: `${facts.describe(id)} is not used anywhere` });
      }
    }
  },
  {
    code: "definition.cycle",
    severity: "error",
    description: "Definitions contain each other (directly or through other levels).",
    check(facts, report) {
      for (const cycle of cycles(facts).filter(cycle => cycle.definitions.length)) {
        const [target] = cycle.definitions;
        report({
          target,
          message: `${facts.describe(target)} contains itself through ${cycle.canvases.join(" → ")}`,
          data: cycle
        });
      }
    }
  },
  {
    code: "canvas.cycle",
    severity: "error",
    description: "Own interiors contain each other, so the levels never end.",
    check(facts, report) {
      for (const cycle of cycles(facts).filter(cycle => !cycle.definitions.length)) {
        const [target] = cycle.canvases;
        report({
          target,
          canvas: target,
          message: `${facts.describe(target)} contains itself through ${cycle.canvases.join(" → ")}`,
          data: cycle
        });
      }
    }
  }
];

const computed = new WeakMap();

/** Groups of canvases that contain each other, each with the definitions entered inside the group. */
function cycles(facts) {
  if (!computed.has(facts)) computed.set(facts, findCycles(facts));
  return computed.get(facts);
}

function findCycles(facts) {
  const { doc } = facts;
  const found = [];
  const done = new Set();
  const reach = new Map(sorted(doc.canvases).map(([id]) => [id, reachable(facts, id)]));
  for (const [id] of sorted(doc.canvases)) {
    if (done.has(id) || !reach.get(id).has(id)) continue;
    const canvases = [...reach.get(id)].filter(other => reach.get(other).has(id)).sort();
    canvases.forEach(other => done.add(other));
    const definitions = new Set();
    for (const canvasId of canvases) {
      for (const node of Object.values(doc.canvases[canvasId].nodes)) {
        const definition = node.inner?.definition;
        if (definition && canvases.includes(doc.definitions[definition]?.canvas)) definitions.add(definition);
      }
    }
    found.push({ canvases, definitions: [...definitions].sort() });
  }
  return found;
}
