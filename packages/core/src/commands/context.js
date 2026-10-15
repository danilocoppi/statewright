import { current, isDraft } from "immer";
import { CATALOG_COLLECTIONS } from "../constants.js";
import { z } from "zod";
import { idPatternFor, makeId, prefixOf } from "../ids.js";
import { buildIndex } from "../query/build-index.js";
import { createRefCollector } from "../query/refs.js";
import { flattenIssues, toPointer } from "../serialize/parse.js";
import { fail } from "./errors.js";

const ANNOTATION_SECTIONS = [
  ["findings", "finding", "fnd"],
  ["notes", "note", "nte"],
  ["lanes", "lane", "lne"],
  ["scenarios", "scenario", "scn"],
  ["comments", "comment", "cmt"],
  ["locks", "lock", "lck"]
];

/** Where one element made by a command is, from its prefix; undefined when it is not where its prefix says. */
function locateOne(doc, id) {
  const prefix = prefixOf(id);
  const has = (container, key) => container != null && Object.hasOwn(container, key);
  if (prefix === "cnv") return has(doc.canvases, id) ? { id, type: "canvas", path: ["canvases", id] } : undefined;
  if (prefix === "def") {
    return has(doc.definitions, id) ? { id, type: "definition", path: ["definitions", id] } : undefined;
  }
  const part = { rgn: "regions", nod: "nodes", edg: "edges" }[prefix];
  if (part) {
    for (const canvasId of Object.keys(doc.canvases)) {
      if (has(doc.canvases[canvasId][part], id)) {
        return { id, type: part.slice(0, -1), canvas: canvasId, path: ["canvases", canvasId, part, id] };
      }
    }
    return undefined;
  }
  const collection = Object.keys(CATALOG_COLLECTIONS).find(key => CATALOG_COLLECTIONS[key] === prefix);
  if (collection) {
    return has(doc.catalog[collection], id) ?
        { id, type: "catalog", collection, path: ["catalog", collection, id] }
      : undefined;
  }
  const annotation = ANNOTATION_SECTIONS.find(([, , short]) => short === prefix);
  if (annotation && has(doc.annotations?.[annotation[0]], id)) {
    return { id, type: annotation[1], path: ["annotations", annotation[0], id] };
  }
  return undefined;
}

/**
 * The index of a batch's draft (performance spec §3 P1): the index of a plain snapshot of the draft — the parts not
 * changed yet are the frozen document's own, whose entries are kept with them — with each entry's `value` read from the
 * draft at its path when asked for, so commands write through it into the draft. What commands add or remove later in
 * the batch is noted over it (`added`, `removed`) instead of indexing again; `added` answers false when an element is
 * not where its prefix says (then the batch indexes the draft again).
 * @param {any} draft
 */
export function draftIndex(draft) {
  const plain = buildIndex(isDraft(draft) ? current(draft) : draft);
  const extra = new Map();
  const gone = new Set();
  const live = new Map();
  const find = id => (gone.has(id) ? undefined : (extra.get(id) ?? plain.get(id)));
  return {
    get(id) {
      const entry = find(id);
      if (!entry || !isDraft(draft)) return entry;
      let found = live.get(id);
      if (!found) {
        found = Object.defineProperty({ ...entry }, "value", {
          get: () => entry.path.reduce((value, key) => value?.[key], draft),
          enumerable: true
        });
        live.set(id, found);
      }
      return found;
    },
    has: id => find(id) !== undefined,
    duplicates: plain.duplicates,
    /** Forget elements a removal took out (removeElements tells its index). */
    removed(ids) {
      for (const id of ids) {
        gone.add(id);
        extra.delete(id);
        live.delete(id);
      }
    },
    added(ids) {
      for (const id of ids) {
        const entry = locateOne(draft, id);
        if (!entry) return false;
        gone.delete(id);
        live.delete(id);
        extra.set(id, entry);
      }
      return true;
    }
  };
}

