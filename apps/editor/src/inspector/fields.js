// What the inspector edits for each element (spec §7.4): its fields in two layers — Basics, what a reviewer understands
// without the format, and Details — each with the control that edits it. Every key of format 1.0 is a field here or
// is listed in ELSEWHERE with the place it is edited (spec §13, E4: "every field of format 1.0 is editable somewhere").
import { edgeHome, homeKind, isGuest } from "statewright";

import { indexOf } from "@/lib/derived";

import { choicesOf, schemaOf } from "./schema";

/**
 * @typedef {object} Field
 * @property {string} key The element's key (for sections: what they show).
 * @property {string} control How it is edited: "title", "text", "longtext", "summary", "choice", "toggle", "kind",
 *   "ref", "refs", "type", "node", "nodes", "region", "target", "targets", "noteTarget", "duration",
 *   "signedDuration", "signedDurations", "globs", "json", "jsonMap", "condition", "effects", "retry", "effective",
 *   "evidence", "tags", "request", "responses", "done", "interior", "regions", "typeFields", "typeValues",
 *   "jsonSchema", "legend", "connections", "findings", "focus", "display", "size", "route".
 * @property {"basics" | "details"} layer
 * @property {string} [label] The `inspector:fields` key of its label, when it is not the key's.
 * @property {boolean} [section] Not a key of the element: something about it (its connections, findings, layout).
 * @property {boolean} [mono] Shown in the monospace face (codes, paths, expressions).
 * @property {boolean} [required] Cannot be emptied.
 * @property {string} [none] The `inspector:choices.none` key of the choice that leaves the key out.
 * @property {string} [default] The value the format assumes when the key is left out: choosing it leaves the key out.
 * @property {string[]} [choices] The values a choice takes (from Core's schema).
 * @property {string[]} [collections] The catalog collections a reference picks from.
 * @property {"null" | "internal"} [extra] A value a reference also takes: no type (null), or raised inside.
 * @property {boolean} [primitives] A type field that also takes the format's primitive types.
 * @property {Record<string, unknown>} [when] Shown only while the element has these values (a type's fields only on
 *   objects, a flow edge's case only on cases).
 */

const field = (key, control, layer = "details", options = {}) => ({ key, control, layer, ...options });
const basics = (key, control, options) => field(key, control, "basics", options);
const details = (key, control, options) => field(key, control, "details", options);
const ref = (key, collections, layer = "details", options = {}) =>
  field(key, "ref", layer, { collections, ...options });
const refs = (key, collection, layer = "details", options = {}) =>
  field(key, "refs", layer, { collections: [collection], ...options });
const section = (key, control, layer = "details") => field(key, control, layer, { section: true });

/** Fields every element accepts (format §9.1). */
const PROVENANCE = [details("provenance", "choice", { none: "notSaid" }), details("evidence", "evidence")];
const CONFIDENCE = [details("confidence", "choice", { none: "notSaid" })];
const TAIL = [details("tags", "tags"), details("label", "text")];
const DESCRIPTION = basics("description", "longtext");
// In each layer: the description and the element's own fields first, provenance before the technical fields (mockup 09).
const common = (...own) => [DESCRIPTION, ...PROVENANCE, ...CONFIDENCE, ...own, ...TAIL];
/** What is drawn on a level — boxes and arrows — also carries highlights, under its description (highlights spec §6). */
const HIGHLIGHTS = basics("highlights", "highlights");
const drawn = (...own) => [DESCRIPTION, HIGHLIGHTS, ...PROVENANCE, ...CONFIDENCE, ...own, ...TAIL];
const SUMMARY = details("summary", "summary");
const INTERIOR = details("inner", "interior");
const REGION = details("region", "region");
const TARGET = basics("target", "target");
const NODE_SECTIONS = [
  section("connections", "connections", "basics"),
  section("roles", "roles", "basics"),
  section("findings", "findings"),
  section("focus", "focus"),
  section("display", "display"),
  section("size", "size")
];
const EDGE_SECTIONS = [
  section("roles", "roles", "basics"),
  section("findings", "findings"),
  section("focus", "focus"),
  section("route", "route")
];

