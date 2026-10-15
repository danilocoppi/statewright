import { isDraft } from "immer";
import { CATALOG_COLLECTIONS, PRIMITIVE_TYPES } from "../constants.js";

/**
 * @typedef {object} Ref A reference from one place in the document to an ID.
 * @property {"content"|"annotations"|"layout"} section
 * @property {string|null} source ID of the element holding the reference (null for `root`, `focus` and layout keys).
 * @property {string} field Dotted field name, e.g. "on", "inner.canvas", "guard.guard", "onEntry.action".
 * @property {Array<string|number>} path Location of the referencing value (for layout keys: the entry).
 * @property {string} target The referenced ID.
 * @property {string[]|null} expect Allowed ID prefixes (null = any ID).
 * @property {"unset"|"splice"|"element"} onRemove What a cascading removal of `target` does:
 *   delete the key at `removePath`, splice the array item at `removePath`, or remove the `source` element.
 * @property {Array<string|number>} removePath
 */

const PRIMITIVES = new Set(PRIMITIVE_TYPES);

/**
 * Collects references element by element, so callers can inspect one element (commands) or a whole
 * document (collectRefs). Every method takes the element's ID and value; paths are absolute document paths.
 */
export function createRefCollector() {
  /** @type {Ref[]} */
  const refs = [];
  const push = (section, source, field, path, target, expect, onRemove, removePath = path) => {
    if (typeof target === "string") refs.push({ section, source, field, path, target, expect, onRemove, removePath });
  };
  const one = (source, base, field, value, expect, onRemove = "unset") =>
    push("content", source, field, [...base, ...field.split(".")], value, expect, onRemove);
  const many = (source, base, field, list, expect) =>
    (Array.isArray(list) ? list : []).forEach((value, index) =>
      push("content", source, field, [...base, field, index], value, expect, "splice")
    );
  const typeRef = (source, base, field, value) => {
    if (typeof value === "string" && !PRIMITIVES.has(value)) one(source, base, field, value, ["typ"]);
  };
  // `inner` holds exactly one reference, so losing it removes the whole `inner` (an empty one is invalid).
  const inner = (source, base, value) => {
    if (!value) return;
    const removePath = [...base, "inner"];
    push("content", source, "inner.canvas", [...removePath, "canvas"], value.canvas, ["cnv"], "unset", removePath);
    push(
      "content",
      source,
      "inner.definition",
      [...removePath, "definition"],
      value.definition,
      ["def"],
      "unset",
      removePath
    );
  };
  // A condition needs guard, expr or text: when the guard is all it says, the whole condition goes with it.
  const condition = (source, base, field, value) => {
    if (!value) return;
    const path = [...base, field, "guard"];
    const guardOnly = value.expr === undefined && value.text === undefined;
    push("content", source, `${field}.guard`, path, value.guard, ["grd"], "unset", guardOnly ? [...base, field] : path);
  };
  const effects = (source, base, field, list) =>
    (Array.isArray(list) ? list : []).forEach((effect, index) => {
      const path = [...base, field, index];
      push("content", source, `${field}.action`, [...path, "action"], effect.action, ["act"], "splice", path);
      push("content", source, `${field}.emit`, [...path, "emit"], effect.emit, ["evt"], "splice", path);
    });

  return {
    refs,

    root(id) {
      push("content", null, "root", ["root"], id, ["cnv"], "element");
    },

    /** Catalog item (spec §10). */
    catalogItem(collection, id, item) {
      const base = ["catalog", collection, id];
      switch (collection) {
        case "types":
          (Array.isArray(item.fields) ? item.fields : []).forEach((field, index) => {
            if (typeof field.type === "string" && !PRIMITIVES.has(field.type)) {
              const fieldPath = [...base, "fields", index];
              push("content", id, "fields.type", [...fieldPath, "type"], field.type, ["typ"], "splice", fieldPath);
            }
          });
          typeRef(id, base, "of", item.of);
          break;
        case "events":
          typeRef(id, base, "payload", item.payload);
          if (item.source !== "internal") one(id, base, "source", item.source, ["pty"]);
          break;
        case "actions":
          typeRef(id, base, "input", item.input);
          typeRef(id, base, "output", item.output);
          many(id, base, "emits", item.emits, ["evt"]);
          one(id, base, "party", item.party, ["pty"]);
          inner(id, base, item.inner);
          break;
        case "endpoints":
          typeRef(id, base, "request", item.request);
          for (const [code, type] of Object.entries(item.responses ?? {})) {
            if (typeof type === "string") one(id, base, `responses.${code}`, type, ["typ"]);
          }
          many(id, base, "emits", item.emits, ["evt"]);
          one(id, base, "party", item.party, ["pty"]);
          inner(id, base, item.inner);
          break;
        case "webhooks":
          one(id, base, "party", item.party, ["pty"]);
          typeRef(id, base, "payload", item.payload);
          one(id, base, "event", item.event, ["evt"]);
          inner(id, base, item.inner);
          break;
        default:
          break;
      }
    },

    /** Definition (spec §11). */
    definition(id, definition) {
      one(id, ["definitions", id], "canvas", definition.canvas, ["cnv"], "element");
    },

    /** Canvas-level references only (nodes and edges have their own methods). */
    canvas(id, canvas) {
      const base = ["canvases", id];
      if (canvas.kind === "machine" || canvas.kind === "mixed") one(id, base, "context", canvas.context, ["typ"]);
      if (canvas.kind === "flow" || canvas.kind === "mixed") one(id, base, "vars", canvas.vars, ["typ"]);
    },

    /** Node of a canvas of kind `canvasKind` (spec §12). */
    node(canvasKind, canvasId, id, node) {
      const base = ["canvases", canvasId, "nodes", id];
      inner(id, base, node.inner);
      if (canvasKind === "machine" || canvasKind === "mixed") one(id, base, "region", node.region, ["rgn"]);
      switch (node.kind) {
        case "ref":
          one(id, base, "target", node.target, null, "element");
          break;
        case "actor":
        case "external":
        case "service":
        case "store":
        case "queue":
          one(id, base, "party", node.party, ["pty"]);
          break;
        case "participant":
          one(id, base, "party", node.party, ["pty"], "element");
          break;
        case "steps":
          one(id, base, "action", node.action, ["act", "ept", "whk"], "element");
          break;
        case "entry":
          one(id, base, "via", node.via, ["ept", "whk"]);
          many(id, base, "on", node.on, ["evt"]);
          one(id, base, "by", node.by, ["pty"]);
          condition(id, base, "guard", node.guard);
          break;
        case "state":
          // On a flow, a state is a guest standing for a machine's state (role R4).
          one(id, base, "target", node.target, ["nod"], "element");
          many(id, base, "statuses", node.statuses, ["sts"]);
          effects(id, base, "onEntry", node.onEntry);
          effects(id, base, "onExit", node.onExit);
          one(id, base, "sla", node.sla, ["tmr"]);
          break;
        case "any":
          many(id, base, "except", node.except, ["nod"]);
          break;
        case "action":
          one(id, base, "action", node.action, ["act"], "element");
          break;
        case "if":
        case "while":
          condition(id, base, "condition", node.condition);
          break;
        case "emit":
          one(id, base, "event", node.event, ["evt"], "element");
          break;
        case "wait":
          many(id, base, "on", node.on, ["evt"]);
          one(id, base, "after", node.after, ["tmr"]);
          break;
        case "call":
          one(id, base, "endpoint", node.endpoint, ["ept"]);
          one(id, base, "party", node.party, ["pty"]);
          break;
        case "webhook":
          one(id, base, "webhook", node.webhook, ["whk"], "element");
          break;
        default:
          break;
      }
    },

    /** Edge of a canvas of kind `canvasKind` (spec §12). */
    edge(canvasKind, canvasId, id, edge) {
      const base = ["canvases", canvasId, "edges", id];
      one(id, base, "from", edge.from, ["nod"], "element");
      one(id, base, "to", edge.to, ["nod"], "element");
      many(id, base, "on", edge.on, ["evt"]);
      // On a mixed level, a transition says it is one; any other connection holds a system's references or none.
      const kind =
        canvasKind === "mixed" ?
          edge.kind === "transition" ?
            "machine"
          : "system"
        : canvasKind;
      if (kind === "system") {
        many(id, base, "events", edge.events, ["evt"]);
        one(id, base, "endpoint", edge.endpoint, ["ept"]);
        one(id, base, "webhook", edge.webhook, ["whk"]);
        one(id, base, "by", edge.by, ["pty"]);
      }
      if (kind === "machine") {
        one(id, base, "after", edge.after, ["tmr"]);
        if (edge.done !== true) one(id, base, "done", edge.done, ["rgn"]);
        one(id, base, "via", edge.via, ["ept", "whk"]);
        one(id, base, "by", edge.by, ["pty"]);
        condition(id, base, "guard", edge.guard);
        effects(id, base, "actions", edge.actions);
      }
    },

    /** Annotations (spec §13). */
    finding(id, finding) {
      (Array.isArray(finding.targets) ? finding.targets : []).forEach((target, index) => {
        push("annotations", id, "targets", ["annotations", "findings", id, "targets", index], target, null, "splice");
      });
    },

    note(id, note) {
      const base = ["annotations", "notes", id];
      push("annotations", id, "canvas", [...base, "canvas"], note.canvas, ["cnv"], "element");
      push("annotations", id, "target", [...base, "target"], note.target, null, "element");
    },

    comment(id, comment) {
      const base = ["annotations", "comments", id];
      push("annotations", id, "canvas", [...base, "canvas"], comment.canvas, ["cnv"], "element");
      push("annotations", id, "target", [...base, "target"], comment.target, null, "element");
    },

    lock(id, lock) {
      const base = ["annotations", "locks", id];
      push("annotations", id, "target", [...base, "target"], lock.target, ["nod", "edg", "rgn", "cnv"], "element");
    },

    focus(list) {
      (Array.isArray(list) ? list : []).forEach((target, index) =>
        push("annotations", null, "focus", ["annotations", "focus", index], target, ["nod", "edg"], "splice")
      );
    },

    lane(id, lane) {
      const base = ["annotations", "lanes", id];
      push("annotations", id, "canvas", [...base, "canvas"], lane.canvas, ["cnv"], "element");
      (Array.isArray(lane.nodes) ? lane.nodes : []).forEach((target, index) =>
        push("annotations", id, "nodes", [...base, "nodes", index], target, ["nod"], "splice")
      );
      push("annotations", id, "party", [...base, "party"], lane.party, ["pty"], "unset");
    },

    /**
     * A scenario (simulator spec §4.5): its canvas (the scenario goes with it), its start's entry (forgotten when it
     * goes) and each step's event or call (the step goes with it). Recorded paths are not references.
     */
    scenario(id, scenario) {
      const base = ["annotations", "scenarios", id];
      push("annotations", id, "canvas", [...base, "canvas"], scenario.canvas, ["cnv"], "element");
      push("annotations", id, "start.entry", [...base, "start", "entry"], scenario.start?.entry, ["nod"], "unset");
      (Array.isArray(scenario.steps) ? scenario.steps : []).forEach((item, index) => {
        const path = [...base, "steps", index];
        push("annotations", id, "steps.do.event", [...path, "do", "event"], item?.do?.event, ["evt"], "splice", path);
        push(
          "annotations",
          id,
          "steps.do.call",
          [...path, "do", "call"],
          item?.do?.call,
          ["ept", "whk"],
          "splice",
          path
        );
      });
    },

    /** Layout keys of one canvas (spec §14). */
    layoutCanvas(canvasId, canvasLayout) {
      const base = ["layout", "canvases", canvasId];
      push("layout", null, "canvas", base, canvasId, ["cnv"], "unset");
      for (const [section, prefix] of [
        ["nodes", "nod"],
        ["edges", "edg"],
        ["notes", "nte"]
      ]) {
        for (const id of Object.keys(canvasLayout[section] ?? {})) {
          push("layout", null, section, [...base, section, id], id, [prefix], "unset");
        }
      }
    }
  };
}

