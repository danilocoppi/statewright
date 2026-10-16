import { z } from "zod";
import { inputSchemaOf, toolNameOf } from "../agent/contract.js";
import { OPERATIONS } from "../agent/operations.js";
import { listCommands } from "../commands/engine.js";
import { ID_PATTERN } from "../ids.js";
import { listRules } from "../rules/index.js";
import { Annotations, Finding, Lane, Note } from "../schema/annotations.js";
import { Condition, Effect, Effective, Evidence, Inner, RetryPolicy, Tag, common } from "../schema/blocks.js";
import {
  Canvas,
  FlowEdge,
  FlowNode,
  MachineEdge,
  MachineNode,
  RegionDef,
  SystemEdge,
  SystemNode
} from "../schema/canvas.js";
import {
  ActionDef,
  Catalog,
  EndpointDef,
  EventDef,
  GuardDef,
  HighlightDef,
  PartyDef,
  StatusDef,
  TimerDef,
  TypeDef,
  WebhookDef
} from "../schema/catalog.js";
import { Definition, Generator, Project, Signature, documentSchema } from "../schema/document.js";
import { DateOrDateTime, Duration, EVENT_GLOB_PATTERN, EVENT_NAME_PATTERN, SignedDuration } from "../schema/helpers.js";
import { EdgeLayout, Layout, LegendLabels, NodeLayout, NoteLayout } from "../schema/layout.js";
import { EDGE_STYLES, NODE_STYLES } from "../style/palette.js";

const WRAPPERS = new Set(["optional", "default", "readonly"]);
const COMMON_KEYS = Object.keys(common);
const unwrap = schema => (WRAPPERS.has(schema.def.type) ? unwrap(schema.def.innerType) : schema);

/** The per-canvas part of Layout (not exported by the schema module). */
const CanvasLayout = unwrap(Layout.def.shape.canvases).def.valueType;

/** Schemas shown by name in field types; each has its own section below. */
const NAMES = new Map([
  [Project, "Project"],
  [Generator, "Generator"],
  [Signature, "Signature"],
  [Catalog, "Catalog"],
  [TypeDef, "Type"],
  [EventDef, "Event"],
  [ActionDef, "Action"],
  [GuardDef, "Guard"],
  [EndpointDef, "Endpoint"],
  [WebhookDef, "Webhook"],
  [TimerDef, "Timer"],
  [StatusDef, "Status"],
  [PartyDef, "Party"],
  [HighlightDef, "Highlight"],
  [Definition, "Definition"],
  [Canvas, "Canvas"],
  [RegionDef, "Region"],
  [SystemNode, "System node"],
  [SystemEdge, "System edge"],
  [MachineNode, "Machine node"],
  [MachineEdge, "Machine edge"],
  [FlowNode, "Flow node"],
  [FlowEdge, "Flow edge"],
  [Condition, "Condition"],
  [Effect, "Effect"],
  [Evidence, "Evidence"],
  [Tag, "Tag"],
  [Inner, "Inner"],
  [RetryPolicy, "RetryPolicy"],
  [Effective, "Effective"],
  [Annotations, "Annotations"],
  [Finding, "Finding"],
  [Note, "Note"],
  [Lane, "Lane"],
  [Layout, "Layout"],
  [CanvasLayout, "Canvas layout"],
  [NodeLayout, "Node layout"],
  [EdgeLayout, "Edge layout"],
  [NoteLayout, "Note layout"],
  [LegendLabels, "map style key → string"],
  [Duration, "duration (ISO 8601, e.g. PT30M)"],
  [SignedDuration, "signed duration (e.g. -P7D)"],
  [DateOrDateTime, "date or date-time (ISO 8601)"]
]);

