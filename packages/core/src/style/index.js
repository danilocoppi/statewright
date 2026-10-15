import { buildIndex } from "../query/build-index.js";
import { figureCanvases, interiorOf, stepsItem } from "./frames.js";
import { associationsOf } from "../roles/index.js";
import { edgeHome, homeKind, stateLevelOf } from "../roles/kinds.js";
import { CHIP_LABELS, EDGE_STYLES, MUTED, NODE_STYLES, ROLE_STYLES, TONES } from "./palette.js";

export { displayOf, figureCanvases, interiorOf } from "./frames.js";

export {
  BADGE,
  CHIP_LABELS,
  EDGE_STYLES,
  INK,
  MONO,
  MUTED,
  NODE_STYLES,
  NOTE_TONES,
  ROLE_STYLES,
  RULE,
  SANS,
  SUB,
  TONES
} from "./palette.js";

const PROVENANCE_KEYS = {
  defect: "prov.defect",
  proposed: "prov.proposed",
  fix: "prov.fix",
  legacy: "prov.legacy",
  implied: "prov.implied"
};
const KIND_KEYS = { actor: "node.actor", external: "node.external", store: "node.store", ref: "node.ref" };
const PLAIN_KEYS = { machine: "state.plain", system: "node.plain", flow: "step.plain" };
const CATEGORY_KEYS = { waiting: "state.waiting", hold: "state.hold", processing: "state.processing" };
const KIND_CHIPS = {
  queue: "QUEUE",
  while: "WHILE",
  forEach: "FOR EACH",
  subflow: "SUBFLOW",
  emit: "EMIT",
  wait: "WAIT",
  call: "CALL",
  webhook: "WEBHOOK",
  assign: "ASSIGN",
  steps: "STEPS"
};
/** A participant's style key and shape by its party's kind (mixed levels spec §4.1). */
const PARTY_LOOKS = {
  human: { key: "node.actor", shape: "actor" },
  operator: { key: "node.ops", shape: "actor" },
  system: { key: "node.plain", shape: "box", chip: "SERVICE" },
  external: { key: "node.external", shape: "actor" }
};
const SHAPES = {
  initial: "dot",
  start: "dot",
  end: "end",
  choice: "diamond",
  if: "diamond",
  switch: "diamond",
  history: "history",
  parallel: "bar",
  join: "bar",
  any: "any",
  ref: "ref"
};
/** Shapes that show a node style (pseudo-nodes are drawn the same everywhere and stay out of the legend). */
const STYLED_SHAPES = new Set(["box", "actor", "ref"]);

/** The state a state guest stands for, with its machine canvas, or null. */
function guestTarget(doc, node) {
  const canvasId = stateLevelOf(doc, node.target);
  return canvasId ?
      { canvasId, canvas: doc.canvases[canvasId], state: doc.canvases[canvasId].nodes[node.target] }
    : null;
}

/**
 * Style key of a node (spec §15 precedence: provenance › focus › kind › outcome › category › plain). A guest takes
 * the key of what it stands for: a participant its party's look, a state guest its state's key.
 */
function nodeKey(doc, levelKind, node, focused) {
  // On a mixed level, an element looks as it does at home (mixed levels spec §4.5).
  const canvasKind = homeKind(levelKind, node) ?? levelKind;
  if (PROVENANCE_KEYS[node.provenance]) return PROVENANCE_KEYS[node.provenance];
  if (focused) return "state.focus";
  if (node.kind === "participant") return PARTY_LOOKS[doc.catalog.parties[node.party]?.kind]?.key ?? "node.actor";
  if (node.kind === "steps") return "step.plain";
  if (canvasKind === "flow" && node.kind === "state") {
    const target = guestTarget(doc, node)?.state;
    return target?.kind === "state" ?
        nodeKey(doc, "machine", { ...target, provenance: undefined }, false)
      : "state.plain";
  }
  if (KIND_KEYS[node.kind]) return KIND_KEYS[node.kind];
  if (node.outcome) return `outcome.${node.outcome}`;
  if (CATEGORY_KEYS[node.category]) return CATEGORY_KEYS[node.category];
  return PLAIN_KEYS[canvasKind];
}

/** Shape of a node; an entry is an actor box when someone performs it, otherwise a dot (spec §12.3). */
function shapeOf(doc, node) {
  if (node.kind === "entry") return node.by ? "actor" : "dot";
  if (node.kind === "participant") return PARTY_LOOKS[doc.catalog.parties[node.party]?.kind]?.shape ?? "actor";
  if (node.kind === "actor" || node.kind === "external") return "actor";
  return SHAPES[node.kind] ?? "box";
}

