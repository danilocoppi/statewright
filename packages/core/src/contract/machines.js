// A design's machines as code implements them (source-of-truth spec §5, Machines): each machine level, its states by the
// names the code holds, how a record starts, and every transition with its triggers, guard and effects by name.
import { ownerOf } from "../query/index.js";
import { sorted } from "../rules/facts.js";
import { actionRolesOf, conditionOf, defined, effectsOf, eventName, partyName, timerOf, viaName } from "./names.js";

/** The machine nodes that are not states: where a run starts, branches, resumes or applies everywhere. */
const STARTS = new Set(["initial", "entry"]);
const OTHERS = new Set(["choice", "history", "any"]);

/** A region's name, for a node or a transition in it. */
const regionName = (canvas, region) => (region ? (canvas.regions?.[region]?.name ?? region) : undefined);

/** Where a transition ends: a state's name, or `<kind>:<id>` for a node that is not a state. */
const endOf = (canvas, id) => {
  const node = canvas.nodes[id];
  return node?.kind === "state" ? node.name : `${node?.kind ?? "node"}:${id}`;
};

/** The region a `done` transition waits for: of its state's interior first, as the engine reads it, else of its level. */
function doneOf(doc, canvas, edge) {
  if (edge.done === true || edge.done === undefined) return edge.done;
  const inner = canvas.nodes[edge.from]?.inner;
  const interior = doc.canvases[inner?.canvas ?? doc.definitions?.[inner?.definition]?.canvas];
  return interior?.regions?.[edge.done] ? regionName(interior, edge.done) : regionName(canvas, edge.done);
}

/** The interior a state opens: another machine level, or a reusable part. */
const innerOf = inner =>
  inner?.canvas ? { machine: inner.canvas }
  : inner?.definition ? { definition: inner.definition }
  : undefined;

/** The transitions of a level, in ID order: links (`kind: "link"`) and edges touching `ref` nodes do not execute. */
const transitionsOf = canvas =>
  sorted(canvas.edges)
    .filter(([, edge]) => edge.kind !== "link")
    .filter(([, edge]) => canvas.nodes[edge.from]?.kind !== "ref" && canvas.nodes[edge.to]?.kind !== "ref");

/** Who has this level as interior, and — for the interior of a state — the machine and the state. */
function placeOf(doc, canvasId) {
  const owner = ownerOf(doc, canvasId);
  if (!owner || owner.type === "root") return { owner: null };
  if (owner.type === "definition") return { owner: owner.id, definition: owner.id };
  for (const [levelId, level] of Object.entries(doc.canvases)) {
    const node = level.nodes[owner.id];
    if (node && level.kind === "machine" && node.kind === "state") {
      return { owner: owner.id, within: { machine: levelId, state: node.name } };
    }
  }
  return { owner: owner.id };
}

/** One machine level of the contract. */
function machineOf(doc, id, canvas) {
  const nodes = sorted(canvas.nodes);
  const outOf = nodeId => transitionsOf(canvas).find(([, edge]) => edge.from === nodeId)?.[1];
  const states = nodes
    .filter(([, node]) => node.kind === "state")
    .map(([nodeId, node]) =>
      defined({
        id: nodeId,
        name: node.name,
        region: regionName(canvas, node.region),
        category: node.category,
        outcome: node.outcome,
        final: node.terminal || undefined,
        statuses: node.statuses?.map(status => doc.catalog?.statuses?.[status]?.name ?? status),
        onEntry: effectsOf(doc, node.onEntry),
        onExit: effectsOf(doc, node.onExit),
        ...actionRolesOf(doc, node.onEntry ?? [], node.onExit ?? []),
        sla: node.sla ? timerOf(doc, node.sla) : undefined,
        inner: innerOf(node.inner)
      })
    );
  const starts = nodes
    .filter(([, node]) => STARTS.has(node.kind))
    .map(([nodeId, node]) => {
      const out = outOf(nodeId);
      return defined({
        id: nodeId,
        kind: node.kind,
        name: node.name,
        region: regionName(canvas, node.region),
        to: out ? endOf(canvas, out.to) : undefined,
        via: node.via ? viaName(doc, node.via) : undefined,
        on: node.on?.map(event => eventName(doc, event)),
        by: node.by ? partyName(doc, node.by) : undefined,
        guard: conditionOf(doc, node.guard),
        effective: node.effective
      });
    });
  const others = nodes
    .filter(([, node]) => OTHERS.has(node.kind))
    .map(([nodeId, node]) =>
      defined({
        id: nodeId,
        kind: node.kind,
        name: node.name,
        region: regionName(canvas, node.region),
        depth: node.depth,
        except: node.except?.map(state => endOf(canvas, state))
      })
    );
  const transitions = transitionsOf(canvas).map(([edgeId, edge]) =>
    defined({
      id: edgeId,
      from: endOf(canvas, edge.from),
      to: endOf(canvas, edge.to),
      region: regionName(canvas, canvas.nodes[edge.from]?.region ?? canvas.nodes[edge.to]?.region),
      name: edge.name,
      on: edge.on?.map(event => eventName(doc, event)),
      onMatch: edge.onMatch,
      after: edge.after ? timerOf(doc, edge.after) : undefined,
      always: edge.always,
      done: doneOf(doc, canvas, edge),
      via: edge.via ? viaName(doc, edge.via) : undefined,
      by: edge.by ? partyName(doc, edge.by) : undefined,
      guard: conditionOf(doc, edge.guard),
      else: edge.else,
      actions: effectsOf(doc, edge.actions),
      ...actionRolesOf(doc, edge.actions ?? []),
      internal: edge.internal,
      intent: edge.intent,
      retry: edge.retry,
      effective: edge.effective
    })
  );
  const regions = Object.entries(canvas.regions ?? {}).map(([regionId, region]) => ({
    id: regionId,
    name: region.name
  }));
  return defined({
    id,
    name: canvas.name,
    subject: canvas.subject,
    completeness: canvas.transitions ?? "partial",
    stage: canvas.stage,
    ...placeOf(doc, id),
    regions: regions.length ? regions : undefined,
    states,
    starts,
    nodes: others.length ? others : undefined,
    transitions
  });
}

/**
 * The machine levels of a design, in ID order.
 * @param {any} doc A schema-valid document.
 * @returns {object[]}
 */
export function machinesOf(doc) {
  return sorted(doc.canvases)
    .filter(([, canvas]) => canvas.kind === "machine")
    .map(([id, canvas]) => machineOf(doc, id, canvas));
}