const name = (required = false) => field("name", "title", "basics", { required });
// A participant is its party (mixed levels spec §4.1): it has no name of its own, only an optional label.
const PARTY = ref("party", ["parties"], "basics", { required: true });
const kind = () => details("kind", "kind");

/** The fields of each node kind, by kind of level. */
const NODE_FIELDS = {
  system: {
    actor: [name(), basics("kind", "kind"), ref("party", ["parties"], "basics"), SUMMARY, INTERIOR],
    service: [name(), basics("kind", "kind"), ref("party", ["parties"], "basics"), SUMMARY, INTERIOR],
    store: [name(), basics("kind", "kind"), ref("party", ["parties"], "basics"), SUMMARY, INTERIOR],
    queue: [name(), basics("kind", "kind"), ref("party", ["parties"], "basics"), SUMMARY, INTERIOR],
    external: [name(), basics("kind", "kind"), ref("party", ["parties"], "basics"), SUMMARY, INTERIOR],
    ref: [name(), TARGET, SUMMARY]
  },
  machine: {
    initial: [name(), kind(), REGION, SUMMARY],
    entry: [
      name(true),
      refs("on", "events", "basics", { label: "startsOn" }),
      ref("via", ["endpoints", "webhooks"], "basics"),
      ref("by", ["parties"], "basics"),
      kind(),
      REGION,
      details("guard", "condition"),
      details("effective", "effective"),
      SUMMARY
    ],
    state: [
      name(true),
      basics("category", "choice", { none: "nothingSpecial" }),
      basics("outcome", "choice", { none: "noOutcome" }),
      basics("terminal", "toggle"),
      refs("statuses", "statuses", "basics"),
      kind(),
      REGION,
      details("onEntry", "effects"),
      details("onExit", "effects"),
      ref("sla", ["timers"]),
      SUMMARY,
      INTERIOR
    ],
    choice: [name(), kind(), REGION, SUMMARY],
    history: [name(), basics("depth", "choice", { default: "shallow" }), kind(), REGION, SUMMARY],
    any: [name(), basics("except", "nodes"), kind(), REGION, SUMMARY],
    participant: [PARTY, kind(), REGION, SUMMARY],
    steps: [ref("action", ["actions", "endpoints", "webhooks"], "basics", { required: true }), kind(), REGION, SUMMARY],
    ref: [name(), TARGET, REGION, SUMMARY]
  },
  flow: {
    start: [name(), kind(), SUMMARY],
    end: [name(), basics("outcome", "choice", { none: "noOutcome" }), kind(), SUMMARY],
    action: [
      name(),
      ref("action", ["actions"], "basics", { required: true }),
      details("args", "jsonMap"),
      kind(),
      SUMMARY
    ],
    if: [name(), basics("condition", "condition"), kind(), SUMMARY],
    switch: [name(), details("on", "json", { label: "switchOn", mono: true }), kind(), SUMMARY],
    while: [name(), basics("condition", "condition"), kind(), SUMMARY, INTERIOR],
    forEach: [
      name(),
      details("items", "json", { mono: true }),
      details("as", "text", { mono: true }),
      kind(),
      SUMMARY,
      INTERIOR
    ],
    parallel: [name(), kind(), SUMMARY],
    join: [name(), kind(), SUMMARY],
    emit: [
      name(),
      ref("event", ["events"], "basics", { required: true }),
      details("payload", "jsonMap"),
      kind(),
      SUMMARY
    ],
    wait: [
      name(),
      refs("on", "events", "basics", { label: "waitsOn" }),
      ref("after", ["timers"], "basics"),
      kind(),
      SUMMARY
    ],
    call: [
      name(),
      ref("endpoint", ["endpoints"], "basics"),
      ref("party", ["parties"], "basics"),
      details("request", "request"),
      kind(),
      SUMMARY
    ],
    webhook: [name(), ref("webhook", ["webhooks"], "basics", { required: true }), kind(), SUMMARY],
    assign: [name(), details("set", "jsonMap"), kind(), SUMMARY],
    subflow: [name(), basics("inner", "interior"), kind(), SUMMARY],
    participant: [PARTY, kind(), SUMMARY],
    state: [basics("target", "target", { required: true, label: "standsFor" }), kind(), SUMMARY],
    ref: [name(), TARGET, SUMMARY]
  }
};