/** What the other patterned strings of the format look like. */
const PATTERN_NAMES = new Map([
  [EVENT_GLOB_PATTERN.source, "event-name glob (leg.*)"],
  ["^context\\.[A-Za-z0-9_.]+$", "context path (context.expiresAt)"],
  ["^(vars|context)\\.[A-Za-z0-9_.]+$", "vars or context path (vars.total)"],
  ["^[1-5](\\d\\d|XX)$", "status code (201, 4XX)"],
  ["^\\d+(-\\d+)?$", "line or range (34-52)"],
  ["^[A-Za-z0-9.-]+$", "short code (P01)"],
  ["^[A-Za-z_][A-Za-z0-9_]*$", "identifier"],
  ["^\\/", "path (/payments/{id})"],
  ["^[0-9a-f]{64}$", "SHA-256 (lowercase hex)"]
]);

/** ID prefixes accepted by a string pattern, or null when it is not an ID pattern. */
function idPrefixes(pattern) {
  const match = /^\^\(([a-z|]+)\)_\[A-Za-z0-9\]\+\$$/.exec(pattern?.source ?? "");
  return match ? match[1].split("|") : null;
}

/** Compact type expression of a schema, e.g. `evt_*[]`, `"in" | "out"`, `map nod_* → Machine node`. */
function typeOf(schema) {
  if (NAMES.has(schema)) return NAMES.get(schema);
  const def = schema.def;
  switch (def.type) {
    case "optional":
    case "default":
    case "readonly":
      return typeOf(def.innerType);
    case "nullable":
      return `${typeOf(def.innerType)} | null`;
    case "string": {
      const pattern = def.checks?.map(check => check._zod.def).find(check => check.format === "regex")?.pattern;
      if (pattern?.source === ID_PATTERN.source) return "any ID";
      if (pattern?.source === EVENT_NAME_PATTERN.source) return "event name (payin.confirmed)";
      const prefixes = idPrefixes(pattern);
      if (prefixes) return prefixes.map(prefix => `${prefix}_*`).join(" | ");
      return PATTERN_NAMES.get(pattern?.source) ?? "string";
    }
    case "number":
      return def.format === "safeint" ? "integer" : "number";
    case "boolean":
      return "boolean";
    case "literal":
      return def.values.map(value => JSON.stringify(value)).join(" | ");
    case "enum":
      return Object.values(def.entries)
        .map(value => JSON.stringify(value))
        .join(" | ");
    case "array": {
      const element = typeOf(def.element);
      return element.includes(" | ") ? `(${element})[]` : `${element}[]`;
    }
    case "tuple":
      return `[${def.items.map(typeOf).join(", ")}]`;
    case "record":
      return `map ${typeOf(def.keyType)} → ${typeOf(def.valueType)}`;
    case "object":
      return `{ ${fieldsOf(schema)
        .map(([key, field]) => fieldName(key, field))
        .join(", ")} }`;
    case "union":
      return def.options.map(typeOf).join(" | ");
    case "lazy":
      return "JSON";
    default:
      return def.type;
  }
}

/** Own fields of an object schema (the common fields are documented once). */
function fieldsOf(schema) {
  const shape = unwrap(schema).def.shape;
  const hasCommon = COMMON_KEYS.every(key => key in shape);
  return Object.entries(shape).filter(([key]) => !(hasCommon && COMMON_KEYS.includes(key)));
}

const isOptional = field => field.def.type === "optional";
const fieldName = (key, field) => (isOptional(field) ? `${key}?` : key);
const cell = text => text.replaceAll("|", "\\|").replaceAll("\n", " ");
const descriptionOf = schema =>
  z.globalRegistry.get(schema)?.description ?? z.globalRegistry.get(unwrap(schema))?.description;

/** A field's own note; named types are described in their own section. */
const noteOf = field =>
  z.globalRegistry.get(field)?.description ??
  (NAMES.has(unwrap(field)) ? undefined : z.globalRegistry.get(unwrap(field))?.description);

