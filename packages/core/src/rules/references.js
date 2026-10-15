import { allowedInteriors } from "../commands/inner.js";
import { CATALOG_COLLECTIONS } from "../constants.js";
import { toPointer } from "../serialize/parse.js";
import { sorted } from "./facts.js";

/** Reference fields whose target must be on the same canvas as the element holding them. */
const SAME_CANVAS = new Set(["from", "to", "region", "except"]);

/** What a `ref` node may point to (spec §12.1). */
const REF_TARGETS = new Set(["canvas", "node", "definition", "catalog"]);

/** The element a reference problem is reported on, and its canvas. */
function holder(facts, ref) {
  if (ref.source) return { target: ref.source, canvas: facts.canvasOf(ref.source) };
  const canvasId = ref.path[2];
  if (ref.section === "layout" && ref.field !== "canvas" && facts.index.has(canvasId)) {
    return { target: canvasId, canvas: canvasId };
  }
  return { target: facts.doc.project.id, canvas: undefined };
}

/** Where a reference sits, for messages. */
function origin(facts, ref) {
  if (ref.source) return `${facts.describe(ref.source)}: ${ref.field}`;
  if (ref.section === "layout") return ref.field === "canvas" ? "The layout" : `The layout of ${ref.path[2]}`;
  return ref.field === "root" ? "The document root" : "The focus list";
}

/** Reference rules (spec §22). */
export default [
  {
    code: "ref.dangling",
    severity: "error",
    description: "A reference points to a missing ID.",
    check(facts, report) {
      for (const ref of facts.refs) {
        if (facts.index.has(ref.target)) continue;
        report({
          ...holder(facts, ref),
          message: `${origin(facts, ref)} points to "${ref.target}", which does not exist`,
          data: { field: ref.field, missing: ref.target, path: toPointer(ref.path) }
        });
      }
    }
  },
  {
    code: "ref.kind",
    severity: "error",
    description:
      "A reference points to the wrong kind of element: an end, region or lane node on another canvas, an " +
      "interior of a kind the element cannot hold, a definition body of another kind, …",
    check(facts, report) {
      const { doc, index } = facts;
      const wrong = (ref, why) =>
        report({
          ...holder(facts, ref),
          message: `${origin(facts, ref)} points to ${facts.describe(ref.target)}, ${why}`,
          data: { field: ref.field, target: ref.target, path: toPointer(ref.path) }
        });

      for (const ref of facts.refs) {
        const target = index.get(ref.target);
        // Duplicated IDs resolve ambiguously; id.duplicate reports them.
        if (!target || facts.duplicates.has(ref.target) || facts.duplicates.has(ref.source)) continue;
        const source = ref.source ? index.get(ref.source) : undefined;
        if (ref.section === "content" && SAME_CANVAS.has(ref.field)) {
          if (source?.canvas !== undefined && target.canvas !== source.canvas) wrong(ref, "which is on another canvas");
        } else if (ref.section === "content" && ref.field === "target") {
          if (!REF_TARGETS.has(target.type)) {
            wrong(ref, "but ref nodes point to canvases, nodes, definitions or catalog items");
          }
        } else if (source?.type === "lane" && ref.field === "nodes") {
          if (target.canvas !== source.value.canvas) wrong(ref, "which is not on the lane's canvas");
        } else if (source?.type === "note" && ref.field === "target") {
          if (!["node", "edge"].includes(target.type) || target.canvas !== source.value.canvas) {
            wrong(ref, "but a note targets a node or edge of its own canvas");
          }
        } else if (ref.section === "layout" && ref.field !== "canvas") {
          const on = ref.field === "notes" ? target.value.canvas : target.canvas;
          if (on !== ref.path[2]) wrong(ref, "which is not on that canvas");
        } else if (ref.field === "done") {
          // The region must belong to the source state's interior or to the transition's own canvas (§12.3).
          const from = doc.canvases[source.canvas].nodes[source.value.from];
          const allowed = [source.canvas, facts.interiorOf(from?.inner)];
          if (!allowed.includes(target.canvas)) {
            wrong(ref, "which belongs neither to this canvas nor to the source state's interior");
          }
        } else if (ref.field === "webhook" && source?.type === "node") {
          if (target.value.direction !== "out")
            wrong(ref, 'but webhook steps send outbound webhooks (direction "out")');
        }
      }

      // Interiors (§9.8) and definition bodies (§11).
      for (const entry of index.entries.values()) {
        const interior = facts.interiorOf(entry.value.inner);
        const kind = doc.canvases[interior]?.kind;
        if (!kind) continue;
        const allowed = allowedInteriors(doc, entry) ?? [];
        if (allowed.includes(kind)) continue;
        report({
          target: entry.id,
          canvas: facts.canvasOf(entry.id),
          message:
            `${facts.describe(entry.id)} cannot contain a ${kind} canvas` +
            (allowed.length ? ` (allowed: ${allowed.join(", ")})` : ""),
          data: { interior, kind, allowed }
        });
      }
      for (const [id, definition] of sorted(doc.definitions)) {
        const body = doc.canvases[definition.canvas];
        if (!body || body.kind === definition.kind) continue;
        report({
          target: id,
          message: `${facts.describe(id)} is a ${definition.kind} definition but its body ${definition.canvas} is a ${body.kind} canvas`,
          data: { canvas: definition.canvas, kind: body.kind }
        });
      }
    }
  },
  {
    code: "id.duplicate",
    severity: "error",
    description: "The same ID is used twice in the document.",
    check(facts, report) {
      const { doc } = facts;
      const places = new Map();
      const add = (id, path) => {
        if (!places.has(id)) places.set(id, []);
        places.get(id).push(toPointer(path));
      };
      add(doc.project.id, ["project", "id"]);
      for (const collection of Object.keys(CATALOG_COLLECTIONS)) {
        for (const id of Object.keys(doc.catalog[collection])) add(id, ["catalog", collection, id]);
      }
      for (const id of Object.keys(doc.definitions)) add(id, ["definitions", id]);
      for (const [canvasId, canvas] of Object.entries(doc.canvases)) {
        add(canvasId, ["canvases", canvasId]);
        for (const section of ["regions", "nodes", "edges"]) {
          for (const id of Object.keys(canvas[section] ?? {})) add(id, ["canvases", canvasId, section, id]);
        }
      }
      for (const section of ["findings", "notes", "lanes"]) {
        for (const id of Object.keys(doc.annotations?.[section] ?? {})) add(id, ["annotations", section, id]);
      }
      for (const [id, paths] of places) {
        if (paths.length < 2) continue;
        report({
          target: id,
          message: `The ID "${id}" is used by ${paths.length} elements; IDs must be unique across the document`,
          data: { paths: paths.sort() }
        });
      }
    }
  }
];