const ENDS = [details("from", "node"), details("to", "node")];

/** The fields of each kind of edge, by kind of level ("transition" and "link" on machines). */
const EDGE_FIELDS = {
  system: [
    name(),
    basics("kind", "choice", { none: "notSaid", label: "carries" }),
    refs("events", "events", "basics"),
    ref("endpoint", ["endpoints"], "basics"),
    ref("webhook", ["webhooks"], "basics"),
    ref("by", ["parties"]),
    ...ENDS
  ],
  transition: [
    name(),
    refs("on", "events", "basics"),
    ref("after", ["timers"], "basics"),
    basics("guard", "condition"),
    basics("intent", "choice", { none: "neither" }),
    details("onMatch", "globs"),
    details("always", "toggle"),
    details("done", "done"),
    ref("via", ["endpoints", "webhooks"]),
    ref("by", ["parties"]),
    details("else", "toggle"),
    details("actions", "effects"),
    details("internal", "toggle"),
    details("retry", "retry"),
    details("effective", "effective"),
    ...ENDS
  ],
  link: [name(), refs("on", "events", "basics"), ...ENDS],
  flow: [
    name(),
    basics("kind", "choice", { default: "next", label: "branch" }),
    basics("case", "json", { mono: true, when: { kind: "case" } }),
    ...ENDS
  ]
};

/** The fields of a level, by kind. */
const HEADING = [
  name(true),
  basics("title", "text"),
  basics("kicker", "text"),
  basics("caption", "longtext"),
  basics("stage", "choice", { none: "notSaid" }),
  details("code", "text", { mono: true })
];
const CANVAS_FIELDS = {
  system: HEADING,
  machine: [
    ...HEADING,
    details("subject", "text"),
    details("context", "type"),
    basics("transitions", "choice", { default: "unknown", label: "completeness" }),
    basics("regions", "regions")
  ],
  flow: [...HEADING, details("vars", "type")],
  // A mixed level (mixed levels spec §4.5): a machine's heading fields for its states, a flow's variables for its steps.
  mixed: [
    ...HEADING,
    details("subject", "text"),
    details("context", "type"),
    basics("transitions", "choice", { default: "unknown", label: "completeness" }),
    basics("regions", "regions"),
    details("vars", "type")
  ]
};

const nullable = { extra: "null" };

/** The fields of each catalog collection's items. */
const CATALOG_FIELDS = {
  types: [
    name(true),
    basics("kind", "kind", { label: "typeKind" }),
    basics("fields", "typeFields", { when: { kind: "object" } }),
    basics("values", "typeValues", { when: { kind: "enum" } }),
    basics("of", "type", { primitives: true, label: "aliasOf", when: { kind: "alias" } }),
    details("jsonSchema", "jsonSchema")
  ],
  events: [
    name(true),
    ref("payload", ["types"], "basics", nullable),
    ref("source", ["parties"], "basics", { extra: "internal" })
  ],
  actions: [
    name(true),
    ref("input", ["types"], "basics", nullable),
    ref("output", ["types"], "basics", nullable),
    refs("emits", "events", "basics"),
    ref("party", ["parties"], "basics", { label: "receivedBy" }),
    INTERIOR
  ],
  guards: [name(true), details("expr", "json", { mono: true, label: "expression" })],
  endpoints: [
    name(true),
    basics("method", "choice"),
    basics("path", "text", { mono: true, required: true }),
    ref("request", ["types"], "basics", nullable),
    details("responses", "responses"),
    details("auth", "text"),
    details("idempotent", "toggle"),
    refs("emits", "events"),
    ref("party", ["parties"], "details", { label: "receivedBy" }),
    INTERIOR
  ],
  webhooks: [
    name(true),
    basics("direction", "choice"),
    ref("party", ["parties"], "basics"),
    ref("payload", ["types"], "basics", nullable),
    ref("event", ["events"], "basics"),
    details("signing", "text"),
    details("retry", "retry"),
    INTERIOR
  ],
  timers: [
    name(true),
    basics("duration", "duration"),
    details("at", "text", { mono: true }),
    details("offset", "signedDuration"),
    details("calendar", "choice", { default: "calendar" }),
    details("reminders", "signedDurations")
  ],
  statuses: [name(true), basics("tone", "choice", { default: "neutral" })],
  parties: [name(true), basics("kind", "choice", { label: "partyKind" })]
};