/** A field table for one object schema (with a Notes column when any field has a note). */
function table(schema) {
  const shape = unwrap(schema).def.shape;
  const fields = fieldsOf(schema).map(([key, field]) => [fieldName(key, field), typeOf(field), noteOf(field)]);
  const notes = fields.some(([, , note]) => note);
  const rows = fields.map(
    ([name, type, note]) => `| \`${name}\` | ${cell(type)} |${notes ? ` ${cell(note ?? "")} |` : ""}`
  );
  const lines = [
    notes ? "| Field | Type | Notes |" : "| Field | Type |",
    notes ? "| --- | --- | --- |" : "| --- | --- |",
    ...rows
  ];
  if (COMMON_KEYS.every(key => key in shape)) lines.push("", "Also accepts the [common fields](#common-fields).");
  return lines.join("\n");
}

/** Title of one form of a union: its `kind`, "transition" for the machine edge without kind, or its first key. */
function formTitle(option) {
  const shape = unwrap(option).def.shape;
  const kind = shape.kind && unwrap(shape.kind);
  if (kind?.def.type === "literal") return `\`${kind.def.values[0]}\``;
  return "from" in shape ? "transition" : `\`${Object.keys(shape)[0]}\` form`;
}

/** A section: heading, description and a table per form. */
function section(level, title, schema) {
  const target = unwrap(schema);
  const out = [`${"#".repeat(level)} ${title}`, ""];
  const description = descriptionOf(schema);
  if (description) out.push(description, "");
  if (target.def.type === "union") {
    for (const option of target.def.options) {
      out.push(`${"#".repeat(level + 1)} ${title}: ${formTitle(option)}`, "");
      const optionDescription = descriptionOf(option);
      if (optionDescription && optionDescription !== description) out.push(optionDescription, "");
      out.push(table(option), "");
    }
  } else {
    out.push(table(target), "");
  }
  return out.join("\n");
}

/**
 * The format reference (spec §23 section 4), generated from the zod schemas so it never drifts.
 * @param {{ level?: number }} [options] Heading level of the sections (default 3).
 * @returns {string} Markdown.
 */
export function formatReference({ level = 3 } = {}) {
  const sub = level + 1;
  const parts = [
    "Field names ending in `?` are optional. `x-` keys are accepted on every object. Types: `evt_*` is an event ID, " +
      "`map nod_* → Machine node` is an object keyed by node IDs, `JSON` is any JSON value (JSON Logic where " +
      "the field holds an expression).",
    "",
    section(level, "Document", documentSchema),
    section(level, "Project", Project),
    section(level, "Catalog", Catalog),
    ...[
      ["Type", TypeDef],
      ["Event", EventDef],
      ["Action", ActionDef],
      ["Guard", GuardDef],
      ["Endpoint", EndpointDef],
      ["Webhook", WebhookDef],
      ["Timer", TimerDef],
      ["Status", StatusDef],
      ["Party", PartyDef],
      ["Highlight", HighlightDef]
    ].map(([title, schema]) => section(sub, title, schema)),
    section(level, "Definition", Definition),
    section(level, "Canvas", Canvas),
    section(sub, "Region", RegionDef),
    section(level, "System node", SystemNode),
    section(level, "System edge", SystemEdge),
    section(level, "Machine node", MachineNode),
    section(level, "Machine edge", MachineEdge),
    section(level, "Flow node", FlowNode),
    section(level, "Flow edge", FlowEdge),
    `${"#".repeat(level)} Common fields`,
    "",
    "Every catalog item, definition, canvas, node and edge also accepts these fields.",
    "",
    ["| Field | Type | Notes |", "| --- | --- | --- |"]
      .concat(
        COMMON_KEYS.map(key => `| \`${key}?\` | ${cell(typeOf(common[key]))} | ${cell(noteOf(common[key]) ?? "")} |`)
      )
      .join("\n"),
    "",
    ...[
      ["Condition", Condition],
      ["Effect", Effect],
      ["Evidence", Evidence],
      ["Tag", Tag],
      ["Inner", Inner],
      ["RetryPolicy", RetryPolicy],
      ["Effective", Effective]
    ].map(([title, schema]) => section(level, title, schema)),
    section(level, "Annotations", Annotations),
    ...[
      ["Finding", Finding],
      ["Note", Note],
      ["Lane", Lane]
    ].map(([title, schema]) => section(sub, title, schema)),
    section(level, "Layout", Layout),
    ...[
      ["Canvas layout", CanvasLayout],
      ["Node layout", NodeLayout],
      ["Edge layout", EdgeLayout],
      ["Note layout", NoteLayout]
    ].map(([title, schema]) => section(sub, title, schema)),
    section(level, "Generator", Generator),
    section(level, "Signature", Signature)
  ];
  return parts.join("\n").trimEnd();
}