/**
 * Every reference in a document. Pure; ignores values that are not strings (schema validation reports those).
 * @param {any} doc A valid document.
 * @returns {Ref[]}
 */
export function collectRefs(doc) {
  const frozen = Object.isFrozen(doc) && !isDraft(doc);
  if (frozen && keptRefs.has(doc)) return keptRefs.get(doc);
  const refs = refsOf(doc);
  if (frozen) keptRefs.set(doc, Object.freeze(refs));
  return refs;
}

/** References of frozen documents (what applyBatch returns), kept with them. */
const keptRefs = new WeakMap();

function refsOf(doc) {
  const refs = [];
  for (const piece of refPieces(doc)) for (const ref of piece) refs.push(ref);
  return refs;
}

/**
 * A document's references in pieces, in document order: the project's own (root, catalog, definitions), each canvas's,
 * the annotations', each canvas layout's. The pieces of frozen canvases and layouts are kept with them.
 */
function refPieces(doc) {
  const head = createRefCollector();
  head.root(doc.root);
  for (const collection of Object.keys(CATALOG_COLLECTIONS)) {
    for (const [id, item] of Object.entries(doc.catalog[collection] ?? {})) head.catalogItem(collection, id, item);
  }
  for (const [id, definition] of Object.entries(doc.definitions)) head.definition(id, definition);
  const canvases = Object.entries(doc.canvases).map(([canvasId, canvas]) => canvasRefs(canvasId, canvas));
  const tail = createRefCollector();
  const annotations = doc.annotations ?? {};
  for (const [id, finding] of Object.entries(annotations.findings ?? {})) tail.finding(id, finding);
  for (const [id, note] of Object.entries(annotations.notes ?? {})) tail.note(id, note);
  tail.focus(annotations.focus);
  for (const [id, lane] of Object.entries(annotations.lanes ?? {})) tail.lane(id, lane);
  for (const [id, scenario] of Object.entries(annotations.scenarios ?? {})) tail.scenario(id, scenario);
  for (const [id, comment] of Object.entries(annotations.comments ?? {})) tail.comment(id, comment);
  for (const [id, lock] of Object.entries(annotations.locks ?? {})) tail.lock(id, lock);
  const layouts = Object.entries(doc.layout?.canvases ?? {}).map(([canvasId, canvasLayout]) =>
    kept(canvasId, canvasLayout, each => each.layoutCanvas(canvasId, canvasLayout))
  );
  return [head.refs, ...canvases, tail.refs, ...layouts];
}