/** Readable trigger of an `on` event, `after` timer or `via` endpoint/webhook. */
function viaText(doc, id) {
  const endpoint = doc.catalog.endpoints[id];
  if (endpoint) return `${endpoint.method} ${endpoint.path}`;
  return doc.catalog.webhooks[id]?.name ?? id;
}

/**
 * Style queries over one document, sharing one index (use this when styling many elements, as renderers do).
 * @param {any} doc A valid document.
 */
export function createStyle(doc) {
  const index = buildIndex(doc);
  const annotations = doc.annotations ?? {};
  const focus = new Set(annotations.focus ?? []);
  const badges = new Map();
  const targeted = new Map();
  for (const id of Object.keys(annotations.findings ?? {}).sort()) {
    const finding = annotations.findings[id];
    for (const target of finding.targets) {
      if (!badges.has(target)) badges.set(target, []);
      if (!badges.get(target).includes(finding.code)) badges.get(target).push(finding.code);
      if (!targeted.has(target)) targeted.set(target, []);
      targeted.get(target).push({ id, ...finding });
    }
  }
  const nodeEntry = id => {
    const entry = index.get(id);
    return entry?.type === "node" ? entry : null;
  };
  const edgeEntry = id => {
    const entry = index.get(id);
    return entry?.type === "edge" ? entry : null;
  };

  function node(id) {
    const entry = nodeEntry(id);
    if (!entry) return null;
    const value = entry.value;
    const canvasKind = doc.canvases[entry.canvas].kind;
    const key = nodeKey(doc, canvasKind, value, focus.has(id));
    const style = NODE_STYLES[key];
    const chips = [];
    const chip = (text, color, fill) => {
      if (!chips.some(existing => existing.text === text)) chips.push({ text, color, fill });
    };
    if (PROVENANCE_KEYS[value.provenance]) {
      const provenance = NODE_STYLES[PROVENANCE_KEYS[value.provenance]];
      chip(provenance.chip, provenance.stroke);
    }
    if (KIND_KEYS[value.kind] && NODE_STYLES[KIND_KEYS[value.kind]].chip) {
      chip(NODE_STYLES[KIND_KEYS[value.kind]].chip, NODE_STYLES[KIND_KEYS[value.kind]].stroke);
    }
    if (KIND_CHIPS[value.kind]) chip(KIND_CHIPS[value.kind], MUTED);
    if (value.kind === "participant") {
      const look = PARTY_LOOKS[doc.catalog.parties[value.party]?.kind];
      if (NODE_STYLES[key].chip) chip(NODE_STYLES[key].chip, NODE_STYLES[key].stroke);
      else if (look?.chip) chip(look.chip, MUTED);
    }
    if (homeKind(canvasKind, value) === "flow" && value.kind === "state") chip("STATE", MUTED);
    if (value.terminal) chip("FINAL", style.stroke);
    if (CATEGORY_KEYS[value.category]) {
      const category = NODE_STYLES[CATEGORY_KEYS[value.category]];
      chip(category.chip, category.stroke);
    }
    for (const tag of value.tags ?? []) {
      const tone = TONES[tag.tone ?? "neutral"];
      chip(tag.text.toUpperCase(), tone.color, tone.fill);
    }
    const statuses = (value.statuses ?? [])
      .filter(statusId => doc.catalog.statuses[statusId])
      .map(statusId => ({
        text: doc.catalog.statuses[statusId].name,
        tone: doc.catalog.statuses[statusId].tone ?? "neutral"
      }));
    return {
      key,
      fill: style.fill,
      stroke: style.stroke,
      dash: style.dash ?? null,
      opacity: value.confidence === "low" ? 0.6 : 1,
      shape: shapeOf(doc, value),
      chips,
      statuses,
      badges: badges.get(id) ?? [],
      interior: interiorOf(doc, value)
    };
  }

  function edgeKey(canvasKind, edge) {
    if (edge.kind === "link") return "edge.link";
    if (edge.provenance === "defect") return "edge.defect";
    if (edge.provenance === "proposed" || edge.provenance === "fix") return "edge.proposed";
    if (edge.provenance === "implied") return "edge.implied";
    if (edge.intent === "failure" || (canvasKind === "flow" && edge.kind === "error")) return "edge.failure";
    if (canvasKind === "mixed" && edge.kind === "error") return "edge.failure";
    if (edge.by && doc.catalog.parties[edge.by]?.kind === "operator") return "edge.ops";
    const timerOnly =
      edge.after !== undefined &&
      !edge.on?.length &&
      !edge.onMatch?.length &&
      edge.always === undefined &&
      edge.done === undefined &&
      edge.via === undefined;
    if (timerOnly) return "edge.timer";
    if (edge.intent === "happy") return "edge.happy";
    return "edge.default";
  }

  function edge(id) {
    const entry = edgeEntry(id);
    if (!entry) return null;
    const key = edgeKey(doc.canvases[entry.canvas].kind, entry.value);
    const style = EDGE_STYLES[key];
    return {
      key,
      stroke: style.stroke,
      width: style.width,
      dash: style.dash ?? null,
      opacity: entry.value.confidence === "low" ? 0.6 : 1,
      badges: badges.get(id) ?? []
    };
  }

  /** Edge label text (spec §15): `label`, or triggers joined by " | " and the guard in brackets. */
  function edgeLabel(id) {
    const entry = edgeEntry(id);
    if (!entry) return "";
    const value = entry.value;
    if (value.label !== undefined) return value.label;
    const canvas = doc.canvases[entry.canvas];
    const eventName = eventId => doc.catalog.events[eventId]?.name ?? eventId;
    // A mixed level's connection is labelled as it is at home (a link as a transition's link is).
    const home = canvas.kind === "mixed" ? (edgeHome(canvas, value) ?? "machine") : canvas.kind;
    if (home === "system") {
      const parts = [
        ...(value.events ?? []).map(eventName),
        ...(value.endpoint ? [viaText(doc, value.endpoint)] : []),
        ...(value.webhook ? [viaText(doc, value.webhook)] : [])
      ];
      return (
        parts.length ? parts.join(" · ")
        : value.kind && value.kind !== "link" ? value.kind
        : ""
      );
    }
    if (home === "flow") {
      if (value.kind === "case") return typeof value.case === "string" ? value.case : JSON.stringify(value.case);
      return value.kind && value.kind !== "next" && value.kind !== "link" ? value.kind : "";
    }
    const triggers = [
      ...(value.on ?? []).map(eventName),
      ...(value.onMatch ?? []),
      ...(value.after ? [doc.catalog.timers[value.after]?.name ?? value.after] : []),
      ...(value.always ? ["always"] : []),
      ...(value.done === true ? ["done"] : []),
      ...(typeof value.done === "string" ? [`${canvasRegionName(value.done)} ✓`] : []),
      ...(value.via ? [viaText(doc, value.via)] : [])
    ];
    const condition = value.guard;
    const guard =
      condition?.guard ? (doc.catalog.guards[condition.guard]?.name ?? condition.guard)
      : condition?.text ? condition.text
      : condition?.expr !== undefined ? "guard"
      : null;
    const from = canvas.nodes[value.from];
    if (!triggers.length && from?.kind === "entry" && !from.by) triggers.push(from.name);
    if (value.else) triggers.push("else");
    const text = triggers.join(" | ");
    return guard ? `${text}${text ? " " : ""}[${guard}]` : text;
  }

  function canvasRegionName(regionId) {
    return index.get(regionId)?.value.name ?? regionId;
  }

  /**
   * Legend of one figure (spec §15): the node styles, edge styles, chips and finding badges actually used, nodes
   * first. Wording comes from `layout.legend.labels`, else the defaults.
   */
  function legend(canvasId) {
    const labels = doc.layout?.legend?.labels ?? {};
    const nodeKeys = new Set();
    const edgeKeys = new Set();
    let terminal = false;
    let findings = false;
    const drawnRoles = new Set(associationsOf(doc, canvasId).map(item => `role.${item.role}`));
    for (const id of figureCanvases(doc, canvasId)) {
      const canvas = doc.canvases[id];
      const placed = doc.layout?.canvases?.[id]?.nodes ?? {};
      for (const nodeId of Object.keys(canvas.nodes)) {
        const style = node(nodeId);
        if (placed[nodeId]?.display === "frame" && style.interior) nodeKeys.add("frame");
        else if (STYLED_SHAPES.has(style.shape)) nodeKeys.add(style.key);
        if (canvas.nodes[nodeId].terminal) terminal = true;
        if (style.badges.length) findings = true;
      }
      for (const edgeId of Object.keys(canvas.edges)) {
        const style = edge(edgeId);
        edgeKeys.add(style.key);
        if (style.badges.length) findings = true;
      }
    }
    return {
      nodes: Object.keys(NODE_STYLES)
        .filter(key => nodeKeys.has(key))
        .map(key => ({ key, ...NODE_STYLES[key], label: labels[key] ?? NODE_STYLES[key].label })),
      edges: Object.keys(EDGE_STYLES)
        .filter(key => edgeKeys.has(key))
        .map(key => ({ key, ...EDGE_STYLES[key], label: labels[key] ?? EDGE_STYLES[key].label })),
      chips: terminal ? [{ text: "FINAL", label: labels["chip.final"] ?? CHIP_LABELS.FINAL }] : [],
      roles: Object.keys(ROLE_STYLES)
        .filter(key => drawnRoles.has(key))
        .map(key => ({ key, ...ROLE_STYLES[key], label: labels[key] ?? ROLE_STYLES[key].label })),
      findings
    };
  }

  /**
   * One-line summary of a node's interior for `display: "card"` (spec §14): a machine's states in the order they are
   * reached ("none → received → settled"), a flow's steps, or a system's elements; at most four, then "…".
   */
  function cardSummary(id) {
    const entry = nodeEntry(id);
    const interior = entry && interiorOf(doc, entry.value);
    if (!interior) return "";
    const canvas = doc.canvases[interior];
    const nodes = canvas.nodes;
    const named = nodeId => nodes[nodeId]?.name ?? null;
    let names;
    if (canvas.kind === "system") {
      names = Object.keys(nodes).sort().map(named).filter(Boolean);
    } else {
      const starts = Object.keys(nodes)
        .sort()
        .filter(nodeId => ["initial", "entry", "start"].includes(nodes[nodeId].kind));
      const order = [];
      const seen = new Set(starts);
      const queue = [...starts];
      const edges = Object.entries(canvas.edges).sort(([a], [b]) =>
        a < b ? -1
        : a > b ? 1
        : 0
      );
      while (queue.length) {
        const current = queue.shift();
        order.push(current);
        for (const [, value] of edges) {
          if (value.from === current && value.kind !== "link" && !seen.has(value.to)) {
            seen.add(value.to);
            queue.push(value.to);
          }
        }
      }
      const kinds = canvas.kind === "machine" ? new Set(["state"]) : null;
      names = order
        .filter(nodeId => (kinds ? kinds.has(nodes[nodeId].kind) : !["start", "end"].includes(nodes[nodeId].kind)))
        .map(nodeId => named(nodeId) ?? stepText(doc, nodes[nodeId]))
        .filter(Boolean);
    }
    const shown = names.slice(0, 4).join(canvas.kind === "system" ? " · " : " → ");
    return names.length > 4 ? `${shown} …` : shown;
  }

  /**
   * The findings about an element, in the order its badge shows their codes (by finding ID).
   * @param {string} id
   * @returns {Array<{ id: string, code: string, title: string, severity: string }>}
   */
  const findings = id => targeted.get(id) ?? [];

  return { node, edge, edgeLabel, legend, cardSummary, findings };
}