/**
 * Per-command view of the document being changed. `doc` is an Immer draft: write to it directly.
 * `index` reflects the document as it was when the command started (the batch's, see draftIndex).
 * @param {any} draft
 * @param {string[]} created Shared list of IDs created by the batch.
 * @param {ReturnType<typeof draftIndex>} [index]
 */
export function createContext(draft, created, index = draftIndex(draft)) {
  const claimed = new Set();
  return {
    doc: draft,
    index,
    taken: { has: id => index.has(id) || claimed.has(id) },
    claim(id) {
      claimed.add(id);
      created.push(id);
    }
  };
}

/**
 * A detached deep copy: of command input (so callers cannot change the document through their own objects)
 * or of a draft value (a plain snapshot that can be edited and validated before it is written back).
 */
export function clone(value) {
  if (value === undefined) return undefined;
  // current() returns the base object itself for an unmodified draft, so it is copied too.
  return structuredClone(isDraft(value) ? current(value) : value);
}

/**
 * The index entry of `id`, checked against the expected element types.
 * @param {ReturnType<typeof createContext>} ctx
 * @param {string} id
 * @param {string[]} [types] e.g. ["node"], ["catalog"]
 */
export function requireEntry(ctx, id, types) {
  const entry = ctx.index.get(id);
  if (!entry) fail("NOT_FOUND", `No element with ID "${id}"`, { id });
  if (types && !types.includes(entry.type)) {
    fail("WRONG_KIND", `"${id}" is a ${entry.type}, expected ${types.join(" or ")}`, { id, type: entry.type });
  }
  return entry;
}

/**
 * Reserve an ID: the caller's `requested` ID when valid and free, otherwise one generated from `base`.
 * @param {ReturnType<typeof createContext>} ctx
 * @param {string} prefix
 * @param {string} base Usually the element name.
 * @param {string} [requested]
 */
export function allocateId(ctx, prefix, base, requested) {
  let id;
  if (requested !== undefined) {
    if (!idPatternFor(prefix).test(requested)) {
      fail("INVALID_ID", `"${requested}" is not a valid ID; expected ${prefix}_ followed by letters or digits`, {
        id: requested
      });
    }
    if (ctx.taken.has(requested)) fail("ID_TAKEN", `The ID "${requested}" is already used`, { id: requested });
    id = requested;
  } else {
    id = makeId(prefix, base, ctx.taken);
  }
  ctx.claim(id);
  return id;
}

/**
 * Apply `{ set, unset }` to a plain copy of an element. `set` replaces whole keys (null stays null, meaning
 * "explicitly empty"); `unset` removes keys (back to "unspecified").
 * @param {object} value Current element (not modified).
 * @param {{ set?: object, unset?: string[] }} change
 * @param {string[]} [locked] Keys that cannot be changed this way.
 * @returns {object} The changed copy.
 */
export function changed(value, { set = {}, unset = [] }, locked = []) {
  const keys = [...Object.keys(set), ...unset];
  const both = Object.keys(set).filter(key => unset.includes(key));
  if (both.length) fail("INVALID_ARGS", `Cannot both set and unset: ${both.join(", ")}`);
  const blocked = keys.filter(key => locked.includes(key));
  if (blocked.length) fail("NOT_ALLOWED", `Cannot change ${blocked.join(", ")} with an update`, { keys: blocked });
  const next = clone(value);
  for (const [key, item] of Object.entries(set)) next[key] = clone(item);
  for (const key of unset) delete next[key];
  return next;
}

/**
 * Validate an element against its schema; on failure throw SCHEMA with errors located in the document.
 * @param {import("zod").ZodType} schema
 * @param {unknown} value
 * @param {Array<string|number>} path Where the element lives (or will live).
 */
export function validate(schema, value, path) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const errors = flattenIssues(result.error.issues, path);
    fail("SCHEMA", `Invalid element at ${toPointer(path)}: ${errors[0].message}`, { errors });
  }
}

/** Fields whose target must live in the same canvas as the element that references it. */
const SAME_CANVAS = new Set(["from", "to", "region", "except", "nodes"]);