/** References grouped by target, kept with each kept piece. */
const keptGroups = new WeakMap();

function grouped(piece) {
  let groups = keptGroups.get(piece);
  if (groups) return groups;
  groups = new Map();
  for (const ref of piece) {
    if (!groups.has(ref.target)) groups.set(ref.target, []);
    groups.get(ref.target).push(ref);
  }
  if (Object.isFrozen(piece)) keptGroups.set(piece, groups);
  return groups;
}

/**
 * The references to each element, in document order, as `get(target)` (performance spec §3 P1): what removing an
 * element asks, without walking every reference of the document again after each edit.
 * @param {any} doc
 * @returns {{ get(target: string): Ref[] }}
 */
export function referencesTo(doc) {
  const groups = refPieces(doc).map(grouped);
  return {
    get(target) {
      const found = [];
      for (const group of groups) for (const ref of group.get(target) ?? []) found.push(ref);
      return found;
    }
  };
}

/** References of parts that cannot change (frozen), kept with each part: an edit recollects only what it touched. */
const keptParts = new WeakMap();

/** The references `collect` finds in `part`, stored under `id`; kept while the part is frozen. */
function kept(id, part, collect) {
  const frozen = Object.isFrozen(part) && !isDraft(part);
  const known = frozen ? keptParts.get(part) : undefined;
  if (known?.id === id) return known.refs;
  const each = createRefCollector();
  collect(each);
  if (frozen) keptParts.set(part, { id, refs: Object.freeze(each.refs) });
  return each.refs;
}

/** A canvas's references: the canvas itself, its nodes and its edges. */
const canvasRefs = (canvasId, canvas) =>
  kept(canvasId, canvas, each => {
    each.canvas(canvasId, canvas);
    for (const [id, node] of Object.entries(canvas.nodes)) each.node(canvas.kind, canvasId, id, node);
    for (const [id, edge] of Object.entries(canvas.edges)) each.edge(canvas.kind, canvasId, id, edge);
  });