/** The fields of the other elements. */
const OTHER_FIELDS = {
  project: [name(true), DESCRIPTION, section("legend", "legend")],
  definition: [name(true), ...common()],
  region: [name(true), DESCRIPTION],
  note: [
    basics("text", "longtext", { required: true }),
    basics("tone", "choice", { none: "plainNote" }),
    basics("target", "noteTarget", { label: "attachedTo" })
  ],
  lane: [
    field("label", "title", "basics", { required: true }),
    basics("nodes", "nodes", { label: "laneNodes" }),
    ref("party", ["parties"], "basics", { label: "performedBy" })
  ],
  finding: [
    field("title", "title", "basics", { required: true }),
    basics("severity", "choice"),
    basics("description", "longtext"),
    basics("targets", "targets"),
    details("code", "text", { mono: true, required: true }),
    details("source", "text", { mono: true }),
    details("evidence", "evidence")
  ]
};

/**
 * The fields of a kind of element, in order (each layer keeps this order).
 * @param {string} type An index entry type: "node", "edge", "canvas", "catalog", "project", "definition", "region",
 *   "note", "lane", "finding".
 * @param {{ canvasKind?: string, kind?: string, collection?: string, value?: object }} [of] A node's or edge's kind of
 *   level and kind (and, on a mixed level, the node, which says which kind it is at home)
 *   ("transition" or "link" for machine edges), a level's kind, a catalog item's collection.
 * @returns {Field[]}
 */
export function fieldsOfKind(type, { canvasKind, kind, collection, value } = {}) {
  // On a mixed level, an element takes the fields of its own kind (a state with a target is a flow's state guest).
  if (canvasKind === "mixed" && (type === "node" || type === "edge")) {
    canvasKind = homeKind("mixed", value ?? { kind }) ?? "machine";
  }
  if (type === "node") {
    const own = NODE_FIELDS[canvasKind][kind];
    // Guests take no part in the level's transitions or steps, so they have no connections section.
    const sections = isGuest(canvasKind, { kind }) ? NODE_SECTIONS.slice(1) : NODE_SECTIONS;
    return [own[0], ...drawn(...own.slice(1)), ...sections];
  }
  if (type === "edge") {
    const own = EDGE_FIELDS[canvasKind === "machine" ? kind : canvasKind];
    return [own[0], ...drawn(...own.slice(1)), ...EDGE_SECTIONS];
  }
  if (type === "canvas") {
    return [
      ...CANVAS_FIELDS[kind],
      DESCRIPTION,
      ...PROVENANCE,
      ...CONFIDENCE,
      ...TAIL,
      section("lanes", "lanes"),
      section("findings", "findings")
    ];
  }
  // A highlight is a look, not an element of the system: its name and meaning here, its look in the highlight editor.
  if (type === "catalog" && collection === "highlights") return [name(true), DESCRIPTION];
  if (type === "catalog") {
    const own = CATALOG_FIELDS[collection];
    return [own[0], ...common(...own.slice(1))];
  }
  return OTHER_FIELDS[type];
}

/** The kind of element an index entry is, as `fieldsOfKind` takes it. */
function kindOf(doc, entry) {
  if (entry.type === "node") {
    return { canvasKind: doc.canvases[entry.canvas].kind, kind: entry.value.kind, value: entry.value };
  }
  if (entry.type === "edge") {
    const canvas = doc.canvases[entry.canvas];
    // A mixed level's connection takes the fields of what it is (mixed levels spec §6).
    const canvasKind = canvas.kind === "mixed" ? (edgeHome(canvas, entry.value) ?? "machine") : canvas.kind;
    return { canvasKind, kind: entry.value.kind === "link" ? "link" : "transition" };
  }
  if (entry.type === "canvas") return { kind: entry.value.kind };
  if (entry.type === "catalog") return { collection: entry.collection };
  return {};
}