/**
 * Check that every reference of an element exists and has an allowed prefix. References to nodes and regions
 * (`from`, `to`, `region`, `except`, lane `nodes`) must stay inside `canvas`. An element may reference itself
 * (`self`), e.g. a recursive type.
 * @param {ReturnType<typeof createContext>} ctx
 * @param {import("../query/refs.js").Ref[]} refs
 * @param {{ canvas?: string, self?: string }} [scope]
 */
export function checkRefs(ctx, refs, { canvas, self } = {}) {
  for (const ref of refs) {
    if (ref.target === self) continue;
    const entry = ctx.index.get(ref.target);
    if (!entry) fail("NOT_FOUND", `${ref.field} references "${ref.target}", which does not exist`, { ref });
    if (ref.expect && !ref.expect.includes(prefixOf(ref.target))) {
      fail("WRONG_KIND", `${ref.field} must reference ${ref.expect.map(p => `${p}_*`).join(" or ")}`, { ref });
    }
    if (canvas && SAME_CANVAS.has(ref.field) && entry.canvas !== canvas) {
      fail("NOT_ALLOWED", `${ref.field} must reference an element of the same canvas (${canvas})`, { ref });
    }
  }
}

/** References held by one element (see createRefCollector). */
export function refsOf(method, ...args) {
  const collect = createRefCollector();
  collect[method](...args);
  return collect.refs;
}

/** Set `object[key]` to an empty object when missing and return it. */
export function ensure(object, key) {
  if (object[key] === undefined) object[key] = {};
  return object[key];
}

/** Drop empty annotation and layout containers so documents stay tidy. */
export function tidy(doc) {
  const annotations = doc.annotations;
  if (annotations) {
    for (const key of ["findings", "notes", "lanes", "scenarios", "comments", "locks"]) {
      if (annotations[key] && Object.keys(annotations[key]).length === 0) delete annotations[key];
    }
    if (Array.isArray(annotations.focus) && annotations.focus.length === 0) delete annotations.focus;
    if (Object.keys(annotations).length === 0) delete doc.annotations;
  }
  const layout = doc.layout;
  if (layout) {
    for (const [canvasId, canvasLayout] of Object.entries(layout.canvases ?? {})) {
      for (const key of ["nodes", "edges", "notes"]) {
        if (canvasLayout[key] && Object.keys(canvasLayout[key]).length === 0) delete canvasLayout[key];
      }
      if (Object.keys(canvasLayout).length === 0) delete layout.canvases[canvasId];
    }
    if (layout.canvases && Object.keys(layout.canvases).length === 0) delete layout.canvases;
    if (layout.legend?.labels && Object.keys(layout.legend.labels).length === 0) delete layout.legend.labels;
    if (layout.legend && Object.keys(layout.legend).length === 0) delete layout.legend;
    if (Object.keys(layout).length === 0) delete doc.layout;
  }
}

/**
 * Write `{ set, unset }` into a draft element key by key (after `changed` + validation), so patches stay small.
 * @param {object} target Draft element.
 * @param {{ set?: object, unset?: string[] }} change
 */
export function applyChange(target, { set = {}, unset = [] }) {
  for (const [key, value] of Object.entries(set)) target[key] = clone(value);
  for (const key of unset) delete target[key];
}

/** Arguments shared by every `*.update` command. */
export const changeArgs = {
  set: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Keys to replace; null stores an explicit null (explicitly empty)."),
  unset: z.array(z.string()).optional().describe("Keys to remove (back to unspecified).")
};

/** Set `doc.layout.canvases[canvasId].nodes[nodeId]`, rounding coordinates to integers. */
export function setNodeLayout(doc, canvasId, nodeId, { x, y, w, h, display }) {
  const entry = { x: Math.round(x), y: Math.round(y) };
  if (w !== undefined) entry.w = Math.round(w);
  if (h !== undefined) entry.h = Math.round(h);
  if (display !== undefined) entry.display = display;
  const canvasLayout = ensure(ensure(ensure(doc, "layout"), "canvases"), canvasId);
  ensure(canvasLayout, "nodes")[nodeId] = entry;
  return entry;
}