/** Text of an unnamed flow step (its action, event, endpoint, …) or guest (what it stands for), for summaries. */
export function stepText(doc, node) {
  switch (node.kind) {
    case "participant":
      return doc.catalog.parties[node.party]?.name ?? node.party;
    case "steps":
      return stepsItem(doc, node)?.name ?? node.action;
    case "state":
      return node.target ? (guestTarget(doc, node)?.state.name ?? node.target) : "state";
    case "action":
      return doc.catalog.actions[node.action]?.name ?? node.action;
    case "emit":
      return doc.catalog.events[node.event]?.name ?? node.event;
    case "call":
      return (
        node.endpoint ? viaText(doc, node.endpoint)
        : node.request ? `${node.request.method} ${node.request.url}`
        : "call"
      );
    case "webhook":
      return doc.catalog.webhooks[node.webhook]?.name ?? node.webhook;
    case "wait":
      return (node.on ?? []).map(id => doc.catalog.events[id]?.name ?? id).join(" | ") || "wait";
    default:
      return node.kind;
  }
}

/**
 * Visual style of a node: style key and colours, shape, chips, status pills and finding badges (spec §15).
 * @returns {ReturnType<ReturnType<typeof createStyle>["node"]>} null when `id` is not a node.
 */
export const nodeStyle = (doc, id) => createStyle(doc).node(id);

/** Visual style of an edge: style key, stroke, width, dash (spec §15). Null when `id` is not an edge. */
export const edgeStyle = (doc, id) => createStyle(doc).edge(id);

/** Label text of an edge (spec §15). */
export const edgeLabel = (doc, id) => createStyle(doc).edgeLabel(id);

/** Legend of the figure of one canvas (spec §15). */
export const legendFor = (doc, canvasId) => createStyle(doc).legend(canvasId);

/** Auto-summary of a node's interior for card display (spec §14). */
export const cardSummary = (doc, id) => createStyle(doc).cardSummary(id);