/**
 * The fields of an element, in two layers, with each choice's values from Core's schema (fields that do not apply to
 * it now — a type's fields on an enum — are left out).
 * @param {any} doc
 * @param {string} id
 * @returns {{ entry: object, basics: Field[], details: Field[] } | null}
 */
export function fieldsFor(doc, id) {
  const entry = indexOf(doc).get(id);
  if (!entry) return null;
  const schema = schemaOf(doc, entry);
  const shown = item => !item.when || Object.entries(item.when).every(([key, value]) => entry.value[key] === value);
  const fields = fieldsOfKind(entry.type, kindOf(doc, entry))
    .filter(shown)
    .map(item => (item.control === "choice" ? { ...item, choices: choicesOf(schema, item.key) } : item));
  return {
    entry,
    basics: fields.filter(item => item.layer === "basics"),
    details: fields.filter(item => item.layer === "details")
  };
}

/**
 * Keys edited somewhere other than an element's fields, and where (format 1.0 keys by schema: "node.ref.kind" is the
 * kind of a shortcut node, "*" any kind).
 */
export const ELSEWHERE = {
  "node.ref.kind": "A shortcut stays a shortcut: remove it and place a box of another kind.",
  "edge.link.kind": "An arrow to or from a shortcut is a link.",
  "canvas.*.kind": "A level's kind is chosen when it is made.",
  "canvas.*.nodes": "The canvas: tools, connections, moving, deleting.",
  "canvas.*.edges": "The canvas: connections.",
  "definition.kind": "A reusable part's kind is chosen when it is made.",
  "definition.canvas": "A reusable part's body is edited by opening it.",
  "project.id": "A project's ID never changes.",
  "note.canvas": "Cut and paste a note to move it to another level.",
  "lane.canvas": "A lane belongs to the level it was made on.",
  "document.$schema": "Written by the app on save.",
  "document.statewright": "The format version, written by the app.",
  "document.generator": "Written by the app on save.",
  "document.signature": "Written by the app on save.",
  "document.root": "The project's top level, made with the project.",
  "document.annotations.focus": "Details of a box or arrow: Look here.",
  "document.annotations.scenarios": "Simulating a machine or a flow: Save as scenario.",
  "document.annotations.comments": "The canvas: a comment's pin opens its thread (Comment, on the canvas menu).",
  "document.annotations.locks":
    "The inspector: Don't let the AI change this, for a box, an arrow, a region or a level.",
  "layout.node.x": "Moving the box on the canvas.",
  "layout.node.y": "Moving the box on the canvas.",
  "layout.note.x": "Moving the note on the canvas.",
  "layout.note.y": "Moving the note on the canvas.",
  "layout.edge.points": "Auto-layout, or Details of an arrow: Reset route.",
  "layout.edge.labelAt": "Auto-layout, or Details of an arrow: Reset route.",
  "layout.legend.labels": "The project's details: Legend wording.",
  "catalog.highlights.colour":
    "A highlight's look: the highlight editor (Highlights, then New highlight… or the catalog).",
  "catalog.highlights.border":
    "A highlight's look: the highlight editor (Highlights, then New highlight… or the catalog).",
  "catalog.highlights.fill":
    "A highlight's look: the highlight editor (Highlights, then New highlight… or the catalog).",
  "catalog.highlights.chip":
    "A highlight's look: the highlight editor (Highlights, then New highlight… or the catalog)."
};

/**
 * The keys each composite control edits inside its value (an effect, a piece of evidence: per variant), checked
 * against Core's schemas.
 */
export const NESTED = {
  condition: ["guard", "expr", "text"],
  retry: ["maxAttempts", "backoff", "note"],
  backoff: ["initial", "factor", "max"],
  effective: ["from", "until", "note"],
  evidence: { code: ["kind", "path", "lines", "repo", "commit", "symbol"], doc: ["kind", "url", "title", "quote"] },
  tags: ["text", "tone"],
  effects: { action: ["action", "args"], emit: ["emit", "payload"], assign: ["assign"] },
  typeFields: ["name", "type", "required", "list", "description"],
  typeValues: ["value", "description"],
  request: ["method", "url"]
};
