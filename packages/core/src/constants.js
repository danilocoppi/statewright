/** Format version written by this package (`"MAJOR.MINOR"`). */
export const FORMAT_VERSION = "1.4";

/** Name stamped into `generator.name`. */
export const GENERATOR_NAME = "statewright";

/** Where the Editor is published (AI interface spec §6: "the published one"). */
export const EDITOR_ORIGIN = "https://statewright.cpss.com.br";

/** Must match `version` in package.json (a test enforces it). */
export const PACKAGE_VERSION = "0.3.3";

/** ID prefix for every element type (spec §8.2). */
export const ID_PREFIXES = Object.freeze({
  project: "prj",
  canvas: "cnv",
  node: "nod",
  edge: "edg",
  region: "rgn",
  definition: "def",
  type: "typ",
  event: "evt",
  action: "act",
  guard: "grd",
  endpoint: "ept",
  webhook: "whk",
  timer: "tmr",
  status: "sts",
  party: "pty",
  highlight: "hlt",
  finding: "fnd",
  note: "nte",
  lane: "lne",
  scenario: "scn",
  comment: "cmt",
  lock: "lck"
});

/** Catalog collection name → ID prefix of its items. Order is the serialization order. */
export const CATALOG_COLLECTIONS = Object.freeze({
  types: "typ",
  events: "evt",
  actions: "act",
  guards: "grd",
  endpoints: "ept",
  webhooks: "whk",
  timers: "tmr",
  statuses: "sts",
  parties: "pty",
  highlights: "hlt"
});

/** The colours a highlight takes by name (highlights spec §3); a highlight may also take a `#RRGGBB`. */
export const HIGHLIGHT_PALETTE = Object.freeze([
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "indigo",
  "violet",
  "pink",
  "grey"
]);

/** Built-in field types (spec §10.1). Anything else in a type position is a `typ_*` ID. */
export const PRIMITIVE_TYPES = Object.freeze([
  "string",
  "integer",
  "number",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "duration",
  "uuid",
  "email",
  "url",
  "json"
]);