/**
 * The command list (spec §23 section 5), generated from listCommands().
 * @returns {string} Markdown table.
 */
export function commandsReference() {
  const rows = listCommands().map(command => {
    const required = new Set(command.args.required ?? []);
    const args = Object.keys(command.args.properties ?? {}).map(
      name => `\`${required.has(name) ? name : `${name}?`}\``
    );
    if (command.args.additionalProperties !== false) args.push("…");
    return `| \`${command.type}\` | ${args.join(", ")} | ${cell(command.description)} |`;
  });
  return ["| Command | Arguments | What it does |", "| --- | --- | --- |", ...rows].join("\n");
}

/**
 * The agent contract's operations (AI interface spec §12: "the catalogue of operations (generated from the contract)"):
 * each with the MCP tool that publishes it, its arguments, what it does and where it runs.
 * @returns {string} Markdown table.
 */
export function operationsReference() {
  const rows = OPERATIONS.map(operation => {
    const schema = inputSchemaOf(operation.name);
    const required = new Set(schema.required ?? []);
    const args = Object.keys(schema.properties ?? {}).map(name => `\`${required.has(name) ? name : `${name}?`}\``);
    const where = operation.needs === "editor" ? "the Editor" : "a file or the Editor";
    return `| \`${operation.name}\` | \`${toolNameOf(operation.name)}\` | ${args.join(", ")} | ${cell(operation.summary)} | ${where} |`;
  });
  return [
    "| Operation | MCP tool | Arguments | What it does | Runs on |",
    "| --- | --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

/**
 * The rule list (spec §22), generated from listRules().
 * @returns {string} Markdown table.
 */
export function rulesReference() {
  const rows = listRules().map(rule => `| \`${rule.code}\` | ${rule.severity} | ${cell(rule.description)} |`);
  return ["| Code | Severity | Reported when |", "| --- | --- | --- |", ...rows].join("\n");
}

/** Fill, stroke and dash of a style, for the legend table. */
const look = style =>
  [
    `fill ${style.fill}`,
    `stroke ${style.stroke}`,
    style.dash ? `dashed ${style.dash}` : null,
    style.chip ? `chip ${style.chip}` : null
  ]
    .filter(Boolean)
    .join(", ");

/**
 * The visual legend (spec §15), generated from the style palette: every node and edge style with its look and its
 * default legend wording.
 * @returns {string} Markdown tables.
 */
export function legendReference() {
  const nodes = Object.entries(NODE_STYLES).map(([key, style]) => `| \`${key}\` | ${look(style)} | ${style.label} |`);
  const edges = Object.entries(EDGE_STYLES).map(
    ([key, style]) =>
      `| \`${key}\` | ${[`stroke ${style.stroke}`, `width ${style.width}`, style.dash ? `dashed ${style.dash}` : "solid"].join(", ")} | ${style.label} |`
  );
  return [
    "| Node style | Look | Legend says |",
    "| --- | --- | --- |",
    ...nodes,
    "",
    "| Edge style | Look | Legend says |",
    "| --- | --- | --- |",
    ...edges
  ].join("\n");
}
