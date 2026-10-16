// What Core's schema says about an element (spec §7.4): which keys it takes and which values a choice allows. The
// inspector reads its choices from here, so they are always the format's own.
import {
  ActionDef,
  Canvas,
  Definition,
  edgeHome,
  EndpointDef,
  EventDef,
  Finding,
  FlowEdge,
  FlowNode,
  GuardDef,
  HighlightDef,
  homeKind,
  Lane,
  MachineEdge,
  MachineNode,
  Note,
  PartyDef,
  Project,
  RegionDef,
  StatusDef,
  SystemEdge,
  SystemNode,
  TimerDef,
  TypeDef,
  WebhookDef
} from "statewright";

/** The schema of each catalog collection's items. */
export const CATALOG_SCHEMAS = {
  types: TypeDef,
  events: EventDef,
  actions: ActionDef,
  guards: GuardDef,
  endpoints: EndpointDef,
  webhooks: WebhookDef,
  timers: TimerDef,
  statuses: StatusDef,
  parties: PartyDef,
  highlights: HighlightDef
};

const NODES = { system: SystemNode, machine: MachineNode, flow: FlowNode };
const EDGES = { system: SystemEdge, machine: MachineEdge, flow: FlowEdge };
const PLAIN = { project: Project, definition: Definition, region: RegionDef, note: Note, lane: Lane, finding: Finding };

/** An optional, nullable or defaulted type's inner type. */
export function unwrap(type) {
  let inner = type;
  while (inner && ["optional", "nullable", "default"].includes(inner.def?.type)) inner = inner.def.innerType;
  return inner;
}

/** The option of a union whose `kind` is the given one (a union without kinds: the first option that fits). */
function optionOf(union, value) {
  const options = union.options;
  const kinded = options.find(option => unwrap(option.shape.kind)?.value === value.kind);
  if (kinded) return kinded;
  // Machine edges: a transition has no kind; a link says so.
  return options.find(option => !option.shape.kind) ?? options[0];
}

/**
 * The schema of an element as Core's index sees it.
 * @param {any} doc
 * @param {{ type: string, value: any, canvas?: string, collection?: string }} entry
 */
export function schemaOf(doc, entry) {
  const canvas = entry.canvas && doc.canvases[entry.canvas];
  // On a mixed level, an element's schema is its own kind's (mixed levels spec §6).
  const home =
    canvas?.kind !== "mixed" ? canvas?.kind
    : entry.type === "node" ? (homeKind("mixed", entry.value) ?? "machine")
    : (edgeHome(canvas, entry.value) ?? "machine");
  if (entry.type === "node") return optionOf(NODES[home], entry.value);
  if (entry.type === "edge") {
    const union = EDGES[home];
    return union.options ? optionOf(union, entry.value) : union;
  }
  if (entry.type === "canvas") return optionOf(Canvas, entry.value);
  if (entry.type === "catalog") return CATALOG_SCHEMAS[entry.collection];
  return PLAIN[entry.type];
}

/** The schema of a node or edge kind on a kind of level (a machine transition has no kind: `undefined`). */
export function schemaFor(type, canvasKind, kind) {
  const union = (type === "node" ? NODES : EDGES)[canvasKind];
  if (!union.options) return union;
  return union.options.find(option => unwrap(option.shape.kind)?.value === kind) ?? optionOf(union, {});
}

/** The keys an object schema takes, in the format's order. */
export const keysOf = schema => Object.keys(schema.shape);

/**
 * The values a choice takes: an enum's values, or `true` for a key that is only ever `true`; null when the key is not
 * a choice.
 */
export function choicesOf(schema, key) {
  const type = unwrap(schema.shape[key]);
  if (!type) return null;
  if (type.def.type === "enum") return type.options;
  if (type.def.type === "literal") return [...type.def.values];
  if (type.def.type === "boolean") return [true, false];
  return null;
}

/** The kinds a node or edge of a kind of level can have, in the format's order. */
export function kindsOf(type, canvasKind) {
  const union = (type === "node" ? NODES : EDGES)[canvasKind];
  if (union.options) return union.options.map(option => unwrap(option.shape.kind)?.value).filter(Boolean);
  return choicesOf(union, "kind") ?? [];
}
